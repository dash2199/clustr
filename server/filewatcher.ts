import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createPatch } from 'diff';
import type { Server as SocketServer } from 'socket.io';
import db from './db.js';

const execFileAsync = promisify(execFile);

let io: SocketServer | null = null;
let watcher: FSWatcher | null = null;
let defaultBranch: string | null = null;

db.prepare(`
  CREATE TABLE IF NOT EXISTS file_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL,
    diff_text TEXT,
    agent_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`).run();

try { db.prepare('ALTER TABLE file_changes ADD COLUMN agent_id TEXT').run(); } catch { /* already exists */ }

const stmtInsertChange = db.prepare(
  'INSERT INTO file_changes (file_path, change_type, diff_text, agent_id) VALUES (?, ?, ?, ?)'
);

const stmtFindAgentByPath = db.prepare(
  `SELECT id FROM agents WHERE agent_cwd IS NOT NULL AND status = 'running' ORDER BY length(agent_cwd) DESC`
);
const stmtGetChanges = db.prepare(
  'SELECT * FROM file_changes ORDER BY created_at DESC LIMIT ?'
);
const stmtClearChanges = db.prepare('DELETE FROM file_changes');

async function detectDefaultBranch(cwd: string): Promise<string> {
  for (const branch of ['master', 'main']) {
    try {
      await execFileAsync('git', ['rev-parse', '--verify', branch], { cwd });
      return branch;
    } catch { /* try next */ }
  }
  return 'master';
}

async function getGitBaseContent(cwd: string, relativePath: string, branch: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['show', `${branch}:${relativePath}`], {
      cwd,
      maxBuffer: 5 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return '';
  }
}

export function initFileWatcher(socketIo: SocketServer) {
  io = socketIo;
}

export function startWatching(cwd: string) {
  stopWatching();
  defaultBranch = null;

  detectDefaultBranch(cwd).then((branch) => {
    defaultBranch = branch;
  }).catch(() => {
    defaultBranch = 'master';
  });

  watcher = chokidar.watch(cwd, {
    ignored: (filePath: string) => {
      const rel = path.relative(cwd, filePath);
      const parts = rel.split(path.sep);
      return parts.includes('.git')
        || parts.includes('node_modules')
        || parts.includes('dist')
        || parts.includes('.next')
        || parts.includes('__pycache__')
        || parts.includes('logs')
        || parts.includes('log')
        || parts.includes('.cache')
        || parts.includes('.tmp')
        || parts.includes('target')
        || parts.includes('build')
        || parts.includes('coverage')
        || rel.endsWith('.pyc')
        || rel.endsWith('.log')
        || rel === 'package-lock.json'
        || rel === 'yarn.lock'
        || rel === 'pnpm-lock.yaml';
    },
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('add', (filePath: string) => handleChange(filePath, 'add', cwd));
  watcher.on('change', (filePath: string) => handleChange(filePath, 'change', cwd));
  watcher.on('unlink', (filePath: string) => handleChange(filePath, 'unlink', cwd));
}

export function stopWatching() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

async function handleChange(absolutePath: string, changeType: string, cwd: string) {
  const relativePath = path.relative(cwd, absolutePath);
  const branch = defaultBranch || 'master';
  let diffText: string | null = null;

  try {
    const baseContent = await getGitBaseContent(cwd, relativePath, branch);

    if (changeType === 'unlink') {
      if (baseContent) {
        diffText = createPatch(relativePath, baseContent, '', branch, 'deleted');
      }
    } else {
      const currentContent = fs.readFileSync(absolutePath, 'utf-8');
      if (baseContent !== currentContent) {
        diffText = createPatch(relativePath, baseContent, currentContent, branch, 'working');
      }
    }
  } catch {
    return;
  }

  if (!diffText) return;

  let agentId: string | null = null;
  const runningAgents = stmtFindAgentByPath.all() as { id: string }[];
  for (const a of runningAgents) {
    const agent = db.prepare('SELECT agent_cwd FROM agents WHERE id = ?').get(a.id) as { agent_cwd: string } | undefined;
    if (agent?.agent_cwd && absolutePath.startsWith(agent.agent_cwd)) {
      agentId = a.id;
      break;
    }
  }

  const info = stmtInsertChange.run(relativePath, changeType, diffText, agentId);

  const change = {
    id: info.lastInsertRowid,
    file_path: relativePath,
    change_type: changeType,
    diff_text: diffText,
    agent_id: agentId,
    created_at: new Date().toISOString(),
  };

  io?.emit('file:changed', change);
}

export function getFileChanges(limit = 50) {
  return stmtGetChanges.all(limit) as Record<string, unknown>[];
}

export function clearFileChanges() {
  stmtClearChanges.run();
}
