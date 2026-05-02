import type { Server as SocketServer } from 'socket.io';

const MAX_LOG_LINES = 2_000;
const MAX_LOG_LINE_LENGTH = 8_000;
const MAX_LOG_REMAINDER = 8_000;

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogSource = 'agent';
export type LogStream = 'stdout';

export interface LogEntry {
  id: number;
  agentId: string;
  timestamp: string;
  level: LogLevel;
  text: string;
  source: LogSource;
  stream?: LogStream;
}

interface LogChunk {
  agentId: string;
  data: string;
  source: LogSource;
  stream?: LogStream;
}

const logBuffers = new Map<string, LogEntry[]>();
const logRemainders = new Map<string, string>();
let io: SocketServer | null = null;
let nextLogEntryId = 1;

const SENSITIVE_KEY_PATTERN = [
  'authorization',
  'access_token',
  'accessToken',
  'api_key',
  'apikey',
  'app_secret',
  'client_secret',
  'github_token',
  'identity_payload',
  'jenkins_token',
  'langfuse_secret_key',
  'password',
  'passwd',
  'secret',
  'slack_url',
  'splunk_password',
  'token',
].join('|');
const SENSITIVE_ASSIGNMENT_SINGLE_QUOTED_RE = new RegExp(`\\b(${SENSITIVE_KEY_PATTERN})\\s*=\\s*'[^']*'`, 'gi');
const SENSITIVE_ASSIGNMENT_DOUBLE_QUOTED_RE = new RegExp(`\\b(${SENSITIVE_KEY_PATTERN})\\s*=\\s*"[^"]*"`, 'gi');
const SENSITIVE_ASSIGNMENT_UNQUOTED_RE = new RegExp(`\\b(${SENSITIVE_KEY_PATTERN})\\s*=\\s*([^\\s,'")}]+)`, 'gi');
const SENSITIVE_JSON_STRING_RE = new RegExp(`"(${SENSITIVE_KEY_PATTERN})"\\s*:\\s*"[^"]*"`, 'gi');

export function initLogBuffer(socketIo: SocketServer): void {
  io = socketIo;
}

function bufferKey(agentId: string, source?: LogSource): string {
  return source ? `${agentId}:${source}` : agentId;
}

function remainderKey(chunk: Pick<LogChunk, 'agentId' | 'source' | 'stream'>): string {
  return [
    chunk.agentId,
    chunk.source,
    chunk.stream ?? 'stdout',
  ].join(':');
}

export function stripAnsiAndControl(text: string): string {
  return text
    .replace(/\x1B\[(\d*)C/g, (_match, count: string) => ' '.repeat(Math.min(8, Math.max(1, Number(count) || 1))))
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g, '')
    .replace(/[^\S\r\n]+$/gm, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function normalizeClaudeOutputLine(text: string): string {
  return text
    .replace(/^\s*[⎿│┃┆┊]\s?/, '')
    .replace(/\s*[│┃]\s*$/, '')
    .replace(/^\s+(?=\[?\d{4}-\d{2}-\d{2}|(?:DEBUG|INFO|WARN|WARNING|ERROR|TRACE|FATAL)\b|module=)/i, '')
    .trim();
}

export function redactSensitiveValues(text: string): string {
  return text
    .replace(/\b(authorization\s*[:=]\s*bearer\s+)[^\s'"`]+/gi, '$1[REDACTED]')
    .replace(SENSITIVE_ASSIGNMENT_SINGLE_QUOTED_RE, '$1=[REDACTED]')
    .replace(SENSITIVE_ASSIGNMENT_DOUBLE_QUOTED_RE, '$1=[REDACTED]')
    .replace(SENSITIVE_ASSIGNMENT_UNQUOTED_RE, '$1=[REDACTED]')
    .replace(SENSITIVE_JSON_STRING_RE, '"$1":"[REDACTED]"')
    .replace(/\b(bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[REDACTED]');
}

function inferLogLevel(text: string, stream?: LogStream): LogLevel {
  if (stream === 'stderr') return 'error';
  if (/\b(error|fatal|exception|failed|failure|traceback)\b/i.test(text)) return 'error';
  if (/\b(warn|warning|deprecated|retrying)\b/i.test(text)) return 'warn';
  if (/\b(debug|trace|verbose)\b/i.test(text)) return 'debug';
  return 'info';
}

export function appendLogLine(params: Omit<LogEntry, 'id' | 'timestamp' | 'level'> & { level?: LogLevel }): void {
  const text = redactSensitiveValues(normalizeClaudeOutputLine(params.text)).slice(0, MAX_LOG_LINE_LENGTH);
  if (!text) return;

  const entry: LogEntry = {
    id: nextLogEntryId++,
    agentId: params.agentId,
    timestamp: new Date().toISOString(),
    level: params.level ?? inferLogLevel(text, params.stream),
    text,
    source: params.source,
    stream: params.stream,
  };

  for (const key of [bufferKey(params.agentId), bufferKey(params.agentId, params.source)]) {
    const buffer = logBuffers.get(key) ?? [];
    buffer.push(entry);
    if (buffer.length > MAX_LOG_LINES) {
      buffer.splice(0, buffer.length - MAX_LOG_LINES);
    }
    logBuffers.set(key, buffer);
  }

  io?.emit(`agent:logs:${params.agentId}`, entry);
}

export function captureLogChunk(chunk: LogChunk): void {
  const normalized = stripAnsiAndControl(chunk.data).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized) return;

  const key = remainderKey(chunk);
  const current = (logRemainders.get(key) ?? '') + normalized;
  const lines = current.split('\n');
  const remainder = lines.pop() ?? '';

  for (const line of lines) {
    appendLogLine({ ...chunk, text: line });
  }

  logRemainders.set(key, remainder.slice(-MAX_LOG_REMAINDER));
}

export function flushLogRemainder(chunk: Omit<LogChunk, 'data'>): void {
  const key = remainderKey(chunk);
  const remainder = logRemainders.get(key);
  if (remainder) appendLogLine({ ...chunk, text: remainder });
  logRemainders.delete(key);
}

export function getLogs(agentId: string, source?: LogSource): LogEntry[] {
  return [...(logBuffers.get(bufferKey(agentId, source)) ?? [])];
}

export function clearLogs(agentId: string, source?: LogSource): void {
  if (source) {
    logBuffers.delete(bufferKey(agentId, source));
  } else {
    logBuffers.delete(bufferKey(agentId));
    logBuffers.delete(bufferKey(agentId, 'agent'));
  }

  for (const key of [...logRemainders.keys()]) {
    if (key.startsWith(`${agentId}:`) && (!source || key.startsWith(`${agentId}:${source}:`))) {
      logRemainders.delete(key);
    }
  }
}
