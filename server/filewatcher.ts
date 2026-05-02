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
const watchers: Map<string, FSWatcher> = new Map();
const defaultBranches: Map<string, string> = new Map();

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

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'target',
  'coverage',
  '.coverage',
  '.cache',
  '.tmp',
  '.temp',
  'tmp',
  'temp',
  'logs',
  'log',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.tox',
  '.venv',
  'venv',
  'env',
  '.gradle',
  '.idea',
  '.vscode',
  '.terraform',
  '.vercel',
  '.turbo',
  '.parcel-cache',
  '.yarn',
  '.pnpm-store',
  'vendor',
  'bower_components',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.DS_Store',
  'Thumbs.db',
]);

const IGNORED_EXTENSIONS = new Set([
  '.pyc',
  '.log',
  '.swp',
  '.swo',
]);

function shouldIgnore(cwd: string, filePath: string): boolean {
  const rel = path.relative(cwd, filePath);
  if (rel.startsWith('..')) return true;
  const parts = rel.split(path.sep);
  for (const part of parts) {
    if (IGNORED_DIRS.has(part)) return true;
  }
  const base = path.basename(rel);
  if (IGNORED_FILES.has(base)) return true;
  const ext = path.extname(base);
  if (IGNORED_EXTENSIONS.has(ext)) return true;
  return false;
}

export function startWatching(cwd: string) {
  const absCwd = path.resolve(cwd);

  if (watchers.has(absCwd)) return;

  for (const existing of watchers.keys()) {
    if (absCwd === existing || absCwd.startsWith(existing + path.sep)) {
      return;
    }
  }

  detectDefaultBranch(absCwd).then((branch) => {
    defaultBranches.set(absCwd, branch);
  }).catch(() => {
    defaultBranches.set(absCwd, 'master');
  });

  let watcher: FSWatcher;
  try {
    watcher = chokidar.watch(absCwd, {
      ignored: (filePath: string) => shouldIgnore(absCwd, filePath),
      persistent: true,
      ignoreInitial: true,
      depth: 8,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });
  } catch (err) {
    console.error(`[filewatcher] failed to start watcher for ${absCwd}:`, (err as Error).message);
    return;
  }

  watcher.on('add', (filePath: string) => handleChange(filePath, 'add', absCwd));
  watcher.on('change', (filePath: string) => handleChange(filePath, 'change', absCwd));
  watcher.on('unlink', (filePath: string) => handleChange(filePath, 'unlink', absCwd));
  watcher.on('error', (err: unknown) => {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'EMFILE' || e?.code === 'ENOSPC') {
      console.error(
        `[filewatcher] ${e.code}: too many open files. Raise the FD limit (\`ulimit -n 65536\`) or narrow the agent cwd. Watcher for ${absCwd} is degraded.`
      );
    } else {
      console.error(`[filewatcher] watcher error for ${absCwd}:`, e?.message || e);
    }
  });

  watchers.set(absCwd, watcher);
}

export function stopWatching(cwd?: string) {
  if (cwd) {
    const absCwd = path.resolve(cwd);
    const w = watchers.get(absCwd);
    if (w) {
      w.close().catch(() => { /* ignore */ });
      watchers.delete(absCwd);
      defaultBranches.delete(absCwd);
    }
    return;
  }
  for (const [, w] of watchers) {
    w.close().catch(() => { /* ignore */ });
  }
  watchers.clear();
  defaultBranches.clear();
}

async function handleChange(absolutePath: string, changeType: string, cwd: string) {
  const relativePath = path.relative(cwd, absolutePath);
  const branch = defaultBranches.get(cwd) || 'master';
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
