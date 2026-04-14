import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { registerAgent, pingAgent, deregisterAgent, getActiveAgents } from './registry.js';
import { initBroker, sendMessage, readMessages, broadcastMessage, getAllMessages } from './broker.js';
import { initContext, readContext, writeContext, removeContext } from './context.js';
import { initCrewMd, readCrewMd, writeCrewMd } from './crewmd.js';
import { initFileWatcher, startWatching, getFileChanges, clearFileChanges } from './filewatcher.js';
import { getAgentDiff, rollbackToCheckpoint, listBranches } from './git.js';
import { isGhAvailable, getRepoInfo, getRepoPRs, getPRDetail } from './github.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { getConfig } from './config.js';
import { generatePairInfo } from './qr.js';
import { startTunnel, stopTunnel, getTunnelUrl } from './tunnel.js';

const execFileAsync = promisify(execFile);
import { initSpawner, spawnAgent, killAgent, writeToAgent, resizeAgent, getAgentScrollback } from './spawner.js';
import { getAgent, getAgentByName, updateAgent, deleteAgent, clearAllMessages, markStaleAgentsDone } from './db.js';

const PORT = parseInt(process.env.CLUSTR_PORT || '3100', 10);
const config = getConfig();

// Start Cloudflare tunnel if requested
if (process.env.CLUSTR_TUNNEL === '1') {
  startTunnel(PORT).then((url) => {
    if (url) console.log(`Clustr tunnel active: ${url}`);
    else console.log('Clustr tunnel: cloudflared not found or timed out');
  });
}

process.on('SIGINT', () => { stopTunnel(); process.exit(0); });
process.on('SIGTERM', () => { stopTunnel(); process.exit(0); });

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const clientDirEnv = process.env.CLUSTR_SERVE_CLIENT;
const clientDir = clientDirEnv === 'true'
  ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client')
  : clientDirEnv || '';
if (clientDir) {
  app.use(express.static(clientDir));
}

// Serve the pairing page (unauthenticated — it's the entry point for new devices)
const connectHtmlPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'connect.html');
const connectHtmlDevPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'connect.html');
const connectHtml = fs.existsSync(connectHtmlPath) ? connectHtmlPath
  : fs.existsSync(connectHtmlDevPath) ? connectHtmlDevPath : null;

app.get('/connect', (_req, res) => {
  if (connectHtml) res.sendFile(connectHtml);
  else res.status(404).send('Connect page not found');
});

// Pairing info endpoint — only accessible from localhost for security
app.get('/api/pair', async (req, res) => {
  const isLocal = req.socket.localAddress === '127.0.0.1'
    || req.socket.localAddress === '::1'
    || req.socket.localAddress === '::ffff:127.0.0.1';
  if (!isLocal) {
    res.status(403).json({ error: 'Pairing info only accessible from localhost' });
    return;
  }
  const info = await generatePairInfo(PORT, config.authToken, getTunnelUrl());
  res.json(info);
});

// Auth middleware for all /api routes (except /api/pair which is handled above)
app.use('/api', (req, res, next) => {
  if (req.path === '/pair') return next();
  const isLocal = req.socket.localAddress === '127.0.0.1'
    || req.socket.localAddress === '::1'
    || req.socket.localAddress === '::ffff:127.0.0.1';
  if (isLocal) return next();
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  if (token !== config.authToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: '*' },
});

// Socket.io auth middleware
io.use((socket, next) => {
  const token = (socket.handshake.auth as Record<string, string>)?.token
    || (socket.handshake.query as Record<string, string>)?.token;
  if (token !== config.authToken) {
    return next(new Error('Unauthorized'));
  }
  next();
});

markStaleAgentsDone();

initBroker(io);
initContext(io);
initCrewMd(io);
initFileWatcher(io);
initSpawner(io, () => {
  io.emit('agents:updated', getActiveAgents());
});

// --- Agent routes ---

