import fs from 'fs';
import path from 'path';
import os from 'os';
import chokidar from 'chokidar';
import type { Server as SocketServer } from 'socket.io';

const CLUSTR_DIR = path.join(os.homedir(), '.clustr');
const CLUSTR_MD_PATH = path.join(CLUSTR_DIR, 'CLUSTR.md');

let io: SocketServer | null = null;
let lastKnownContent = '';
let watcher: ReturnType<typeof chokidar.watch> | null = null;

export function initCrewMd(socketIo: SocketServer) {
  io = socketIo;
  if (!fs.existsSync(CLUSTR_DIR)) {
    fs.mkdirSync(CLUSTR_DIR, { recursive: true });
  }
  if (!fs.existsSync(CLUSTR_MD_PATH)) {
    fs.writeFileSync(CLUSTR_MD_PATH, DEFAULT_CONTENT, 'utf-8');
  }
  lastKnownContent = fs.readFileSync(CLUSTR_MD_PATH, 'utf-8');
  watchClustrMd();
}

function watchClustrMd() {
  if (watcher) {
    watcher.close();
  }

  watcher = chokidar.watch(CLUSTR_MD_PATH, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on('change', () => {
    try {
      const content = fs.readFileSync(CLUSTR_MD_PATH, 'utf-8');
      if (content !== lastKnownContent) {
        lastKnownContent = content;
        io?.emit('crewmd:updated', content);
      }
    } catch { /* file may be mid-write */ }
  });
}

const DEFAULT_CONTENT = `# CLUSTR.md — Global Agent Instructions

This file is read by every agent at startup and should be re-read periodically.
Keep entries concise to save tokens.

## Rules
- IMPORTANT: Do NOT explore or read files outside your project/scope. If you need information about another project, message that agent with a SPECIFIC question instead. This saves context for everyone.
- Proactively delegate: If your task requires knowledge of another agent's domain, ask them immediately rather than trying to figure it out yourself.
- IMPORTANT: After completing any task, discovering key information, or making architectural decisions, ALWAYS write a concise summary to shared context using write_context immediately. Other agents depend on this to stay informed.
- Write concise context: bullet points, key facts only — no verbose prose.
- Re-read this file periodically to stay current with team knowledge.
- Before starting work, read shared context to see what others have already discovered.

## Project Notes
(Add project-specific notes, conventions, or shared knowledge below)

`;

export function getCrewMdPath(): string {
  return CLUSTR_MD_PATH;
}

export function readCrewMd(): string {
  try {
    return fs.readFileSync(CLUSTR_MD_PATH, 'utf-8');
  } catch {
    return DEFAULT_CONTENT;
  }
}

export function writeCrewMd(content: string) {
  if (!fs.existsSync(CLUSTR_DIR)) {
    fs.mkdirSync(CLUSTR_DIR, { recursive: true });
  }
  lastKnownContent = content;
  fs.writeFileSync(CLUSTR_MD_PATH, content, 'utf-8');
  io?.emit('crewmd:updated', content);
}
