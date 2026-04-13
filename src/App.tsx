import { useState, useCallback, useEffect } from 'react';
import { useSocket, type Agent } from './hooks/useSocket';
import AgentList from './components/AgentList';
import AgentGraph from './components/AgentGraph';
import Terminal from './components/Terminal';
import MultiTerminal from './components/MultiTerminal';
import MessageFeed from './components/MessageFeed';
import ContextViewer from './components/ContextViewer';
import FileChanges from './components/FileChanges';
import PRsTab from './components/PRsTab';
import CrewMdEditor from './components/CrewMdEditor';
import { useGitHub } from './hooks/useGitHub';
import SpawnDialog from './components/SpawnDialog';
import ClustrLogo from './components/ClustrLogo';
import './App.css';

type Tab = 'graph' | 'terminal' | 'messages' | 'context' | 'files' | 'prs' | 'crewmd';
type DialogMode = 'spawn' | 'open';

export default function App() {
  const { socket, agents, messages, contextEntries, crewMd, setCrewMd, fileChanges } = useSocket();
  const { prs, branches, currentBranch, ghAvailable, repoInfo, fetchPRDetail } = useGitHub(socket);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;
  const [activeTab, setActiveTab] = useState<Tab>('graph');
  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('spawn');
  const [messageInput, setMessageInput] = useState('');
  const [messageTarget, setMessageTarget] = useState('all');
  const [terminalView, setTerminalView] = useState<'multi' | 'single'>('multi');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSpawn = useCallback(async (name: string, task: string, cwd?: string, service?: string) => {
    try {
      const res = await fetch('/api/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, task, cwd, service: service || 'claude' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to spawn agent: ${data.error || 'Unknown error'}`);
        return;
      }
      setShowSpawnDialog(false);
    } catch (err: any) {
      alert(`Failed to spawn agent: ${err.message}`);
    }
  }, []);

  const handleKill = useCallback(async (id: string) => {
    await fetch(`/api/agents/${id}`, { method: 'DELETE' });
  }, []);

  const handleRemove = useCallback(async (id: string) => {
    await fetch(`/api/agents/${id}/remove`, { method: 'DELETE' });
    if (selectedAgentId === id) setSelectedAgentId(null);
  }, [selectedAgentId]);

  const handleRollback = useCallback(async (id: string) => {
    await fetch(`/api/agents/${id}/rollback`, { method: 'POST' });
  }, []);

  const handleRestart = useCallback(async (agent: Agent) => {
    await fetch(`/api/agents/${agent.id}/remove`, { method: 'DELETE' });
    const res = await fetch('/api/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: agent.name,
        task: agent.task,
        cwd: agent.agent_cwd || undefined,
        service: agent.service || 'claude',
      }),
    });
    const data = await res.json();
    if (data.id) {
      setSelectedAgentId(data.id);
      setActiveTab('terminal');
    }
  }, []);

  const handleRemoveContext = useCallback(async (key: string) => {
    await fetch(`/api/context/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;

    const target = messageTarget;
    const content = messageInput;
    setMessageInput('');

    if (target !== 'all') {
      await fetch(`/api/agents/${target}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }).catch(() => {});

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'user', to: target, content }),
      });
    } else {
      const running = agents.filter(a => a.status === 'running');
      await Promise.all(
        running.map(a =>
          fetch(`/api/agents/${a.id}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          }).catch(() => {})
        )
      );

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'user', to: 'all', content }),
      });
    }
  }, [messageInput, messageTarget, agents]);

  const handleClearMessages = useCallback(async () => {
    await fetch('/api/messages', { method: 'DELETE' });
  }, []);

  const handleClearFileChanges = useCallback(async () => {
    await fetch('/api/file-changes', { method: 'DELETE' });
  }, []);

  const handleSelectFromGraph = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id);
    setActiveTab('terminal');
  }, []);

  const openDialog = useCallback((mode: DialogMode) => {
    setDialogMode(mode);
    setShowSpawnDialog(true);
  }, []);

  useEffect(() => {
    const tabKeys: Tab[] = ['graph', 'terminal', 'files', 'prs', 'messages', 'context', 'crewmd'];

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      const isTerminal = target.closest('.xterm');
      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        setShowSpawnDialog(false);
        return;
      }

      const isTerminalNavShortcut = mod && (e.key === '[' || e.key === ']' || e.key === '\\');

      if (isTerminal && isTerminalNavShortcut) {
        e.stopPropagation();
      } else if (isInput || isTerminal) {
        return;
      }

      if (!mod) return;

      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= tabKeys.length) {
        e.preventDefault();
        setActiveTab(tabKeys[digit - 1]);
        return;
      }

      switch (e.key) {
        case 'n':
          e.preventDefault();
          setDialogMode('spawn');
          setShowSpawnDialog(true);
          break;
        case 'o':
          e.preventDefault();
          setDialogMode('open');
          setShowSpawnDialog(true);
          break;
        case '[': {
          e.preventDefault();
          const runningAgents = agents.filter(a => a.status !== 'dead');
          if (runningAgents.length === 0) break;
          const currentIdx = runningAgents.findIndex(a => a.id === selectedAgentId);
          const prevIdx = currentIdx <= 0 ? runningAgents.length - 1 : currentIdx - 1;
          setSelectedAgentId(runningAgents[prevIdx].id);
          setActiveTab('terminal');
          break;
        }
        case ']': {
          e.preventDefault();
          const runningAgents = agents.filter(a => a.status !== 'dead');
          if (runningAgents.length === 0) break;
          const currentIdx = runningAgents.findIndex(a => a.id === selectedAgentId);
          const nextIdx = currentIdx >= runningAgents.length - 1 ? 0 : currentIdx + 1;
          setSelectedAgentId(runningAgents[nextIdx].id);
          setActiveTab('terminal');
          break;
        }
        case '\\':
          e.preventDefault();
          setTerminalView((prev) => prev === 'multi' ? 'single' : 'multi');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [agents, selectedAgentId]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'graph', label: 'Graph' },
    { key: 'terminal', label: 'Terminal' },
    { key: 'files', label: 'Files' },
    { key: 'prs', label: 'PRs' },
    { key: 'messages', label: 'Messages' },
    { key: 'context', label: 'Context' },
    { key: 'crewmd', label: 'Rules' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <ClustrLogo size={26} />
          <h1>Clustr</h1>
        </div>
        {(() => {
          const totalCost = agents.reduce((sum, a) => sum + (a.total_cost || 0), 0);
          return totalCost > 0 ? (
            <span className="header-total-cost">Total: ${totalCost.toFixed(4)}</span>
          ) : null;
        })()}
        <div className="header-actions">
          <button onClick={() => openDialog('open')}>
            Open Project
          </button>
          <button className="primary" onClick={() => openDialog('spawn')}>
            New Agent
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
          {sidebarOpen && <AgentList
            agents={agents}
            selectedId={selectedAgentId}
            onSelect={(agent) => {
              setSelectedAgentId(agent.id);
              setActiveTab('terminal');
            }}
            onKill={handleKill}
            onRemove={handleRemove}
            onRollback={handleRollback}
            onRestart={handleRestart}
          />}
        </aside>

        <main className="main-content">
          <nav className="tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={activeTab === t.key ? 'tab active' : 'tab'}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            {activeTab === 'terminal' && (
              <div className="terminal-view-toggle">
                <button
                  className={`view-toggle-btn ${terminalView === 'multi' ? 'active' : ''}`}
                  onClick={() => setTerminalView('multi')}
                  title="Split view — all agents"
                >
                  ⊞
                </button>
                <button
                  className={`view-toggle-btn ${terminalView === 'single' ? 'active' : ''}`}
                  onClick={() => setTerminalView('single')}
                  title="Single view — selected agent"
                >
                  ☐
                </button>
              </div>
            )}
          </nav>

          <div className="tab-content">
            {activeTab === 'graph' && (
              <AgentGraph
                agents={agents}
                messages={messages}
                onSelectAgent={handleSelectFromGraph}
              />
            )}
            {activeTab === 'terminal' && terminalView === 'multi' && (
              <MultiTerminal
                agents={agents}
                socket={socket}
                onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
              />
            )}
            {activeTab === 'terminal' && terminalView === 'single' && (
              <Terminal
                agent={selectedAgent}
                socket={socket}
              />
            )}
            {activeTab === 'messages' && (
              <MessageFeed
                messages={messages}
                agents={agents}
                selectedAgentId={selectedAgent?.id ?? null}
                onClear={handleClearMessages}
              />
            )}
            {activeTab === 'context' && (
              <ContextViewer entries={contextEntries} onRemove={handleRemoveContext} />
            )}
            {activeTab === 'files' && (
              <FileChanges changes={fileChanges} agents={agents} onClear={handleClearFileChanges} />
            )}
            {activeTab === 'prs' && (
              <PRsTab
                prs={prs}
                branches={branches}
                currentBranch={currentBranch}
                ghAvailable={ghAvailable}
                repoInfo={repoInfo}
                agents={agents}
                fetchPRDetail={fetchPRDetail}
              />
            )}
            {activeTab === 'crewmd' && (
              <CrewMdEditor content={crewMd} onChange={setCrewMd} />
            )}
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <select
          value={messageTarget}
          onChange={(e) => setMessageTarget(e.target.value)}
        >
          <option value="all">All Agents</option>
          {agents
            .filter((a) => a.status === 'running')
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        <input
          type="text"
          placeholder={
            messageTarget === 'all'
              ? 'Broadcast message to all agents...'
              : `Send message to ${agents.find(a => a.id === messageTarget)?.name || 'agent'}...`
          }
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button className="primary" onClick={handleSendMessage} disabled={!messageInput.trim()}>
          Send
        </button>
      </footer>

      {showSpawnDialog && (
        <SpawnDialog
          onSpawn={handleSpawn}
          onClose={() => setShowSpawnDialog(false)}
          initialMode={dialogMode}
        />
      )}
    </div>
  );
}
