import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { apiFetch, type Agent } from '../hooks/useSocket';
import './AgentLogs.css';

type AgentLogLevel = 'error' | 'warn' | 'info' | 'debug';
type LevelFilter = AgentLogLevel | 'all';

export interface AgentLogEntry {
  id: number;
  agentId: string;
  timestamp: string;
  level: AgentLogLevel;
  text: string;
  source: 'agent';
  stream?: 'stdout';
}

interface Props {
  agents: Agent[];
  selectedAgent: Agent | null;
  socket: RefObject<Socket | null>;
  onSelectAgent: (agent: Agent) => void;
}

const LEVELS: LevelFilter[] = ['all', 'error', 'warn', 'info', 'debug'];
const MAX_VISIBLE_LOG_LINES = 2_000;
const LOG_LEVEL_PATTERN = 'ERROR|FATAL|WARN|WARNING|INFO|DEBUG|TRACE';
const TIMESTAMP_PATTERN = String.raw`\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[,.]\d+)?(?:Z|[+-]\d{2}:?\d{2})?`;
const STRUCTURED_LOG_RE = new RegExp(
  String.raw`^\[([^\]]+)\]\s*(${LOG_LEVEL_PATTERN})\s*(\[[^\]]*\])?\s*(.*)$`,
  'i'
);
const PYTHON_LOG_RE = new RegExp(
  String.raw`^(${TIMESTAMP_PATTERN})\s+-\s+([^\s]+)\s+-\s+(${LOG_LEVEL_PATTERN})\s+-\s*(.*)$`,
  'i'
);
const TIMESTAMP_LEVEL_RE = new RegExp(
  String.raw`^(${TIMESTAMP_PATTERN})\s+\[?(${LOG_LEVEL_PATTERN})\]?\s*(\[[^\]]*\])?\s*(.*)$`,
  'i'
);
const SIMPLE_LEVEL_RE = new RegExp(String.raw`^(${LOG_LEVEL_PATTERN}):\s*(.*)$`, 'i');
const LOGGER_PREFIX_RE = /^([A-Za-z_][\w.-]*(?:\.[\w.-]+)+):\s*(.*)$/;
const MODULE_PREFIX_RE = /^(module=[^:\s]+):\s*(.*)$/i;
const HTTP_ACCESS_RE = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+["/][^"]*\s+HTTP\/\d(?:\.\d)?"?\s+\d{3}\b/i;
const SERVER_LOG_HINT_RE = /\b(uvicorn|fastapi|django|flask|gunicorn|werkzeug|localhost|127\.0\.0\.1|0\.0\.0\.0|listening|started server|application startup|traceback|exception|module=)\b/i;

interface ParsedLogText {
  timestamp?: string;
  level?: AgentLogLevel;
  context?: string;
  message: string;
}

function levelLabel(level: LevelFilter): string {
  return level === 'all' ? 'All levels' : level.toUpperCase();
}

function levelClass(level: AgentLogLevel): string {
  return `agent-log-level ${level}`;
}

function normalizeParsedLevel(level: string): AgentLogLevel {
  const normalized = level.toLowerCase();
  if (normalized === 'fatal') return 'error';
  if (normalized === 'warning') return 'warn';
  if (normalized === 'trace') return 'debug';
  return normalized as AgentLogLevel;
}

function formatLogTimestamp(timestamp: string): string {
  const timeMatch = timestamp.match(/\d{2}:\d{2}:\d{2}(?:[,.]\d+)?/);
  return timeMatch?.[0]?.replace(',', '.') ?? timestamp;
}

function cleanContext(context?: string): string | undefined {
  const normalized = context?.replace(/^\[|\]$/g, '').trim();
  return normalized || undefined;
}

