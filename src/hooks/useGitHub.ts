import { useEffect, useState, useCallback, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';

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

export interface BranchInfo {
  name: string;
  lastCommitDate: string;
  lastCommitMessage: string;
  author: string;
  isCurrent: boolean;
  ahead: number;
  behind: number;
}

export function useGitHub(socket: RefObject<Socket | null>) {
  const [prs, setPRs] = useState<PR[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [ghAvailable, setGhAvailable] = useState<boolean | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ nameWithOwner: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/github/status')
      .then(r => r.json())
      .then(data => {
        setGhAvailable(data.available);
        setRepoInfo(data.repo || null);
      })
      .catch(() => setGhAvailable(false));

    fetch('/api/github/prs?state=all')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPRs(data); })
      .catch(() => {});

    fetch('/api/git/branches')
      .then(r => r.json())
      .then(data => {
        if (data.current) setCurrentBranch(data.current);
        if (Array.isArray(data.branches)) setBranches(data.branches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const onPRs = (data: PR[]) => {
      if (Array.isArray(data)) setPRs(data);
    };
    const onBranches = (data: { current: string; branches: BranchInfo[] }) => {
      if (data.current) setCurrentBranch(data.current);
      if (Array.isArray(data.branches)) setBranches(data.branches);
    };

    s.on('github:prs:updated', onPRs);
    s.on('git:branches:updated', onBranches);

    return () => {
      s.off('github:prs:updated', onPRs);
      s.off('git:branches:updated', onBranches);
    };
  }, [socket]);

  const fetchPRDetail = useCallback(async (prNumber: number): Promise<PRDetail | null> => {
    try {
      const res = await fetch(`/api/github/prs/${prNumber}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  return { prs, branches, currentBranch, ghAvailable, repoInfo, loading, fetchPRDetail };
}
