import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const AGENT_ID = process.env.CLUSTR_AGENT_ID || '';
const SERVER_URL = process.env.CLUSTR_SERVER_URL || 'http://127.0.0.1:3100';

async function apiFetch(path: string, options?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err: any) {
    throw new Error(`Clustr server unreachable at ${SERVER_URL}: ${err.message}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(`Clustr API error ${res.status}: ${text.slice(0, 200)}`);
    throw new Error(`Invalid JSON from Clustr API: ${text.slice(0, 200)}`);
  }
}

const server = new McpServer({
  name: 'clustr',
  version: '0.1.0',
});

server.tool(
  'register_agent',
  'Register this agent with the Clustr workspace',
  {
    name: z.string().describe('Agent name'),
    service: z.string().default('claude').describe('Service type'),
    task: z.string().describe('Agent task description'),
  },
  async ({ name, service, task }) => {
    const result = await apiFetch('/api/agents', {
      method: 'POST',
      body: JSON.stringify({ id: AGENT_ID, name, service, task }),
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

server.tool(
  'ping',
  'Send heartbeat to keep this agent alive',
  {},
  async () => {
    const result = await apiFetch(`/api/agents/${AGENT_ID}/ping`, { method: 'POST' });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

server.tool(
  'list_agents',
  'List all agents in the Clustr workspace',
  {},
  async () => {
    const result = await apiFetch('/api/agents');
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

server.tool(
  'send_message',
  'Send a message to another agent',
  {
    to: z.string().describe('Target agent ID or name'),
    content: z.string().describe('Message content'),
  },
  async ({ to, content }) => {
    const result = await apiFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ from: AGENT_ID, to, content }),
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

server.tool(
  'read_messages',
  'Read unread messages for this agent',
  {},
  async () => {
    const result = await apiFetch(`/api/messages/${AGENT_ID}`);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

server.tool(
  'read_context',
  'Read shared context (optionally by key)',
  {
    key: z.string().optional().describe('Context key to read (omit for all)'),
  },
  async ({ key }) => {
    const path = key ? `/api/context/${encodeURIComponent(key)}` : '/api/context';
    const result = await apiFetch(path);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

server.tool(
  'write_context',
  'Write a value to shared context',
  {
    key: z.string().describe('Context key'),
    value: z.string().describe('Context value'),
  },
  async ({ key, value }) => {
    const result = await apiFetch('/api/context', {
      method: 'PUT',
      body: JSON.stringify({ key, value, updatedBy: AGENT_ID }),
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

server.tool(
  'list_prs',
  'List open pull requests with status, reviews, and checks',
  {
    state: z.enum(['open', 'closed', 'merged', 'all']).optional().default('open').describe('PR state filter'),
  },
  async ({ state }) => {
    const prs = await apiFetch(`/api/github/prs?state=${state}`);
    if (!Array.isArray(prs) || prs.length === 0) {
      return { content: [{ type: 'text' as const, text: 'No pull requests found.' }] };
    }
    const summary = prs.map((pr: any) => {
      const checks = (pr.statusCheckRollup || [])
        .map((c: any) => `${c.name}: ${c.conclusion || c.status}`)
        .join(', ');
      return [
        `#${pr.number} ${pr.title}`,
        `  Author: ${pr.author?.login || 'unknown'} | Branch: ${pr.headRefName} → ${pr.baseRefName}`,
        `  State: ${pr.state}${pr.isDraft ? ' (draft)' : ''} | Review: ${pr.reviewDecision || 'none'}`,
        checks ? `  Checks: ${checks}` : null,
        `  URL: ${pr.url}`,
      ].filter(Boolean).join('\n');
    }).join('\n\n');
    return { content: [{ type: 'text' as const, text: summary }] };
  }
);

server.tool(
  'get_pr_detail',
  'Get detailed info about a specific PR including diff summary, comments, and review status',
  {
    pr_number: z.number().describe('Pull request number'),
  },
  async ({ pr_number }) => {
    const detail = await apiFetch(`/api/github/prs/${pr_number}`);
    if (!detail || detail.error) {
      return { content: [{ type: 'text' as const, text: `PR #${pr_number} not found.` }] };
    }
    const reviews = (detail.reviews || []).map((r: any) =>
      `  ${r.author?.login}: ${r.state}${r.body ? ` — "${r.body}"` : ''}`
    ).join('\n');
    const comments = (detail.comments || []).map((c: any) =>
      `  ${c.author?.login}: ${c.body}`
    ).join('\n');
    const checks = (detail.statusCheckRollup || [])
      .map((c: any) => `  ${c.name}: ${c.conclusion || c.status}`)
      .join('\n');
    const lines = [
      `#${detail.number} ${detail.title}`,
      `Author: ${detail.author?.login || 'unknown'} | Branch: ${detail.headRefName} → ${detail.baseRefName}`,
      `State: ${detail.state}${detail.isDraft ? ' (draft)' : ''} | Review: ${detail.reviewDecision || 'none'}`,
      `URL: ${detail.url}`,
      detail.body ? `\nDescription:\n${detail.body}` : null,
      checks ? `\nChecks:\n${checks}` : null,
      reviews ? `\nReviews:\n${reviews}` : null,
      comments ? `\nComments:\n${comments}` : null,
    ].filter(Boolean).join('\n');
    return { content: [{ type: 'text' as const, text: lines }] };
  }
);

server.tool(
  'spawn_agent',
  'Spawn a new agent in the Clustr workspace',
  {
    name: z.string().describe('Name for the new agent'),
    task: z.string().describe('Task for the new agent'),
    cwd: z.string().optional().describe('Working directory for the new agent (defaults to server cwd)'),
    service: z.enum(['claude', 'codex']).optional().default('claude').describe('Agent service type (claude or codex)'),
  },
  async ({ name, task, cwd, service }) => {
    const result = await apiFetch('/api/spawn', {
      method: 'POST',
      body: JSON.stringify({ name, task, cwd, service }),
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP bridge error:', err);
  process.exit(1);
});