app.post('/api/agents', (req, res) => {
  try {
    const { id, name, service = 'claude', task } = req.body;
    if (id) {
      updateAgent(id, { status: 'running' });
      io.emit('agents:updated', getActiveAgents());
      res.json({ id, status: 'registered' });
    } else {
      const agentId = registerAgent(name, service, task, null);
      io.emit('agents:updated', getActiveAgents());
      res.json({ id: agentId, status: 'registered' });
    }
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/agents', (_req, res) => {
  res.json(getActiveAgents());
});

app.post('/api/agents/:id/ping', (req, res) => {
  pingAgent(req.params.id);
  res.json({ status: 'ok' });
});

app.delete('/api/agents/:id', (req, res) => {
  deregisterAgent(req.params.id);
  killAgent(req.params.id);
  io.emit('agents:updated', getActiveAgents());
  res.json({ status: 'deregistered' });
});

app.delete('/api/agents/:id/remove', (req, res) => {
  killAgent(req.params.id);
  deleteAgent(req.params.id);
  io.emit('agents:updated', getActiveAgents());
  res.json({ status: 'removed' });
});

// --- Message routes ---

app.post('/api/messages', (req, res) => {
  try {
    const { from, to, content } = req.body;
    if (to === 'all' || to === '*') {
      const msgs = broadcastMessage(from, content);
      res.json(msgs);
    } else {
      let targetId = to;
      const agent = getAgent(to);
      if (!agent) {
        const byName = getAgentByName(to);
        if (byName) targetId = byName.id as string;
      }
      const msg = sendMessage(from, targetId, content);
      res.json(msg);
    }
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/messages/:agentId', (req, res) => {
  res.json(readMessages(req.params.agentId));
});

app.get('/api/messages', (_req, res) => {
  res.json(getAllMessages());
});

app.delete('/api/messages', (_req, res) => {
  clearAllMessages();
  io.emit('messages:all', []);
  res.json({ status: 'cleared' });
});

// --- Context routes ---

app.get('/api/context/:key?', (req, res) => {
  const key = (req.params as Record<string, string>).key;
  res.json(readContext(key));
});

app.put('/api/context', (req, res) => {
  try {
    const { key, value, updatedBy } = req.body;
    writeContext(key, value, updatedBy);
    res.json({ status: 'ok' });
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/context/:key', (req, res) => {
  try {
    removeContext(req.params.key);
    res.json({ status: 'removed' });
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- CLUSTR.md routes ---

app.get('/api/crewmd', (_req, res) => {
  res.json({ content: readCrewMd() });
});

app.put('/api/crewmd', (req, res) => {
  try {
    const { content } = req.body;
    writeCrewMd(content);
    res.json({ status: 'ok' });
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- Cost route ---

app.get('/api/agents/:id/cost', (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  res.json({ total_tokens: agent.total_tokens || 0, total_cost: agent.total_cost || 0 });
});

// --- Git routes ---

app.get('/api/agents/:id/diff', async (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent || !agent.checkpoint_hash || !agent.agent_cwd) {
    res.json({ diff: '' });
    return;
  }
  const diff = await getAgentDiff(agent.agent_cwd as string, agent.checkpoint_hash as string);
  res.json({ diff });
});

app.post('/api/agents/:id/rollback', async (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent || !agent.checkpoint_hash || !agent.agent_cwd) {
    res.status(400).json({ error: 'No checkpoint available for this agent' });
    return;
  }
  const result = await rollbackToCheckpoint(agent.agent_cwd as string, agent.checkpoint_hash as string);
  if (result.success) {
    res.json({ status: 'rolled_back', message: result.message });
  } else {
    res.status(400).json({ error: result.message });
  }
});

// --- File changes routes ---

app.get('/api/file-changes', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(getFileChanges(limit));
});

app.delete('/api/file-changes', (_req, res) => {
  clearFileChanges();
  io.emit('file:changes:cleared');
  res.json({ status: 'cleared' });
});

// --- GitHub PR routes ---

function resolveProjectCwd(): string {
  const agents = getActiveAgents();
  const withCwd = agents.find((a: { agent_cwd?: string | null }) => a.agent_cwd);
  return (withCwd?.agent_cwd as string) || process.cwd();
}

app.get('/api/github/status', async (_req, res) => {
  const cwd = resolveProjectCwd();
  const available = await isGhAvailable(cwd);
  const repo = available ? await getRepoInfo(cwd) : null;
  res.json({ available, repo });
});

app.get('/api/github/prs', async (req, res) => {
  const cwd = resolveProjectCwd();
  const state = (req.query.state as string) || 'all';
  const prs = await getRepoPRs(cwd, state);
  res.json(prs);
});

app.get('/api/github/prs/:number', async (req, res) => {
  const cwd = resolveProjectCwd();
  const prNumber = parseInt(req.params.number, 10);
  if (isNaN(prNumber)) {
    res.status(400).json({ error: 'Invalid PR number' });
    return;
  }
  const detail = await getPRDetail(cwd, prNumber);
  if (detail) {
    res.json(detail);
  } else {
    res.status(404).json({ error: 'PR not found' });
  }
});

// --- Git branch routes ---

app.get('/api/git/branches', async (_req, res) => {
  const cwd = resolveProjectCwd();
  const result = await listBranches(cwd);
  res.json(result);
});

// --- Folder picker route ---

app.post('/api/pick-folder', async (_req, res) => {
  try {
    const platform = os.platform();
    let folderPath = '';

    if (platform === 'darwin') {
      const { stdout } = await execFileAsync('osascript', [
        '-e', 'set chosenFolder to choose folder with prompt "Select project directory"',
        '-e', 'return POSIX path of chosenFolder',
      ]);
      folderPath = stdout.trim().replace(/\/$/, '');
    } else if (platform === 'win32') {
      const { stdout } = await execFileAsync('powershell', [
        '-NoProfile', '-Command',
        `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Select project directory'; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath } else { '' }`,
      ]);
      folderPath = stdout.trim();
    } else {
      const { stdout } = await execFileAsync('zenity', [
        '--file-selection', '--directory', '--title=Select project directory',
      ]);
      folderPath = stdout.trim();
    }

    if (folderPath) {
      res.json({ path: folderPath });
    } else {
      res.json({ path: null, cancelled: true });
    }
  } catch {
    res.json({ path: null, cancelled: true });
  }
});

// --- Image upload route ---

const UPLOADS_DIR = path.join(os.homedir(), '.clustr', 'uploads');

app.post('/api/upload-image', (req, res) => {
  try {
    const { data, mimeType } = req.body;
    if (!data || !mimeType) {
      res.status(400).json({ error: 'Missing data or mimeType' });
      return;
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const ext = (mimeType.split('/')[1] || 'png').replace(/[^a-zA-Z0-9]/g, '') || 'png';
    const filename = `paste-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    res.json({ path: filePath, filename });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Spawn route ---

app.post('/api/spawn', (req, res) => {
  try {
    const { name, task, cwd, service } = req.body;
    const agentCwd = cwd || process.cwd();
    startWatching(agentCwd);
    const id = spawnAgent(name, task, { cwd, service });
    io.emit('agents:updated', getActiveAgents());
    res.json({ id, status: 'spawning' });
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- Send text to agent PTY (typed into the terminal) ---

app.post('/api/agents/:id/message', (req, res) => {
  const { content } = req.body;
  const sent = writeToAgent(req.params.id, content + '\r');
  if (sent) {
    res.json({ status: 'sent' });
  } else {
    res.status(404).json({ error: 'Agent not running' });
  }
});

// --- Get scrollback buffer for late-joining clients ---

app.get('/api/agents/:id/scrollback', (req, res) => {
  res.json({ scrollback: getAgentScrollback(req.params.id) });
});

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.emit('agents:updated', getActiveAgents());
  socket.emit('messages:all', getAllMessages());
  socket.emit('crewmd:updated', readCrewMd());

  // Client writes keystrokes to an agent's PTY
  socket.on('agent:input', (agentId: string, data: string) => {
    writeToAgent(agentId, data);
  });

  // Client requests terminal resize
  socket.on('agent:resize', (agentId: string, cols: number, rows: number) => {
    resizeAgent(agentId, cols, rows);
  });
});

if (clientDir) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

// --- GitHub/Git polling for real-time updates ---

let lastPRsHash = '';
let lastBranchesHash = '';

setInterval(async () => {
  if (io.engine.clientsCount === 0) return;
  const cwd = resolveProjectCwd();

  try {
    const prs = await getRepoPRs(cwd, 'all');
    const prsHash = JSON.stringify(prs.map(p => `${p.number}:${p.state}:${p.reviewDecision}`));
    if (prsHash !== lastPRsHash) {
      lastPRsHash = prsHash;
      io.emit('github:prs:updated', prs);
    }
  } catch { /* ignore */ }

  try {
    const branchData = await listBranches(cwd);
    const branchesHash = JSON.stringify(branchData.branches.map(b => b.name));
    if (branchesHash !== lastBranchesHash) {
      lastBranchesHash = branchesHash;
      io.emit('git:branches:updated', branchData);
    }
  } catch { /* ignore */ }
}, 30_000);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Clustr server running on http://localhost:${PORT}`);
  console.log(`Connect from phone: http://localhost:${PORT}/connect`);
  console.log(`Auth token: ${config.authToken}`);
});
