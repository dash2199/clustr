import { getContext, setContext, deleteContextEntry, getAgent } from './db.js';
import type { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initContext(socketIo: SocketServer) {
  io = socketIo;
}

export function readContext(key?: string) {
  return getContext(key);
}

export function writeContext(key: string, value: string, updatedBy: string) {
  const agent = getAgent(updatedBy);
  const displayName = (agent?.name as string) || updatedBy;
  setContext(key, value, displayName);
  io?.emit('context:updated', { key, value, updatedBy: displayName });
}

export function removeContext(key: string) {
  deleteContextEntry(key);
  io?.emit('context:removed', { key });
}
