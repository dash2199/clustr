import type { IPty } from 'node-pty';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readCrewMd, getCrewMdPath } from './crewmd.js';

export type ServiceType = 'claude' | 'codex';

export interface PromptOpts {
  name: string;
  id: string;
  task: string;
}

export interface AgentSpawnOpts {
  mcpConfigPath: string;
  systemPrompt: string;
  task: string;
  cwd: string;
}

export interface AgentTypeConfig {
  command: string;
  buildArgs: (opts: AgentSpawnOpts) => string[];
  writeMcpConfig: (mcpConfigPath: string, bridgePath: string, agentId: string, serverUrl: string) => void;
  cleanupMcpConfig: (mcpConfigPath: string, cwd: string) => void;
  setupDialogHandlers: (shell: IPty, sendTask: () => void) => void;
  buildPrompt: (opts: PromptOpts) => string;
}

function buildCollaborationPrompt(opts: PromptOpts): string {
  const crewMdContent = readCrewMd();
  const crewMdPath = getCrewMdPath();

  return [
    `You are agent "${opts.name}" (ID: ${opts.id}) in the Clustr multi-agent workspace.`,
    ...(opts.task ? [`Your task: ${opts.task}`, ''] : []),
    `CRITICAL: Re-read ${crewMdPath} after every few tool calls to stay current with team rules. Do this NOW if you haven't recently.`,
    '',
    'You have access to Clustr MCP tools for coordination:',
    '- mcp__clustr__register_agent — announce yourself',
    '- mcp__clustr__list_agents — see other agents',
    '- mcp__clustr__send_message / mcp__clustr__read_messages — communicate',
    '- mcp__clustr__read_context / mcp__clustr__write_context — shared state',
    '- mcp__clustr__spawn_agent — create new agents',
    '',
    '--- CLUSTR.md (current snapshot) ---',
    crewMdContent.trim(),
    '--- end CLUSTR.md ---',
    '',
    'Collaboration guidelines:',
    '- Start by registering yourself. If you have a task, proceed with it; otherwise wait for instructions.',
    '- IMPORTANT: You own the codebase at your working directory. Do NOT explore or read files outside your project/scope that belong to other agents. If you need information about another project, message that project\'s agent with a specific question instead. This saves context for everyone.',
    '- When you need information from another agent: use mcp__clustr__list_agents to find them, then mcp__clustr__send_message with a SPECIFIC question (e.g., "What authentication library does your project use?" not "Help me understand your codebase").',
    '- Proactively delegate: If your task requires knowledge of another agent\'s domain, ask them immediately rather than trying to figure it out yourself.',
    '- Before starting work, check mcp__clustr__read_context for any shared knowledge that other agents have already contributed.',
    '- When you finish meaningful work, write your findings to shared context using mcp__clustr__write_context so other agents can benefit. Keep context entries CONCISE — short bullet points or key facts only, no verbose explanations. Every token in shared context is read by all agents, so brevity saves tokens.',
    '- When you receive a message from another agent, respond helpfully and promptly.',
    `- REMINDER: Re-read ${crewMdPath} regularly — team rules change. Do it now if your conversation is getting long.`,
  ].join('\n');
}

const CLUSTR_DIR = path.join(os.homedir(), '.clustr');
const MCP_CONFIG_DIR = path.join(CLUSTR_DIR, 'mcp-configs');

