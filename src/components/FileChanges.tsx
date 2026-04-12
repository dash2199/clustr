import { useState, useMemo } from 'react';
import DiffViewer from './DiffViewer';
import type { Agent } from '../hooks/useSocket';
import './FileChanges.css';

export interface FileChange {
  id: number;
  file_path: string;
  change_type: string;
  diff_text: string | null;
  agent_id: string | null;
  created_at: string;
}

interface Props {
  changes: FileChange[];
  agents: Agent[];
  onClear: () => void;
}

function changeTypeLabel(type: string) {
  switch (type) {
    case 'add': return 'A';
    case 'change': return 'M';
    case 'unlink': return 'D';
    default: return '?';
  }
}

function changeTypeColor(type: string) {
  switch (type) {
    case 'add': return '#4ade80';
    case 'change': return '#fbbf24';
    case 'unlink': return '#f87171';
    default: return '#666';
  }
}

export default function FileChanges({ changes, agents, onClear }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const agentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents) map.set(a.id, a.name);
    return map;
  }, [agents]);

  return (
    <div className="file-changes">
      <div className="file-changes-header">
        <span>File Changes ({changes.length})</span>
        {changes.length > 0 && (
          <button className="file-changes-clear-btn" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <div className="file-changes-list">
        {changes.length === 0 && (
          <div className="file-changes-empty">
            No file changes detected yet. Changes will appear here as agents edit files.
          </div>
        )}
        {changes.map((change) => {
          const agentName = change.agent_id ? agentMap.get(change.agent_id) : null;
          return (
            <div key={change.id} className="file-change-item">
              <div
                className="file-change-row"
                onClick={() => setExpandedId(expandedId === change.id ? null : change.id)}
              >
                <span
                  className="file-change-type"
                  style={{ color: changeTypeColor(change.change_type) }}
                >
                  {changeTypeLabel(change.change_type)}
                </span>
                <span className="file-change-path">{change.file_path}</span>
                {agentName && (
                  <span className="file-change-agent" title="Agent that made this change">
                    {agentName}
                  </span>
                )}
                <span className="file-change-time">
                  {new Date(change.created_at).toLocaleTimeString()}
                </span>
                <span className="file-change-expand">
                  {change.diff_text ? (expandedId === change.id ? '\u25BC' : '\u25B6') : ''}
                </span>
              </div>
              {expandedId === change.id && change.diff_text && (
                <DiffViewer diff={change.diff_text} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
