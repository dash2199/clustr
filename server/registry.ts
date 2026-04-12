import { v4 as uuidv4 } from 'uuid';
import { insertAgent, updateAgent, listAgents } from './db.js';
import type { Server as SocketServer } from 'socket.io';

export function registerAgent(name: string, service: string, task: string, pid: number | null): string {
  const id = uuidv4();
  insertAgent(id, name, service, task, pid);
  return id;
}

function utcNowString(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function pingAgent(id: string) {
  updateAgent(id, { last_seen: utcNowString() });
}

export function deregisterAgent(id: string) {
  updateAgent(id, { status: 'done' });
}

export function getActiveAgents() {
  return listAgents().filter(
    (a) => a.status !== 'dead'
  );
}
