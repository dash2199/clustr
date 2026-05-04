# Clustr

Run multiple AI coding helpers from one local dashboard.

Clustr helps you split work across several AI agents, watch what each one is doing, and let them coordinate with each other. You can keep one agent on the frontend, another on the backend, another on tests or docs, and follow everything from one place.

You can also open your own command terminal for any agent's project folder. That means you can run things like `git status`, `npm test`, or `git pull` yourself without sending those commands to the AI.

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
- **Live work dashboard** — see agents, conversations, file changes, and progress in one place
- **Your own command terminal** — run your own commands in the same project folder without the AI seeing them
- **Claude + Codex support** — run different agent providers side by side
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
