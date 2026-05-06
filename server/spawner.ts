import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { insertAgent, updateAgent } from './db.js';
import { AGENT_TYPES, isValidServiceType, type ServiceType } from './agent-types.js';
import type { Server as SocketServer } from 'socket.io';
import { appendLogLine, captureLogChunk, flushLogRemainder } from './log-buffer.js';
import { startCommandOutputTailing, stopCommandOutputTailing } from './command-output-tailer.js';

const INSTALL_HINTS: Record<string, string> = {
  claude: 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex',
};

function resolveCommand(cmd: string): string {
  try {
    const which = process.platform === 'win32' ? 'where' : '/usr/bin/which';
    return execFileSync(which, [cmd], { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

const CLUSTR_DIR = path.join(os.homedir(), '.clustr');
const MCP_CONFIG_DIR = path.join(CLUSTR_DIR, 'mcp-configs');

const MAX_SCROLLBACK = 100_000;

interface AgentProcess {
  pty: IPty;
  cwd: string;
  scrollback: string;
}

const runningAgents = new Map<string, AgentProcess>();
let io: SocketServer | null = null;
let onAgentListChanged: (() => void) | null = null;

const MAX_AGENTS = parseInt(process.env.CLUSTR_MAX_AGENTS || '5', 10);

function submitClaudeTask(shell: IPty, agentId: string, task: string): void {
  appendLogLine({
    agentId,
    source: 'agent',
    stream: 'stdout',
    level: 'debug',
    text: 'Submitting initial Claude task',
  });

  try {
    shell.write(task);
  } catch (err) {
    appendLogLine({
      agentId,
      source: 'agent',
      stream: 'stdout',
      level: 'error',
      text: `Failed to write initial Claude task: ${(err as Error).message}`,
    });
    return;
  }

  setTimeout(() => {
    try {
      shell.write('\r');
      appendLogLine({
        agentId,
        source: 'agent',
        stream: 'stdout',
        level: 'debug',
        text: 'Submitted initial Claude task with Enter',
      });
    } catch (err) {
      appendLogLine({
        agentId,
        source: 'agent',
        stream: 'stdout',
        level: 'error',
        text: `Failed to submit initial Claude task: ${(err as Error).message}`,
      });
    }
  }, 300);
}

export function initSpawner(socketIo: SocketServer, onChanged?: () => void): void {
  io = socketIo;
  onAgentListChanged = onChanged ?? null;
}

export function spawnAgent(
  name: string,
  task: string,
  options?: { cwd?: string; service?: ServiceType }
): string {
  if (runningAgents.size >= MAX_AGENTS) {
    throw new Error(`Max concurrent agents (${MAX_AGENTS}) reached`);
  }

  const service: ServiceType = (options?.service && isValidServiceType(options.service)) ? options.service : 'claude';
  const agentType = AGENT_TYPES[service];

  const id = uuidv4();

  if (!fs.existsSync(MCP_CONFIG_DIR)) {
    fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
  }

  let bridgePath = path.resolve(__dirname, 'mcp-stdio-bridge.js');
  if (!fs.existsSync(bridgePath)) {
    bridgePath = path.resolve(__dirname, '..', 'dist', 'server', 'mcp-stdio-bridge.js');
  }
  if (!fs.existsSync(bridgePath)) {
    throw new Error(
      `MCP bridge not compiled. Run "npm run build:server" first.`
    );
  }

  const mcpConfigPath = path.join(MCP_CONFIG_DIR, `${id}.json`);
  const serverUrl = `http://127.0.0.1:${process.env.CLUSTR_PORT || '3100'}`;
  agentType.writeMcpConfig(mcpConfigPath, bridgePath, id, serverUrl);

  insertAgent(id, name, service, task, null);

  const cwd = options?.cwd || process.cwd();

  // Always set agent_cwd so file attribution works.
  // Pre-register as 'running' so the agent is visible immediately without
  // waiting for Claude to call mcp__clustr__register_agent.
  updateAgent(id, { agent_cwd: cwd, status: 'running' });

  const systemPrompt = agentType.buildPrompt({ name, id, task });

  const args = agentType.buildArgs({ mcpConfigPath, systemPrompt, task, cwd });

  const spawnEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'CLAUDECODE' && k !== 'NO_COLOR') {
      spawnEnv[k] = v;
    }
  }
  spawnEnv['COLORTERM'] = 'truecolor';
  spawnEnv['FORCE_COLOR'] = '3';
  spawnEnv['TERM'] = 'xterm-256color';

  const cmdPath = resolveCommand(agentType.command);
  if (!cmdPath) {
    const hint = INSTALL_HINTS[service] || `Install "${agentType.command}" and make sure it's in your PATH`;
    throw new Error(`${agentType.command} CLI not found. Install with: ${hint}`);
  }
  const shell = pty.spawn(cmdPath, args, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd,
    env: spawnEnv,
  });

  const agent: AgentProcess = { pty: shell, cwd, scrollback: '' };
  runningAgents.set(id, agent);
  startCommandOutputTailing(id, cwd, service);
  updateAgent(id, { status: 'running', pid: shell.pid });

  let lastPingTime = 0;
  let agentTotalCost = 0;
  let agentTotalTokens = 0;

  const costRegex = /\$(\d+\.?\d*)/;
  const tokensRegex = /(\d[\d,]+)\s*tokens?/i;
  const totalCostRegex = /total\s*(?:cost|spent)[:\s]*\$(\d+\.?\d*)/i;

  shell.onData((data: string) => {
    agent.scrollback += data;
    if (agent.scrollback.length > MAX_SCROLLBACK) {
      agent.scrollback = agent.scrollback.slice(-MAX_SCROLLBACK);
    }
    io?.emit(`agent:pty:${id}`, data);
    captureLogChunk({ agentId: id, source: 'agent', stream: 'stdout', data });

    const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    const costMatch = clean.match(totalCostRegex) || clean.match(costRegex);
    if (costMatch) {
      const cost = parseFloat(costMatch[1]);
      if (cost > agentTotalCost) {
        agentTotalCost = cost;
        updateAgent(id, { total_cost: cost });
        io?.emit('agent:cost', { id, total_cost: cost, total_tokens: agentTotalTokens });
      }
    }
    const tokenMatch = clean.match(tokensRegex);
    if (tokenMatch) {
      const tokens = parseInt(tokenMatch[1].replace(/,/g, ''), 10);
      if (tokens > agentTotalTokens) {
        agentTotalTokens = tokens;
        updateAgent(id, { total_tokens: tokens });
        io?.emit('agent:cost', { id, total_cost: agentTotalCost, total_tokens: tokens });
      }
    }

    // Throttled last_seen update (every 15s)
    const now = Date.now();
    if (now - lastPingTime > 15_000) {
      lastPingTime = now;
      updateAgent(id, { last_seen: new Date().toISOString().replace('T', ' ').slice(0, 19) });
    }
  });

  shell.onExit(({ exitCode }) => {
    flushLogRemainder({ agentId: id, source: 'agent', stream: 'stdout' });
    stopCommandOutputTailing(id);
    runningAgents.delete(id);
    updateAgent(id, { status: 'done' });
    io?.emit(`agent:pty:${id}`, `\r\n\x1b[33m--- Process exited (code: ${exitCode}) ---\x1b[0m\r\n`);
    onAgentListChanged?.();
    agentType.cleanupMcpConfig(mcpConfigPath, cwd);
  });

  // Auto-navigate TUI dialogs and send the initial task
  let taskSent = false;
  const sendTask = () => {
    if (taskSent) return;
    taskSent = true;
    // For claude, write the task into the PTY prompt (skip if no task)
    // For codex exec, the task is already in the args — just mark as sent
    if (service === 'claude' && task.trim()) {
      submitClaudeTask(shell, id, task);
    }
  };

  agentType.setupDialogHandlers(shell, sendTask);

  return id;
}

export function writeToAgent(id: string, data: string): boolean {
  const agent = runningAgents.get(id);
  if (!agent) return false;
  agent.pty.write(data);
  return true;
}

export function notifyAgent(id: string, fromName: string): boolean {
  const agent = runningAgents.get(id);
  if (!agent) return false;
  const hint = `You have a new message from ${fromName}. Use mcp__clustr__read_messages to read and respond.`;
  setTimeout(() => {
    agent.pty.write(hint + '\r');
  }, 300);
  return true;
}

export function resizeAgent(id: string, cols: number, rows: number): boolean {
  const agent = runningAgents.get(id);
  if (!agent) return false;
  try {
    agent.pty.resize(cols, rows);
  } catch { /* ignore resize errors */ }
  return true;
}

export function killAgent(id: string): boolean {
  const agent = runningAgents.get(id);
  if (!agent) return false;
  stopCommandOutputTailing(id);
  agent.pty.kill();
  return true;
}

export function getRunningAgentIds(): string[] {
  return [...runningAgents.keys()];
}

export function getAgentScrollback(id: string): string {
  return runningAgents.get(id)?.scrollback ?? '';
}
