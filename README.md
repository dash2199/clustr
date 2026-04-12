# Clustr

Run multiple AI coding agents at once and watch them work together from a single dashboard.

Clustr lets you create a team of AI agents, assign them tasks, and let them collaborate — all from your browser. Each agent works independently but can talk to the others, share notes, and coordinate automatically.

## Quick Start

```bash
npx clustr-ai
```

Open [http://localhost:3100](http://localhost:3100) in your browser.

## Prerequisites

- **Node.js 18+**
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CLUSTR_PORT` | `3100` | Server port |
| `CLUSTR_MAX_AGENTS` | `5` | Max concurrent agents |

## How It Works

1. Create AI agents from the dashboard — give each one a name and a task
2. Agents talk to each other automatically — sharing updates, asking questions, and coordinating work
3. A shared notepad lets all agents stay on the same page
4. Watch everything happen live — see your agents, their conversations, and progress in real time

## Security Notes

- **Local only** — The server binds to `127.0.0.1`. Do not expose to untrusted networks without a reverse proxy and authentication.
- **No authentication** — The API has no auth layer. Any process on localhost can control agents.
- **Environment inheritance** — Spawned agents inherit your shell environment (including API keys and tokens). Be mindful of what's in your env.
- **Agent permissions** — Claude agents run with `--dangerously-skip-permissions` for unattended operation. Review the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code) for implications.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
