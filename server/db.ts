import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

const CLUSTR_DIR = path.join(os.homedir(), '.clustr');
if (!fs.existsSync(CLUSTR_DIR)) {
  fs.mkdirSync(CLUSTR_DIR, { recursive: true });
}

const DB_PATH = path.join(CLUSTR_DIR, 'clustr.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    service TEXT DEFAULT 'claude',
    task TEXT,
    pid INTEGER,
    status TEXT DEFAULT 'starting',
    current_task TEXT,
    last_seen TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    checkpoint_hash TEXT,
    agent_cwd TEXT,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS context (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations for new columns on existing tables
const migrations = [
  'ALTER TABLE agents ADD COLUMN checkpoint_hash TEXT',
  'ALTER TABLE agents ADD COLUMN agent_cwd TEXT',
  'ALTER TABLE agents ADD COLUMN total_tokens INTEGER DEFAULT 0',
  'ALTER TABLE agents ADD COLUMN total_cost REAL DEFAULT 0',
];
for (const sql of migrations) {
  try { db.prepare(sql).run(); } catch { /* column already exists */ }
}

// --- Agent queries ---

const stmtInsertAgent = db.prepare(
  `INSERT INTO agents (id, name, service, task, pid, status) VALUES (?, ?, ?, ?, ?, 'starting')`
);
export function insertAgent(id: string, name: string, service: string, task: string, pid: number | null) {
  stmtInsertAgent.run(id, name, service, task, pid);
}

export function updateAgent(id: string, fields: Partial<{ status: string; last_seen: string; current_task: string; pid: number; checkpoint_hash: string; agent_cwd: string; total_tokens: number; total_cost: number }>) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE agents SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

const stmtDeleteAgent = db.prepare('DELETE FROM agents WHERE id = ?');
export function deleteAgent(id: string) {
  stmtDeleteAgent.run(id);
}

const stmtGetAgent = db.prepare(`SELECT * FROM agents WHERE id = ?`);
export function getAgent(id: string) {
  return stmtGetAgent.get(id) as Record<string, unknown> | undefined;
}

const stmtGetAgentByName = db.prepare(`SELECT * FROM agents WHERE name = ? AND status != 'dead' ORDER BY created_at DESC LIMIT 1`);
export function getAgentByName(name: string) {
  return stmtGetAgentByName.get(name) as Record<string, unknown> | undefined;
}

const stmtMarkStaleAgentsDone = db.prepare(
  `UPDATE agents SET status = 'done' WHERE status IN ('running', 'starting')`
);
export function markStaleAgentsDone() {
  stmtMarkStaleAgentsDone.run();
}

const stmtListAll = db.prepare(`SELECT * FROM agents ORDER BY created_at DESC`);
const stmtListByStatus = db.prepare(`SELECT * FROM agents WHERE status = ? ORDER BY created_at DESC`);
export function listAgents(status?: string) {
  if (status) return stmtListByStatus.all(status) as Record<string, unknown>[];
  return stmtListAll.all() as Record<string, unknown>[];
}

// --- Message queries ---

const stmtInsertMessage = db.prepare(
  `INSERT INTO messages (from_agent, to_agent, content) VALUES (?, ?, ?)`
);
export function insertMessage(from: string, to: string, content: string) {
  const info = stmtInsertMessage.run(from, to, content);
  return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid) as Record<string, unknown>;
}

export function getUnreadMessages(agentId: string) {
  const msgs = db.prepare(
    `SELECT * FROM messages WHERE to_agent = ? AND read = 0 ORDER BY created_at ASC`
  ).all(agentId) as Record<string, unknown>[];
  if (msgs.length > 0) {
    db.prepare(`UPDATE messages SET read = 1 WHERE to_agent = ? AND read = 0`).run(agentId);
  }
  return msgs;
}

const stmtClearMessages = db.prepare('DELETE FROM messages');
export function clearAllMessages() {
  stmtClearMessages.run();
}

const stmtAllMessages = db.prepare(`SELECT * FROM messages ORDER BY created_at DESC LIMIT ?`);
export function getAllMessages(limit = 100) {
  return stmtAllMessages.all(limit) as Record<string, unknown>[];
}

// --- Context queries ---

export function getContext(key?: string) {
  if (key) {
    return db.prepare(`SELECT * FROM context WHERE key = ?`).get(key) as Record<string, unknown> | undefined;
  }
  return db.prepare(`SELECT * FROM context ORDER BY key`).all() as Record<string, unknown>[];
}

const stmtDeleteContext = db.prepare('DELETE FROM context WHERE key = ?');
export function deleteContextEntry(key: string) {
  stmtDeleteContext.run(key);
}

const stmtUpsertContext = db.prepare(
  `INSERT INTO context (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
);
export function setContext(key: string, value: string, updatedBy: string) {
  stmtUpsertContext.run(key, value, updatedBy);
}

export default db;
