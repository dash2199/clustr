import { Handle, Position, type NodeProps } from '@xyflow/react';

const statusColor: Record<string, string> = {
  running: '#4ade80',
  starting: '#fbbf24',
  idle: '#fbbf24',
  done: '#555',
  dead: '#f87171',
};

interface AgentNodeData {
  label: string;
  status: string;
  task: string;
  service?: string;
  messageCount?: number;
  [key: string]: unknown;
}

export default function AgentNode({ data }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const color = statusColor[nodeData.status] || '#555';
  const isActive = nodeData.status === 'running' || nodeData.status === 'starting';

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: `1px solid ${isActive ? '#333' : '#1e1e1e'}`,
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 160,
        position: 'relative',
        transition: 'border-color 180ms ease',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#333', border: 'none', width: 6, height: 6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            boxShadow: isActive ? `0 0 6px ${color}40` : 'none',
          }}
        />
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#e8e8e8',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {nodeData.label}
        </span>
        {nodeData.service && nodeData.service !== 'claude' && (
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: nodeData.service === 'codex' ? '#10b981' : '#888',
            background: nodeData.service === 'codex' ? '#10b98118' : '#88888818',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {nodeData.service}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          color: '#555',
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1.4,
        }}
      >
        {nodeData.task}
      </div>
      {nodeData.messageCount && nodeData.messageCount > 0 && (
        <div
          title={`${nodeData.messageCount} message${nodeData.messageCount > 1 ? 's' : ''} received`}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: '#4ade80',
            color: '#000',
            borderRadius: 8,
            padding: '2px 5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            fontSize: 9,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'default',
          }}
        >
          <span style={{ fontSize: 8 }}>✉</span>
          {nodeData.messageCount}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#333', border: 'none', width: 6, height: 6 }} />
    </div>
  );
}
