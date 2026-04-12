# Contributing to Clustr

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/dash2199/clustr.git
cd clustr
npm install
npm run dev
```

This starts both the Express server (port 3100) and Vite dev server (port 5173).

### Prerequisites

- Node.js 18+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

## Project Structure

- `server/` — Express + Socket.io backend (TypeScript, compiled via esbuild)
- `src/` — React + Vite frontend
- `bin/clustr.js` — Production entry point
- Two tsconfig files: `tsconfig.json` (IDE) and `tsconfig.server.json` (server build)
- Server imports use `.js` extensions (ESM convention)

## Making Changes

1. Fork the repo and create a branch: `git checkout -b your-name/description`
2. Make your changes
3. Run `npm run build` to verify both server and client compile
4. Commit with a clear message describing what and why
5. Open a pull request against `main`

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a description of what changed and why
- Ensure `npm run build` passes before submitting

## Reporting Issues

Open an issue at [github.com/dash2199/clustr/issues](https://github.com/dash2199/clustr/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
