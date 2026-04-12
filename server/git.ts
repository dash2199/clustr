import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function git(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await git(['rev-parse', '--is-inside-work-tree'], cwd);
    return true;
  } catch {
    return false;
  }
}

export async function isRepoDirty(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await git(['status', '--porcelain'], cwd);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function createCheckpoint(cwd: string, agentName: string): Promise<string | null> {
  if (!(await isGitRepo(cwd))) return null;
  if (!(await isRepoDirty(cwd))) {
    const { stdout } = await git(['rev-parse', 'HEAD'], cwd);
    return stdout.trim();
  }

  try {
    await git(['add', '-A'], cwd);
    await git(['commit', '-m', `clustr: checkpoint before ${agentName}`], cwd);
    const { stdout } = await git(['rev-parse', 'HEAD'], cwd);
    return stdout.trim();
  } catch {
    try {
      const { stdout } = await git(['rev-parse', 'HEAD'], cwd);
      return stdout.trim();
    } catch {
      return null;
    }
  }
}

export async function getAgentDiff(cwd: string, checkpointHash: string): Promise<string> {
  if (!(await isGitRepo(cwd))) return '';
  try {
    const { stdout } = await git(['diff', `${checkpointHash}..HEAD`], cwd);
    return stdout;
  } catch {
    return '';
  }
}

export interface BranchInfo {
  name: string;
  lastCommitDate: string;
  lastCommitMessage: string;
  author: string;
  isCurrent: boolean;
  ahead: number;
  behind: number;
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function getDefaultBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await git(['rev-parse', '--verify', '--quiet', 'main'], cwd);
    if (stdout.trim()) return 'main';
  } catch { /* fall through */ }
  try {
    const { stdout } = await git(['rev-parse', '--verify', '--quiet', 'master'], cwd);
    if (stdout.trim()) return 'master';
  } catch { /* fall through */ }
  return 'main';
}

export async function getBranchAheadBehind(cwd: string, branch: string, base?: string): Promise<{ ahead: number; behind: number }> {
  const baseBranch = base || await getDefaultBranch(cwd);
  try {
    const { stdout } = await git(['rev-list', '--left-right', '--count', `${baseBranch}...${branch}`], cwd);
    const [behind, ahead] = stdout.trim().split(/\s+/).map(Number);
    return { ahead: ahead || 0, behind: behind || 0 };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

export async function listBranches(cwd: string): Promise<{ current: string; branches: BranchInfo[] }> {
  if (!(await isGitRepo(cwd))) return { current: '', branches: [] };

  const current = await getCurrentBranch(cwd);
  const defaultBranch = await getDefaultBranch(cwd);

  try {
    const { stdout } = await git([
      'branch', '--sort=-committerdate',
      '--format=%(refname:short)|%(committerdate:iso)|%(subject)|%(authorname)',
    ], cwd);

    const lines = stdout.trim().split('\n').filter(Boolean).slice(0, 30);
    const branches: BranchInfo[] = [];

    for (const line of lines) {
      const [name, date, message, author] = line.split('|');
      if (!name) continue;

      let ahead = 0, behind = 0;
      if (branches.length < 10 && name !== defaultBranch) {
        const ab = await getBranchAheadBehind(cwd, name, defaultBranch);
        ahead = ab.ahead;
        behind = ab.behind;
      }

      branches.push({
        name,
        lastCommitDate: date || '',
        lastCommitMessage: message || '',
        author: author || '',
        isCurrent: name === current,
        ahead,
        behind,
      });
    }

    return { current, branches };
  } catch {
    return { current, branches: [] };
  }
}

export async function rollbackToCheckpoint(cwd: string, checkpointHash: string): Promise<{ success: boolean; message: string }> {
  if (!(await isGitRepo(cwd))) {
    return { success: false, message: 'Not a git repository' };
  }
  try {
    await git(['reset', '--hard', checkpointHash], cwd);
    return { success: true, message: `Rolled back to ${checkpointHash.slice(0, 8)}` };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
}
