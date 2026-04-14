import { spawn, ChildProcess } from 'child_process';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let tunnelProcess: ChildProcess | null = null;
let tunnelUrl: string | null = null;
let tunnelUrlResolve: ((url: string | null) => void) | null = null;

export function getTunnelUrl(): string | null {
  return tunnelUrl;
}

async function isCloudflaredAvailable(): Promise<boolean> {
  try {
    await execFileAsync('which', ['cloudflared']);
    return true;
  } catch {
    return false;
  }
}

export async function startTunnel(port: number): Promise<string | null> {
  if (!(await isCloudflaredAvailable())) {
    return null;
  }

  return new Promise((resolve) => {
    tunnelUrlResolve = resolve;

    tunnelProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      // cloudflared prints the URL to stderr in the format: https://xxx.trycloudflare.com
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && tunnelUrlResolve) {
        tunnelUrl = match[0];
        tunnelUrlResolve(tunnelUrl);
        tunnelUrlResolve = null;
      }
    };

    tunnelProcess.stdout?.on('data', handleOutput);
    tunnelProcess.stderr?.on('data', handleOutput);

    tunnelProcess.on('exit', () => {
      tunnelUrl = null;
      tunnelProcess = null;
      if (tunnelUrlResolve) {
        tunnelUrlResolve(null);
        tunnelUrlResolve = null;
      }
    });

    // Timeout after 15 seconds if URL not found
    setTimeout(() => {
      if (tunnelUrlResolve) {
        tunnelUrlResolve(null);
        tunnelUrlResolve = null;
      }
    }, 15_000);
  });
}

export function stopTunnel(): void {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    tunnelUrl = null;
  }
}
