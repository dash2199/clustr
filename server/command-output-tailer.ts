import fs from 'fs';
import os from 'os';
import path from 'path';
import { captureLogChunk } from './log-buffer.js';
import type { ServiceType } from './agent-types.js';

const POLL_INTERVAL_MS = 1_000;
const MAX_READ_BYTES = 256 * 1024;

interface TailState {
  agentId: string;
  cwd: string;
  service: ServiceType;
  timer: NodeJS.Timeout;
  offsets: Map<string, number>;
}

const tailers = new Map<string, TailState>();

function encodeCwd(cwd: string): string {
  return path.resolve(cwd).replace(/\//g, '-');
}

function listCommandOutputFiles(cwd: string, service: ServiceType): string[] {
  const encodedCwd = encodeCwd(cwd);
  const tmpDirs = [...new Set([os.tmpdir(), '/tmp', '/private/tmp'])];
  let roots: string[] = [];

  for (const tmpDir of tmpDirs) {
    try {
      const prefixes = service === 'claude' ? ['claude-'] : ['codex-', 'codex'];
      roots.push(
        ...fs.readdirSync(tmpDir)
          .filter((name) => prefixes.some((prefix) => name.startsWith(prefix)))
          .map((name) => path.join(tmpDir, name, encodedCwd))
          .filter((dir) => fs.existsSync(dir))
      );
    } catch {
      // Ignore unavailable temp roots.
    }
  }

  if (service === 'codex') {
    const codexHome = path.join(os.homedir(), '.codex');
    for (const candidate of [
      path.join(codexHome, encodedCwd),
      path.join(codexHome, 'logs'),
      path.join(codexHome, 'sessions'),
    ]) {
      if (fs.existsSync(candidate)) roots.push(candidate);
    }
  }

  const outputFiles: string[] = [];
  for (const root of roots) {
    collectOutputFiles(root, outputFiles, 0);
  }
  return [...new Set(outputFiles.map((filePath) => {
    try {
      return fs.realpathSync(filePath);
    } catch {
      return filePath;
    }
  }))].sort();
}

function collectOutputFiles(dir: string, outputFiles: string[], depth: number): void {
  if (depth > 5) return;

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectOutputFiles(fullPath, outputFiles, depth + 1);
    } else if (entry.isFile() && (entry.name.endsWith('.output') || entry.name.endsWith('.log'))) {
      outputFiles.push(fullPath);
    }
  }
}

function readNewBytes(filePath: string, offset: number, size: number): string {
  const start = Math.max(offset, size - MAX_READ_BYTES);
  const length = size - start;
  if (length <= 0) return '';

  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, start);
    return buffer.toString('utf-8');
  } finally {
    fs.closeSync(fd);
  }
}

function pollTailer(state: TailState): void {
  for (const filePath of listCommandOutputFiles(state.cwd, state.service)) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    const previousOffset = state.offsets.get(filePath);
    const nextOffset = stat.size;
    if (previousOffset === undefined) {
      state.offsets.set(filePath, nextOffset);
      continue;
    }

    const offset = previousOffset;
    state.offsets.set(filePath, nextOffset);

    if (nextOffset <= offset) continue;

    try {
      const data = readNewBytes(filePath, offset, nextOffset);
      if (data) {
        captureLogChunk({
          agentId: state.agentId,
          source: 'agent',
          stream: 'stdout',
          data,
        });
      }
    } catch {
      // The command output file may rotate or disappear as the agent CLI cleans up.
    }
  }
}

export function startCommandOutputTailing(agentId: string, cwd: string, service: ServiceType): void {
  stopCommandOutputTailing(agentId);

  const state: TailState = {
    agentId,
    cwd: path.resolve(cwd),
    service,
    offsets: new Map(),
    timer: setInterval(() => pollTailer(state), POLL_INTERVAL_MS),
  };

  state.timer.unref();
  tailers.set(agentId, state);
  pollTailer(state);
}

export function stopCommandOutputTailing(agentId: string): void {
  const state = tailers.get(agentId);
  if (!state) return;

  clearInterval(state.timer);
  tailers.delete(agentId);
}
