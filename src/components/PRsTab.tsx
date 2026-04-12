import { useState, useMemo } from 'react';
import type { PR, PRDetail, BranchInfo } from '../hooks/useGitHub';
import type { Agent } from '../hooks/useSocket';
import './PRsTab.css';

interface Props {
  prs: PR[];
  branches: BranchInfo[];
  currentBranch: string;
  ghAvailable: boolean | null;
  repoInfo: { nameWithOwner: string; url: string } | null;
  agents: Agent[];
  fetchPRDetail: (n: number) => Promise<PRDetail | null>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ciStatus(checks: PR['statusCheckRollup']): { icon: string; cls: string } {
  if (!checks || checks.length === 0) return { icon: '', cls: '' };
  const hasFailure = checks.some(c => c.conclusion === 'FAILURE' || c.conclusion === 'failure');
  if (hasFailure) return { icon: '\u2717', cls: 'failure' };
  const hasPending = checks.some(c => !c.conclusion || c.status === 'IN_PROGRESS' || c.status === 'QUEUED');
  if (hasPending) return { icon: '\u25CB', cls: 'pending' };
  return { icon: '\u2713', cls: 'success' };
}

function reviewLabel(decision: string): { text: string; cls: string } | null {
  switch (decision) {
    case 'APPROVED': return { text: 'Approved', cls: 'approved' };
    case 'CHANGES_REQUESTED': return { text: 'Changes', cls: 'changes_requested' };
    case 'REVIEW_REQUIRED': return { text: 'Review', cls: 'review_required' };
    default: return null;
  }
}

export default function PRsTab({ prs, branches, currentBranch, ghAvailable, repoInfo, agents, fetchPRDetail }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [expandedPR, setExpandedPR] = useState<number | null>(null);
  const [prDetail, setPRDetail] = useState<PRDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(true);

  const filteredPRs = useMemo(() => {
    if (filter === 'all') return prs;
    return prs.filter(p => p.state.toUpperCase() === filter.toUpperCase());
  }, [prs, filter]);

  const agentNames = useMemo(() => new Set(agents.map(a => a.name.toLowerCase())), [agents]);

  const handleExpandPR = async (prNumber: number) => {
    if (expandedPR === prNumber) {
      setExpandedPR(null);
      setPRDetail(null);
      return;
    }
    setExpandedPR(prNumber);
    setPRDetail(null);
    setDetailLoading(true);
    const detail = await fetchPRDetail(prNumber);
    setPRDetail(detail);
    setDetailLoading(false);
  };

  const branchAgentMatch = (branch: BranchInfo): string | null => {
    const lower = branch.name.toLowerCase();
    for (const name of agentNames) {
      if (lower.includes(name)) return name;
    }
    const authorLower = branch.author.toLowerCase();
    for (const name of agentNames) {
      if (authorLower.includes(name)) return name;
    }
    return null;
  };

  return (
    <div className="prs-tab">
      {/* PR Section */}
      <div className="prs-header">
        <div className="prs-header-left">
          <span>Pull Requests ({filteredPRs.length})</span>
          <select
            className="prs-filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="merged">Merged</option>
          </select>
        </div>
        {repoInfo && (
          <a
            className="prs-repo-link"
            href={repoInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => { e.preventDefault(); window.open(repoInfo.url, '_blank'); }}
          >
            {repoInfo.nameWithOwner}
          </a>
        )}
      </div>

      <div className="prs-list">
        {ghAvailable === false && (
          <div className="prs-unavailable">
            GitHub CLI not available.<br />
            Install <code>gh</code> and run <code>gh auth login</code> to see PRs.
          </div>
        )}

        {ghAvailable !== false && filteredPRs.length === 0 && (
          <div className="prs-empty">
            No pull requests found.
          </div>
        )}

        {filteredPRs.map(pr => {
          const status = pr.isDraft ? 'draft' : pr.state.toLowerCase();
          const ci = ciStatus(pr.statusCheckRollup);
          const review = reviewLabel(pr.reviewDecision);
          const isExpanded = expandedPR === pr.number;

          return (
            <div className="pr-item" key={pr.number}>
              <div className="pr-row" onClick={() => handleExpandPR(pr.number)}>
                <span className="pr-expand">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                <span className={`pr-status-badge ${status}`} />
                <span className="pr-number">#{pr.number}</span>
                <span className="pr-title">{pr.title}</span>
                {review && <span className={`pr-review ${review.cls}`}>{review.text}</span>}
                {ci.icon && <span className={`pr-ci ${ci.cls}`}>{ci.icon}</span>}
                <span className="pr-branch" title={pr.headRefName}>{pr.headRefName}</span>
                <span className="pr-author">{pr.author.login}</span>
                <span className="pr-time">{timeAgo(pr.createdAt)}</span>
                <button
                  className="pr-link-btn"
                  title="Open in GitHub"
                  onClick={e => { e.stopPropagation(); window.open(pr.url, '_blank'); }}
                >
                  &#8599;
                </button>
              </div>
              {isExpanded && (
                <div className="pr-detail">
                  {detailLoading && <div className="pr-detail-loading">Loading...</div>}
                  {prDetail && prDetail.number === pr.number && (
                    <>
                      {prDetail.body && (
                        <div className="pr-detail-body">{prDetail.body}</div>
                      )}

                      {prDetail.statusCheckRollup && prDetail.statusCheckRollup.length > 0 && (
                        <>
                          <div className="pr-detail-section-title">Checks</div>
                          <div className="pr-detail-checks">
                            {prDetail.statusCheckRollup.map((check, i) => (
                              <span
                                key={i}
                                className={`pr-check ${check.conclusion?.toLowerCase() === 'success' ? 'success' : check.conclusion?.toLowerCase() === 'failure' ? 'failure' : 'pending'}`}
                              >
                                {check.conclusion?.toLowerCase() === 'success' ? '\u2713' : check.conclusion?.toLowerCase() === 'failure' ? '\u2717' : '\u25CB'}{' '}
                                {check.name}
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      {prDetail.reviews && prDetail.reviews.length > 0 && (
                        <>
                          <div className="pr-detail-section-title">Reviews</div>
                          {prDetail.reviews.map((r, i) => (
                            <div key={i} className="pr-comment">
                              <div className="pr-comment-header">
                                <strong>{r.author.login}</strong> {r.state.toLowerCase().replace('_', ' ')} {timeAgo(r.submittedAt)}
                              </div>
                              {r.body && <div className="pr-comment-body">{r.body}</div>}
                            </div>
                          ))}
                        </>
                      )}

                      {prDetail.comments && prDetail.comments.length > 0 && (
                        <>
                          <div className="pr-detail-section-title">Comments</div>
                          {prDetail.comments.map((c, i) => (
                            <div key={i} className="pr-comment">
                              <div className="pr-comment-header">
                                <strong>{c.author.login}</strong> {timeAgo(c.createdAt)}
                              </div>
                              <div className="pr-comment-body">{c.body}</div>
                            </div>
                          ))}
                        </>
                      )}

                      {(!prDetail.reviews || prDetail.reviews.length === 0) &&
                       (!prDetail.comments || prDetail.comments.length === 0) &&
                       !prDetail.body && (
                        <div className="pr-detail-loading">No details available.</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Branches Section */}
      <div className="branches-section">
        <div className="branches-header" onClick={() => setBranchesOpen(v => !v)}>
          <span>Branches ({branches.length}){currentBranch ? ` \u2014 ${currentBranch}` : ''}</span>
          <span className="branches-toggle">{branchesOpen ? '\u25BC' : '\u25B6'}</span>
        </div>
        {branchesOpen && (
          <div className="branches-list">
            {branches.length === 0 && (
              <div className="prs-empty">No branches found.</div>
            )}
            {branches.map(branch => {
              const agent = branchAgentMatch(branch);
              return (
                <div key={branch.name} className={`branch-item ${branch.isCurrent ? 'current' : ''}`}>
                  <span className="branch-current-marker">{branch.isCurrent ? '\u25CF' : ''}</span>
                  <span className={`branch-name ${branch.isCurrent ? 'current' : ''}`} title={branch.name}>
                    {branch.name}
                  </span>
                  <span className="branch-message">{branch.lastCommitMessage}</span>
                  {agent && <span className="pr-branch">{agent}</span>}
                  <span className="branch-author">{branch.author}</span>
                  <div className="branch-ahead-behind">
                    {branch.ahead > 0 && <span className="branch-badge ahead">{branch.ahead}\u2191</span>}
                    {branch.behind > 0 && <span className="branch-badge behind">{branch.behind}\u2193</span>}
                  </div>
                  <span className="branch-time">{branch.lastCommitDate ? timeAgo(branch.lastCommitDate) : ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
