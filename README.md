# Clustr

Local multi-agent workspace for AI coding.

Clustr lets you run Claude Code and Codex agents side by side, monitor them from a live dashboard, and give them MCP tools to collaborate across your codebase. Agents can message each other, share context, spawn teammates, track file changes, and coordinate work across frontend, backend, tests, docs, and services.

Website: [hiclustrmvp.vercel.app](https://hiclustrmvp.vercel.app/)

## Quick Start

```bash
npx clustr-ai
```

Open [http://localhost:3100](http://localhost:3100) in your browser.

## Prerequisites

- **Node.js 18+**
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`
- **OpenAI Codex CLI** — optional, for Codex agents

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CLUSTR_PORT` | `3100` | Server port |
| `CLUSTR_MAX_AGENTS` | `5` | Max concurrent agents |
| `CLUSTR_TUNNEL` | unset | Set to `1` to start a Cloudflare tunnel for mobile/remote access |

## Why Clustr

Most AI coding tools assume one agent should understand the whole project. Real engineering work is split across services, repos, tests, docs, and owners.

Clustr gives each agent a focused workspace and a shared coordination layer:

- **Multi-agent orchestration** — spawn multiple coding agents and watch them work in parallel
- **Inter-agent messaging** — agents can ask each other questions and hand off findings
- **Shared context** — one agent can write discoveries that every other agent can read
- **Live terminal dashboard** — inspect PTYs, logs, messages, file changes, and agent status
- **Claude + Codex support** — run different agent providers side by side
- **Git checkpoints** — checkpoint before agent work and roll back if needed
- **Mobile access** — pair a phone with a QR code and monitor your swarm away from your desk

## How It Works

1. Create AI agents from the dashboard — give each one a name and a task
2. Agents talk to each other automatically — sharing updates, asking questions, and coordinating work
3. A shared notepad lets all agents stay on the same page
4. Watch everything happen live — see your agents, their conversations, and progress in real time

## Security Notes

- **Local-first** — Clustr runs on your machine and stores runtime state under `~/.clustr/`.
- **Remote auth token** — non-local API and Socket.io access requires the generated auth token.
- **Pairing endpoint is local-only** — the QR pairing details are only served from localhost.
- **Environment inheritance** — Spawned agents inherit your shell environment (including API keys and tokens). Be mindful of what's in your env.
- **Agent permissions** — Claude agents run with `--dangerously-skip-permissions` for unattended operation. Review the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code) for implications.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
