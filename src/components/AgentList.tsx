import type { Agent } from '../hooks/useSocket';
import './AgentList.css';

interface Props {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (agent: Agent) => void;
  onKill: (id: string) => void;
  onRemove: (id: string) => void;
  onRestart: (agent: Agent) => void;
}

const statusColor: Record<string, string> = {
  running: 'var(--green)',
  starting: 'var(--yellow)',
  idle: 'var(--yellow)',
  done: 'var(--text-muted)',
  dead: 'var(--red)',
};

export default function AgentList({ agents, selectedId, onSelect, onKill, onRemove, onRestart }: Props) {
  return (
    <div className="agent-list">
      <div className="agent-list-header">Agents ({agents.length})</div>
      {agents.length === 0 && (
        <div className="agent-list-empty">No agents running</div>
      )}
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`agent-item ${agent.id === selectedId ? 'selected' : ''}`}
          onClick={() => onSelect(agent)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(agent);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="agent-item-header">
            <span
              className="status-dot"
              style={{ background: statusColor[agent.status] || 'var(--text-muted)' }}
            />
            <span className="agent-name">{agent.name}</span>
            <span className={`agent-service-badge service-${agent.service || 'claude'}`}>
              {agent.service || 'claude'}
            </span>
            {agent.total_cost > 0 && (
              <span className="agent-cost">${agent.total_cost.toFixed(4)}</span>
            )}
            <span className="agent-status">{agent.status}</span>
          </div>
          <div className="agent-task">{agent.task}</div>
          {(agent.status === 'running' || agent.status === 'starting') && (
            <div className="agent-running-actions">
              <button
                className="stop-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onKill(agent.id);
                }}
              >
                Stop
              </button>
            </div>
          )}
          {(agent.status === 'done' || agent.status === 'dead') && (
            <div className="agent-done-actions">
              <button
                className="restart-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestart(agent);
                }}
              >
                Restart
              </button>
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(agent.id);
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
