import { insertMessage, getUnreadMessages, getAllMessages } from './db.js';
import { listAgents, getAgent } from './db.js';
import { notifyAgent } from './spawner.js';
import type { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initBroker(socketIo: SocketServer) {
  io = socketIo;
}

export function sendMessage(from: string, to: string, content: string) {
  const msg = insertMessage(from, to, content);
  io?.emit('messages:new', msg);

  const sender = getAgent(from);
  const fromName = (sender?.name as string) || from;
  notifyAgent(to, fromName, content);

  return msg;
}

export function readMessages(agentId: string) {
  return getUnreadMessages(agentId);
}

export function broadcastMessage(from: string, content: string) {
  const agents = listAgents().filter(a => a.status === 'running' && a.id !== from);
  const msgs = [];
  for (const agent of agents) {
    msgs.push(sendMessage(from, agent.id as string, content));
  }
  return msgs;
}

export { getAllMessages };