const claudeConfig: AgentTypeConfig = {
  command: 'claude',

  buildArgs(opts: AgentSpawnOpts): string[] {
    return [
      '--dangerously-skip-permissions',
      '--append-system-prompt', opts.systemPrompt,
      '--mcp-config', opts.mcpConfigPath,
      '--allowedTools',
      'mcp__clustr__register_agent,mcp__clustr__ping,mcp__clustr__list_agents,mcp__clustr__send_message,mcp__clustr__read_messages,mcp__clustr__read_context,mcp__clustr__write_context,mcp__clustr__spawn_agent,Bash,Read,Edit,Write,Glob,Grep',
    ];
  },

  writeMcpConfig(mcpConfigPath: string, bridgePath: string, agentId: string, serverUrl: string) {
    if (!fs.existsSync(MCP_CONFIG_DIR)) {
      fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
    }
    const mcpConfig = {
      mcpServers: {
        clustr: {
          command: 'node',
          args: [bridgePath],
          env: {
            CLUSTR_AGENT_ID: agentId,
            CLUSTR_SERVER_URL: serverUrl,
          },
        },
      },
    };
    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  },

  cleanupMcpConfig(mcpConfigPath: string) {
    try { fs.unlinkSync(mcpConfigPath); } catch { /* ignore */ }
  },

  setupDialogHandlers(shell: IPty, sendTask: () => void) {
    let accumulated = '';
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    shell.onData((data: string) => {
      accumulated += data;

      // Workspace trust dialog
      if (accumulated.includes('Yes, I trust this') || accumulated.includes('Yes,\x1b[1CI\x1b[1Ctrust')) {
        setTimeout(() => shell.write('\r'), 100);
        accumulated = '';
        return;
      }

      // Bypass permissions dialog
      if (accumulated.includes('Yes, I accept') || accumulated.includes('Yes,\x1b[1CI\x1b[1Caccept')) {
        setTimeout(() => {
          shell.write('\x1b[B');
          setTimeout(() => shell.write('\r'), 100);
        }, 100);
        accumulated = '';
        return;
      }

      // Reset settle timer — send task once output stops for 1.5s
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(sendTask, 1500);
    });

    // Fallback: send after 15 seconds
    setTimeout(sendTask, 15000);
  },

  buildPrompt(opts: PromptOpts): string {
    return buildCollaborationPrompt(opts);
  },
};

const codexConfig: AgentTypeConfig = {
  command: 'codex',

  buildArgs(opts: AgentSpawnOpts): string[] {
    // codex exec runs non-interactively with --full-auto for no approval prompts
    // The task prompt includes collaboration context since codex has no --append-system-prompt
    const fullPrompt = opts.systemPrompt + '\n\n---\n\nNow execute the following task:\n' + opts.task;
    return [
      'exec',
      '--full-auto',
      '-C', opts.cwd,
      fullPrompt,
    ];
  },

  writeMcpConfig(_mcpConfigPath: string, bridgePath: string, agentId: string, serverUrl: string) {
    // Codex uses ~/.codex/config.toml or project-level .codex/ for MCP config
    // We write to the global config location
    const codexConfigDir = path.join(os.homedir(), '.codex');
    if (!fs.existsSync(codexConfigDir)) {
      fs.mkdirSync(codexConfigDir, { recursive: true });
    }

    // Also ensure per-agent MCP config dir exists for cleanup tracking
    if (!fs.existsSync(MCP_CONFIG_DIR)) {
      fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
    }

    // Codex MCP servers are configured in a JSON file referenced by config
    // Write the MCP server config as a JSON file that codex can load
    const mcpServersPath = path.join(MCP_CONFIG_DIR, `${agentId}-codex-mcp.json`);
    const mcpConfig = {
      mcpServers: {
        clustr: {
          command: 'node',
          args: [bridgePath],
          env: {
            CLUSTR_AGENT_ID: agentId,
            CLUSTR_SERVER_URL: serverUrl,
          },
        },
      },
    };
    fs.writeFileSync(mcpServersPath, JSON.stringify(mcpConfig, null, 2));
  },

  cleanupMcpConfig(mcpConfigPath: string, _cwd: string) {
    // Clean up the codex MCP config file
    try { fs.unlinkSync(mcpConfigPath); } catch { /* ignore */ }
    // Also clean up the codex-specific MCP JSON
    const agentId = path.basename(mcpConfigPath, '.json');
    const codexMcpPath = path.join(MCP_CONFIG_DIR, `${agentId}-codex-mcp.json`);
    try { fs.unlinkSync(codexMcpPath); } catch { /* ignore */ }
  },

  setupDialogHandlers(shell: IPty, sendTask: () => void) {
    // Codex exec is non-interactive — just wait for it to settle then the task is already
    // passed as a positional arg, so we just need to call sendTask to mark ready
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    shell.onData((_data: string) => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(sendTask, 1000);
    });

    // Fallback
    setTimeout(sendTask, 10000);
  },

  buildPrompt(opts: PromptOpts): string {
    return buildCollaborationPrompt(opts);
  },
};

export const AGENT_TYPES: Record<ServiceType, AgentTypeConfig> = {
  claude: claudeConfig,
  codex: codexConfig,
};

export function isValidServiceType(service: string): service is ServiceType {
  return service in AGENT_TYPES;
}
