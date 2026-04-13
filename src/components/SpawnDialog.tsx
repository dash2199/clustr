import { useState } from 'react';
import './SpawnDialog.css';

type Mode = 'spawn' | 'open';
type ServiceType = 'claude' | 'codex';

interface Props {
  onSpawn: (name: string, task: string, cwd?: string, service?: ServiceType) => void;
  onClose: () => void;
  initialMode?: Mode;
  error?: string | null;
}

export default function SpawnDialog({ onSpawn, onClose, initialMode = 'spawn', error }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [task, setTask] = useState('');
  const [cwd, setCwd] = useState('');
  const [service, setService] = useState<ServiceType>('claude');
  const [browsing, setBrowsing] = useState(false);

  const handleBrowse = async () => {
    setBrowsing(true);
    try {
      const res = await fetch('/api/pick-folder', { method: 'POST' });
      const data = await res.json();
      if (data.path) setCwd(data.path);
    } catch { /* user cancelled or error */ }
    setBrowsing(false);
  };

  const handleSubmit = () => {
    if (mode === 'open') {
      if (!cwd.trim()) return;
      const projectName = cwd.trim().split('/').filter(Boolean).pop() || 'project';
      onSpawn(
        name.trim() || projectName,
        task.trim() || `Work on the project at ${cwd.trim()}. Explore the codebase and wait for instructions.`,
        cwd.trim(),
        service,
      );
    } else {
      if (!name.trim() || !task.trim()) return;
      onSpawn(name.trim(), task.trim(), cwd.trim() || undefined, service);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-mode-tabs">
          <button
            className={`dialog-mode-tab ${mode === 'spawn' ? 'active' : ''}`}
            onClick={() => setMode('spawn')}
          >
            Spawn Agent
          </button>
          <button
            className={`dialog-mode-tab ${mode === 'open' ? 'active' : ''}`}
            onClick={() => setMode('open')}
          >
            Open Project
          </button>
        </div>

        <label>
          Agent Service
          <div className="service-selector">
            <button
              type="button"
              className={`service-btn ${service === 'claude' ? 'active' : ''}`}
              onClick={() => setService('claude')}
            >
              Claude
            </button>
            <button
              type="button"
              className={`service-btn ${service === 'codex' ? 'active' : ''}`}
              onClick={() => setService('codex')}
            >
              Codex
            </button>
          </div>
        </label>

        {mode === 'open' ? (
          <>
            <label>
              Project Directory
              <div className="browse-row">
                <input
                  type="text"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="/Users/you/your-project"
                  autoFocus
                />
                <button
                  type="button"
                  className="browse-btn"
                  onClick={handleBrowse}
                  disabled={browsing}
                >
                  {browsing ? '...' : 'Browse'}
                </button>
              </div>
            </label>
            <label>
              Agent Name <span className="optional">(optional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto-detected from path"
              />
            </label>
            <label>
              Initial Task <span className="optional">(optional)</span>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Explore the codebase and wait for instructions..."
                rows={3}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. researcher"
                autoFocus
              />
            </label>
            <label>
              Task
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what this agent should do..."
                rows={4}
              />
            </label>
            <label>
              Working Directory <span className="optional">(optional)</span>
              <div className="browse-row">
                <input
                  type="text"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="e.g. /Users/you/project (leave blank for server cwd)"
                />
                <button
                  type="button"
                  className="browse-btn"
                  onClick={handleBrowse}
                  disabled={browsing}
                >
                  {browsing ? '...' : 'Browse'}
                </button>
              </div>
            </label>
          </>
        )}

        {error && <div className="dialog-error">{error}</div>}
        <div className="dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSubmit}>
            {mode === 'open' ? 'Open' : 'Spawn'}
          </button>
        </div>
      </div>
    </div>
  );
}