function normalizeTerminalLogText(text: string): string {
  return text
    .replace(/^\s*[⎿│┃┆┊]\s?/, '')
    .replace(/^\s{2,}(?=\[?\d{4}-\d{2}-\d{2}|(?:DEBUG|INFO|WARN|WARNING|ERROR|TRACE|FATAL)\b|module=)/i, '')
    .trim();
}

function parseMessageContext(text: string): Pick<ParsedLogText, 'context' | 'message'> {
  const moduleMatch = text.match(MODULE_PREFIX_RE);
  if (moduleMatch) {
    return { context: moduleMatch[1], message: moduleMatch[2] };
  }

  const loggerMatch = text.match(LOGGER_PREFIX_RE);
  if (loggerMatch) {
    return { context: loggerMatch[1], message: loggerMatch[2] };
  }

  return { message: text };
}

function parseLogText(text: string): ParsedLogText {
  const normalizedText = normalizeTerminalLogText(text);
  const pythonMatch = normalizedText.match(PYTHON_LOG_RE);
  if (pythonMatch) {
    const [, timestamp, context, level, message] = pythonMatch;
    return {
      timestamp: formatLogTimestamp(timestamp),
      level: normalizeParsedLevel(level),
      context,
      message,
    };
  }

  const structuredMatch = normalizedText.match(STRUCTURED_LOG_RE);
  if (structuredMatch) {
    const [, timestamp, level, bracketContext, rest] = structuredMatch;
    const parsedMessage = parseMessageContext(rest);

    return {
      timestamp: formatLogTimestamp(timestamp),
      level: normalizeParsedLevel(level),
      context: parsedMessage.context ?? cleanContext(bracketContext),
      message: parsedMessage.message,
    };
  }

  const timestampMatch = normalizedText.match(TIMESTAMP_LEVEL_RE);
  if (timestampMatch) {
    const [, timestamp, level, bracketContext, rest] = timestampMatch;
    const parsedMessage = parseMessageContext(rest);
    return {
      timestamp: formatLogTimestamp(timestamp),
      level: normalizeParsedLevel(level),
      context: cleanContext(bracketContext) ?? parsedMessage.context,
      message: parsedMessage.message,
    };
  }

  const simpleMatch = normalizedText.match(SIMPLE_LEVEL_RE);
  if (simpleMatch) {
    const [, level, message] = simpleMatch;
    const parsedMessage = parseMessageContext(message);
    return {
      level: normalizeParsedLevel(level),
      context: parsedMessage.context,
      message: parsedMessage.message,
    };
  }

  return { message: normalizedText };
}

function isServerLikeLog(entry: AgentLogEntry): boolean {
  const normalizedText = normalizeTerminalLogText(entry.text);
  const parsed = parseLogText(normalizedText);
  return Boolean(
    parsed.timestamp ||
    parsed.context ||
    HTTP_ACCESS_RE.test(normalizedText) ||
    SERVER_LOG_HINT_RE.test(normalizedText)
  );
}

function mergeLogEntries(existing: AgentLogEntry[], incoming: AgentLogEntry[]): AgentLogEntry[] {
  const entriesById = new Map<number, AgentLogEntry>();
  for (const entry of [...existing, ...incoming]) {
    entriesById.set(entry.id, entry);
  }

  return [...entriesById.values()]
    .sort((a, b) => a.id - b.id)
    .slice(-MAX_VISIBLE_LOG_LINES);
}

function getEmptyLogMessage(logCount: number): string {
  if (logCount > 0) {
    return 'No logs match the current filters.';
  }

  return 'No server-like output found in this agent terminal yet. Turn off Server only to see raw agent terminal logs.';
}

export default function AgentLogs({ agents, selectedAgent, socket, onSelectAgent }: Props) {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [serverOnly, setServerOnly] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const availableAgents = useMemo(
    () => agents.filter((agent) => agent.status !== 'dead'),
    [agents]
  );
  const activeAgent = selectedAgent ?? availableAgents[0] ?? null;

  useEffect(() => {
    if (!activeAgent) {
      setLogs([]);
      return;
    }

    let cancelled = false;
    setLogs([]);

    apiFetch(`/api/agents/${activeAgent.id}/logs?source=agent`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled) return;

        const fetchedLogs = Array.isArray(data?.logs) ? data.logs : [];
        setLogs((currentLogs) => mergeLogEntries(fetchedLogs, currentLogs));
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeAgent?.id]);

  useEffect(() => {
    const sock = socket.current;
    if (!sock || !activeAgent) return;

    const eventName = `agent:logs:${activeAgent.id}`;
    const onLog = (entry: AgentLogEntry) => {
      if (entry.source === 'agent') setLogs((prev) => mergeLogEntries(prev, [entry]));
    };

    sock.on(eventName, onLog);
    return () => {
      sock.off(eventName, onLog);
    };
  }, [activeAgent?.id, socket]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (level !== 'all' && entry.level !== level) return false;
      if (serverOnly && !isServerLikeLog(entry)) return false;
      if (!normalizedQuery) return true;
      return entry.text.toLowerCase().includes(normalizedQuery);
    });
  }, [logs, level, query, serverOnly]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [filteredLogs, autoScroll]);

  const handleAgentChange = (agentId: string): void => {
    const nextAgent = agents.find((agent) => agent.id === agentId);
    if (nextAgent) onSelectAgent(nextAgent);
  };

  const emptyLogMessage = getEmptyLogMessage(logs.length);

  return (
    <div className="agent-logs">
      <div className="agent-logs-header">
        <div className="agent-logs-title">
          <div>
            <span>Server Logs</span>
            <span className="agent-logs-subtitle">Agent terminal stream</span>
          </div>
          <span className="agent-logs-count">{filteredLogs.length}/{logs.length}</span>
        </div>
        <div className="agent-logs-controls">
          <select
            value={activeAgent?.id ?? ''}
            onChange={(event) => handleAgentChange(event.target.value)}
            disabled={availableAgents.length === 0}
            aria-label="Select agent logs"
          >
            {availableAgents.length === 0 && <option value="">No agents</option>}
            {availableAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as LevelFilter)}
            aria-label="Filter log level"
          >
            {LEVELS.map((item) => (
              <option key={item} value={item}>
                {levelLabel(item)}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search logs..."
            aria-label="Search logs"
          />
          <label className="agent-logs-autoscroll">
            <input
              type="checkbox"
              checked={serverOnly}
              onChange={(event) => setServerOnly(event.target.checked)}
            />
            Server only
          </label>
          <label className="agent-logs-autoscroll">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(event) => setAutoScroll(event.target.checked)}
            />
            Auto-scroll
          </label>
          <button onClick={() => setLogs([])} disabled={logs.length === 0}>
            Clear View
          </button>
        </div>
      </div>

      <div className="agent-logs-list">
        {!activeAgent && (
          <div className="agent-logs-empty">
            Spawn an agent and run a server command. Logs from Claude/Codex terminal output will appear here.
          </div>
        )}
        {activeAgent && filteredLogs.length === 0 && (
          <div className="agent-logs-empty">
            {emptyLogMessage}
          </div>
        )}
        {filteredLogs.map((entry) => {
          const parsedLog = parseLogText(entry.text);
          const displayLevel = parsedLog.level ?? entry.level;
          const displayTime = parsedLog.timestamp ?? new Date(entry.timestamp).toLocaleTimeString();
          const sourceLabel = parsedLog.context || entry.stream;

          return (
            <div key={entry.id} className={`agent-log-row ${displayLevel}`}>
              <span className="agent-log-time">
                {displayTime}
              </span>
              <span className={levelClass(displayLevel)}>
                {displayLevel}
              </span>
              <span className="agent-log-text">
                {sourceLabel && (
                  <span className={`agent-log-source ${entry.stream ?? 'stdout'}`}>
                    {sourceLabel}
                  </span>
                )}
                <span className="agent-log-message">{parsedLog.message}</span>
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
