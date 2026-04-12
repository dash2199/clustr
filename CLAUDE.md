# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Clustr

Clustr is a multi-agent workspace that orchestrates multiple Claude Code sessions. It spawns Claude Code instances as PTY processes, gives each agent MCP tools for inter-agent communication, and provides a React web UI for monitoring/controlling the swarm.

## Commands

```bash
npm run dev          # Start both server (tsx watch) and client (vite) concurrently
npm run dev:server   # Server only with hot-reload (tsx watch, port 3100)
npm run dev:client   # Vite dev server only (port 5173, proxies /api and /socket.io to 3100)
npm run build        # Build server then client
npm run build:server # TypeScript compile server/ → dist/server/
npm run build:client # Vite build src/ → dist/client/
npm run start        # Production: run bin/clustr.js (auto-builds server if needed)
```

Environment variables: `CLUSTR_PORT` (default 3100), `CLUSTR_MAX_AGENTS` (default 5).

## Architecture

**Two-process split:** Express+Socket.io backend (`server/`) and React+Vite frontend (`src/`). In dev, Vite proxies API/WebSocket calls to the backend. In production, `bin/clustr.js` serves the built client as static files from the same Express server.

### Server (`server/`)

- **`index.ts`** — Express app, Socket.io setup, REST API routes. Wires together all modules. References `startReaper()` for dead-agent cleanup.
- **`spawner.ts`** — Spawns Claude Code as PTY processes via `node-pty`. Each agent gets a per-agent MCP config file written to `~/.clustr/mcp-configs/`. Manages scrollback buffers (100K chars), auto-navigates Claude's TUI trust/permissions dialogs, then sends the task. Uses `--dangerously-skip-permissions` flag.
- **`broker.ts`** — Message passing between agents. Messages are persisted to SQLite and also injected directly into the target agent's PTY via `notifyAgent()`.
- **`registry.ts`** — Agent registration and heartbeat tracking. Agents not pinging within 60s are considered dead.
- **`context.ts`** — Shared key-value context store. Changes broadcast via Socket.io.
- **`db.ts`** — SQLite (better-sqlite3) with WAL mode. Database at `~/.clustr/clustr.db`. Three tables: `agents`, `messages`, `context`.
- **`mcp-stdio-bridge.ts`** — MCP server (stdio transport) that each spawned Claude Code connects to. Exposes tools: `register_agent`, `ping`, `list_agents`, `send_message`, `read_messages`, `read_context`, `write_context`, `spawn_agent`. Calls back to the Clustr REST API.

### Client (`src/`)

- **`App.tsx`** — Main layout: sidebar (agent list), tabbed main area (Graph/Terminal/Messages/Context), footer message bar.
- **`hooks/useSocket.ts`** — Single Socket.io connection, maintains real-time state for agents, messages, and context entries.
- **Components:** `AgentGraph` (ReactFlow-based node graph), `AgentNode`, `AgentList`, `Terminal` (xterm.js), `MessageFeed`, `ContextViewer`, `SpawnDialog`.

### Data flow

1. User spawns agent via UI → `POST /api/spawn` → `spawner.spawnAgent()` creates PTY running `claude` CLI with MCP config
2. Claude Code connects to its per-agent MCP bridge (stdio) → bridge calls Clustr REST API
3. Agents communicate: MCP tool `send_message` → broker persists to SQLite + injects text into target PTY + emits Socket.io event → UI updates
4. All state changes (agents, messages, context) emit Socket.io events for real-time UI updates

### Key paths

- `~/.clustr/` — Runtime directory: `clustr.db` (SQLite), `mcp-configs/` (per-agent MCP JSON files, cleaned up on agent exit)
- `bin/clustr.js` — Production entry point, auto-builds if needed
- `dist/server/` — Compiled server JS (tsconfig.server.json, rootDir=server/)
- `dist/client/` — Vite build output

## TypeScript

Two tsconfig files: `tsconfig.json` (IDE/type-checking, noEmit) and `tsconfig.server.json` (server compilation to dist/server/). Both target ES2022 with ESNext modules and bundler resolution. Server imports use `.js` extensions (ESM convention).
