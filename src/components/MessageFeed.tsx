import { useRef, useEffect, useMemo } from 'react';
import type { Agent, Message } from '../hooks/useSocket';
import './MessageFeed.css';

interface Props {
  messages: Message[];
  agents: Agent[];
  selectedAgentId: string | null;
  onClear: () => void;
}

export default function MessageFeed({ messages, agents, selectedAgentId, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const agentNames = useMemo(() => {
    const map: Record<string, string> = { user: 'User' };
    agents.forEach((a) => { map[a.id] = a.name; });
    return map;
  }, [agents]);

  const filtered = useMemo(() => {
    if (!selectedAgentId) return messages;
    return messages.filter(
      (m) => m.from_agent === selectedAgentId || m.to_agent === selectedAgentId
    );
  }, [messages, selectedAgentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filtered]);

  return (
    <div className="message-feed">
      <div className="message-feed-header">
        <span>
          {selectedAgentId
            ? `Messages for ${agentNames[selectedAgentId] || selectedAgentId}`
            : 'All Messages'}
        </span>
        {filtered.length > 0 && (
          <button className="clear-messages-btn" onClick={onClear}>
            Clear All
          </button>
        )}
      </div>
      <div className="message-feed-list">
        {filtered.length === 0 && (
          <div className="message-feed-empty">No messages yet</div>
        )}
        {[...filtered].reverse().map((msg) => (
          <div key={msg.id} className="message-item">
            <div className="message-meta">
              <span className="message-from">{agentNames[msg.from_agent] || msg.from_agent.slice(0, 8)}</span>
              <span className="message-arrow"> → </span>
              <span className="message-to">
                {msg.to_agent === 'all' ? 'All' : agentNames[msg.to_agent] || msg.to_agent.slice(0, 8)}
              </span>
              <span className="message-time">
                {new Date(msg.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
