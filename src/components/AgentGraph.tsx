import { useMemo, useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AgentNode from './AgentNode';
import type { Agent, Message } from '../hooks/useSocket';

interface Props {
  agents: Agent[];
  messages: Message[];
  onSelectAgent: (agent: Agent) => void;
}

const nodeTypes = { agent: AgentNode };

export default function AgentGraph({ agents, messages, onSelectAgent }: Props) {
  const [animatedEdges, setAnimatedEdges] = useState<Edge[]>([]);

  const messageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.to_agent && msg.to_agent !== 'all') {
        counts[msg.to_agent] = (counts[msg.to_agent] || 0) + 1;
      }
    }
    return counts;
  }, [messages]);

  const collaborationEdges: Edge[] = useMemo(() => {
    const pairs = new Map<string, number>();
    const agentIds = new Set(agents.map(a => a.id));

    for (const msg of messages) {
      if (!agentIds.has(msg.from_agent) || !agentIds.has(msg.to_agent)) continue;
      if (msg.to_agent === 'all') continue;
      const key = [msg.from_agent, msg.to_agent].sort().join('|');
      pairs.set(key, (pairs.get(key) || 0) + 1);
    }

    return Array.from(pairs.entries()).map(([key, count]) => {
      const [source, target] = key.split('|');
      return {
        id: `collab-${key}`,
        source,
        target,
        style: { stroke: '#333', strokeWidth: Math.min(1 + count * 0.3, 3) },
        label: `${count}`,
        labelStyle: { fill: '#666', fontSize: 9 },
        labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
      };
    });
  }, [agents, messages]);

  const nodes: Node[] = useMemo(() => {
    const cols = Math.max(Math.ceil(Math.sqrt(agents.length)), 1);
    return agents.map((agent, i) => ({
      id: agent.id,
      type: 'agent',
      position: {
        x: 80 + (i % cols) * 240,
        y: 80 + Math.floor(i / cols) * 130,
      },
      data: {
        label: agent.name,
        status: agent.status,
        task: agent.task || '',
        service: agent.service || 'claude',
        messageCount: messageCounts[agent.id] || 0,
      },
    }));
  }, [agents, messageCounts]);

  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[0];
    if (!latest) return;

    const agentIds = new Set(agents.map((a) => a.id));
    if (!agentIds.has(latest.from_agent) || !agentIds.has(latest.to_agent)) return;

    const edgeId = `msg-${latest.id}`;
    const edge: Edge = {
      id: edgeId,
      source: latest.from_agent,
      target: latest.to_agent,
      animated: true,
      style: { stroke: '#4ade80', strokeWidth: 1.5 },
    };

    setAnimatedEdges((prev) => [...prev, edge]);
    const timer = setTimeout(() => {
      setAnimatedEdges((prev) => prev.filter((e) => e.id !== edgeId));
    }, 3000);

    return () => clearTimeout(timer);
  }, [messages, agents]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const agent = agents.find((a) => a.id === node.id);
      if (agent) onSelectAgent(agent);
    },
    [agents, onSelectAgent]
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={[...collaborationEdges, ...animatedEdges]}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={24} size={1} />
        <Controls
          style={{
            background: '#0a0a0a',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
          }}
        />
      </ReactFlow>
    </div>
  );
}
