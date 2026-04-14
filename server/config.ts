import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CLUSTR_DIR = path.join(os.homedir(), '.clustr');
const CONFIG_PATH = path.join(CLUSTR_DIR, 'config.json');

interface ClusterConfig {
  authToken: string;
}

let cached: ClusterConfig | null = null;

export function getConfig(): ClusterConfig {
  if (cached) return cached;

  if (!fs.existsSync(CLUSTR_DIR)) {
    fs.mkdirSync(CLUSTR_DIR, { recursive: true });
  }

  let config: ClusterConfig;
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
      config = { authToken: '' };
    }
  } else {
    config = { authToken: '' };
  }

  if (!config.authToken) {
    config.authToken = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
  }

  cached = config;
  return cached;
}
