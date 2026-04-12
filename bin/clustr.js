#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));

// --- Pre-flight checks ---
const nodeVersion = parseInt(process.versions.node, 10);
if (nodeVersion < 18) {
  console.error(`\n  Clustr requires Node.js 18 or later. You have ${process.versions.node}.\n`);
  process.exit(1);
}

function commandExists(cmd) {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(which, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!commandExists('claude')) {
  console.warn('\n  \u26A0 Claude CLI not found. Install it to spawn agents:');
  console.warn('    npm install -g @anthropic-ai/claude-code\n');
}

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(pkg.version);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  Clustr v${pkg.version} — ${pkg.description}

  Usage:
    npx clustr-ai          Start the Clustr workspace
    clustr-ai --help       Show this help message
    clustr-ai --version    Show version number

  Environment variables:
    CLUSTR_PORT            Server port (default: 3100)
    CLUSTR_MAX_AGENTS      Max concurrent agents (default: 5)

  Once running, open http://localhost:3100 in your browser.
`);
  process.exit(0);
}

const bridgePath = path.join(root, 'dist', 'server', 'mcp-stdio-bridge.js');
if (!fs.existsSync(bridgePath)) {
  console.log('Building server...');
  const build = spawn('npm', ['run', 'build:server'], { cwd: root, stdio: 'inherit' });
  build.on('exit', (code) => {
    if (code !== 0) {
      console.error('Server build failed');
      process.exit(1);
    }
    start();
  });
} else {
  start();
}

function start() {
  const clientDir = path.join(root, 'dist', 'client');
  const hasClient = fs.existsSync(path.join(clientDir, 'index.html'));

  const port = process.env.CLUSTR_PORT || '3100';

  const server = spawn('node', [path.join(root, 'dist', 'server', 'index.js')], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      CLUSTR_PORT: port,
      CLUSTR_SERVE_CLIENT: hasClient ? clientDir : '',
    },
  });

  console.log(`\n  Clustr is starting on http://localhost:${port}\n`);

  if (!hasClient) {
    console.log('  (Client not built — run "npm run build:client" for the full UI)');
    console.log('  API is still available at /api/*\n');
  }

  process.on('SIGINT', () => { server.kill('SIGINT'); process.exit(); });
  process.on('SIGTERM', () => { server.kill('SIGTERM'); process.exit(); });

  server.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}
