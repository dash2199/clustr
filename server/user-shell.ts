import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import fs from 'fs';
import path from 'path';
import type { Server as SocketServer } from 'socket.io';

const MAX_SCROLLBACK = 100_000;

interface UserShellProcess {
  pty: IPty;
  cwd: string;
  scrollback: string;
}

const userShells = new Map<string, UserShellProcess>();
let io: SocketServer | null = null;

export function initUserShell(socketIo: SocketServer): void {
  io = socketIo;
}

function resolveShell(): string {
  const candidates = [
    process.env.SHELL,
    process.platform === 'win32' ? process.env.ComSpec : undefined,
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (process.platform === 'win32' || fs.existsSync(candidate)) return candidate;
  }
  return candidates[candidates.length - 1] || 'sh';
}

export function startUserShell(agentId: string, cwd: string): boolean {
  if (userShells.has(agentId)) return true;

  const shellPath = resolveShell();
  const spawnEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) spawnEnv[key] = value;
  }
  spawnEnv.COLORTERM = 'truecolor';
  spawnEnv.FORCE_COLOR = '3';
  spawnEnv.TERM = 'xterm-256color';

  const shell = pty.spawn(shellPath, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 24,
    cwd: path.resolve(cwd),
    env: spawnEnv,
  });

  const userShell: UserShellProcess = { pty: shell, cwd: path.resolve(cwd), scrollback: '' };
  userShells.set(agentId, userShell);

  shell.onData((data: string) => {
    userShell.scrollback += data;
    if (userShell.scrollback.length > MAX_SCROLLBACK) {
      userShell.scrollback = userShell.scrollback.slice(-MAX_SCROLLBACK);
    }
    io?.emit(`user-shell:pty:${agentId}`, data);
  });

  shell.onExit(({ exitCode }) => {
    userShells.delete(agentId);
    const message = `\r\n\x1b[33m--- User shell exited (code: ${exitCode}) ---\x1b[0m\r\n`;
    userShell.scrollback += message;
    io?.emit(`user-shell:pty:${agentId}`, message);
  });

  return true;
}

export function writeToUserShell(agentId: string, data: string): boolean {
  const userShell = userShells.get(agentId);
  if (!userShell) return false;
  userShell.pty.write(data.replace(/\r/g, '\n'));
  return true;
}

export function resizeUserShell(agentId: string, cols: number, rows: number): boolean {
  const userShell = userShells.get(agentId);
  if (!userShell) return false;
  try {
    userShell.pty.resize(cols, rows);
  } catch {
    // Ignore resize errors from exited shells.
  }
  return true;
}

export function stopUserShell(agentId: string): boolean {
  const userShell = userShells.get(agentId);
  if (!userShell) return false;
  userShell.pty.kill();
  userShells.delete(agentId);
  return true;
}

export function getUserShellScrollback(agentId: string): string {
  return userShells.get(agentId)?.scrollback ?? '';
}

export function getUserShellCwd(agentId: string): string | null {
  return userShells.get(agentId)?.cwd ?? null;
}
