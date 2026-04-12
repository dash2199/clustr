import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface PR {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  headRefName: string;
  baseRefName: string;
  createdAt: string;
  url: string;
  body: string;
  isDraft: boolean;
  reviewDecision: string;
  statusCheckRollup: Array<{ name: string; status: string; conclusion: string }>;
}

export interface PRDetail extends PR {
  reviews: Array<{ author: { login: string }; body: string; state: string; submittedAt: string }>;
  comments: Array<{ author: { login: string }; body: string; createdAt: string }>;
}

async function ghCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('gh', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

export async function isGhAvailable(cwd: string): Promise<boolean> {
  try {
    await ghCli(['auth', 'status'], cwd);
    return true;
  } catch {
    return false;
  }
}

export async function getRepoInfo(cwd: string): Promise<{ nameWithOwner: string; url: string } | null> {
  try {
    const { stdout } = await ghCli(['repo', 'view', '--json', 'nameWithOwner,url'], cwd);
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

const PR_FIELDS = 'number,title,state,author,headRefName,baseRefName,createdAt,url,body,isDraft,reviewDecision,statusCheckRollup';

export async function getRepoPRs(cwd: string, state: string = 'all'): Promise<PR[]> {
  try {
    const args = ['pr', 'list', '--state', state, '--json', PR_FIELDS, '--limit', '50'];
    const { stdout } = await ghCli(args, cwd);
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}

const PR_DETAIL_FIELDS = PR_FIELDS + ',reviews,comments';

export async function getPRDetail(cwd: string, prNumber: number): Promise<PRDetail | null> {
  try {
    const { stdout } = await ghCli(['pr', 'view', String(prNumber), '--json', PR_DETAIL_FIELDS], cwd);
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}
