import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Agent {
  id: string;
  name: string;
  service: string;
  task: string;
  pid: number | null;
  status: string;
  current_task: string | null;
  last_seen: string;
  created_at: string;
  checkpoint_hash: string | null;
  agent_cwd: string | null;
  total_tokens: number;
  total_cost: number;
}

export interface Message {
  id: number;
  from_agent: string;
  to_agent: string;
  content: string;
  read: number;
  created_at: string;
}

export interface FileChange {
  id: number;
  file_path: string;
  change_type: string;
  diff_text: string | null;
  agent_id: string | null;
  created_at: string;
}

export interface ContextEntry {
  key: string;
  value: string;
  updated_by: string;
  updated_at: string;
}

function getAuthToken(): string {
  return new URLSearchParams(window.location.search).get('token') || '';
}

function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const separator = url.includes('?') ? '&' : '?';
  return fetch(token ? `${url}${separator}token=${encodeURIComponent(token)}` : url, options);
}

export { apiFetch };

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([]);
  const [crewMd, setCrewMd] = useState<string>('');
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);

  useEffect(() => {
    const token = getAuthToken();
    const socket = io(window.location.origin, {
      path: '/socket.io',
      auth: token ? { token } : undefined,
      query: token ? { token } : undefined,
    });
    socketRef.current = socket;

    socket.on('agents:updated', (data: Agent[]) => {
      if (Array.isArray(data)) setAgents(data);
    });

    socket.on('messages:new', (msg: Message) => {
      setMessages((prev) => [msg, ...prev]);
    });

    socket.on('messages:all', (msgs: Message[]) => {
      if (Array.isArray(msgs)) setMessages(msgs);
    });

    socket.on('context:updated', (entry: ContextEntry) => {
      setContextEntries((prev) => {
        const idx = prev.findIndex((e) => e.key === entry.key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });
    });

    socket.on('context:removed', ({ key }: { key: string }) => {
      setContextEntries((prev) => prev.filter((e) => e.key !== key));
    });

    socket.on('crewmd:updated', (content: string) => {
      if (typeof content === 'string') setCrewMd(content);
    });

    socket.on('agent:cost', (data: { id: string; total_cost: number; total_tokens: number }) => {
      setAgents((prev) => prev.map((a) =>
        a.id === data.id ? { ...a, total_cost: data.total_cost, total_tokens: data.total_tokens } : a
      ));
    });

    socket.on('file:changed', (change: FileChange) => {
      setFileChanges((prev) => [change, ...prev].slice(0, 500));
    });

    socket.on('file:changes:cleared', () => {
      setFileChanges([]);
    });

    apiFetch('/api/file-changes')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFileChanges(data); })
      .catch(() => {});

    apiFetch('/api/context')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setContextEntries(data); })
      .catch(() => {});

    return () => { socket.disconnect(); };
  }, []);

  return { socket: socketRef, agents, messages, contextEntries, crewMd, setCrewMd, fileChanges, setFileChanges };
}
