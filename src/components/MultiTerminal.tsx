import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { Agent } from '../hooks/useSocket';
import type { Socket } from 'socket.io-client';
import './MultiTerminal.css';

async function uploadImageAndGetPath(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, mimeType: file.type }),
    });
    const data = await res.json();
    return data.path || null;
  } catch {
    return null;
  }
}

interface Props {
  agents: Agent[];
  socket: React.RefObject<Socket | null>;
  onSelectAgent?: (agent: Agent) => void;
}

interface PaneState {
  term: XTerm;
  fit: FitAddon;
  cleanup: (() => void) | null;
}

interface DividerProps {
  orientation: 'horizontal' | 'vertical';
  onDrag: (delta: number) => void;
}

const THEME = {
  background: '#0a0a0a',
  foreground: '#b0b0b0',
  cursor: '#e8e8e8',
  cursorAccent: '#000000',
  selectionBackground: 'rgba(255, 255, 255, 0.1)',
  selectionForeground: '#e8e8e8',
  black: '#0a0a0a',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#fbbf24',
  blue: '#93c5fd',
  magenta: '#c4b5fd',
  cyan: '#67e8f9',
  white: '#b0b0b0',
  brightBlack: '#444444',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde68a',
  brightBlue: '#bfdbfe',
  brightMagenta: '#ddd6fe',
  brightCyan: '#a5f3fc',
  brightWhite: '#e8e8e8',
};

function statusColor(status: string): string {
  switch (status) {
    case 'running': return '#4ade80';
    case 'starting': return '#fbbf24';
    case 'done': return '#666';
    case 'dead': return '#f87171';
    default: return '#666';
  }
}

function Divider({ orientation, onDrag }: DividerProps) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    let lastPos = orientation === 'horizontal' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = orientation === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - lastPos;
      lastPos = currentPos;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [orientation, onDrag]);

  return (
    <div
      className={`multi-term-divider ${orientation}`}
      onMouseDown={handleMouseDown}
    />
  );
}

export default function MultiTerminal({ agents, socket, onSelectAgent }: Props) {
  const panesRef = useRef<Map<string, PaneState>>(new Map());
  const containersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerWrapperRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<number[]>([]);
  const prevAgentIds = useRef<string>('');

  const runningAgents = agents.filter(a => a.status === 'running' || a.status === 'starting');
  const agentIds = runningAgents.map(a => a.id).join(',');

  useEffect(() => {
    if (agentIds !== prevAgentIds.current) {
      prevAgentIds.current = agentIds;
      const count = runningAgents.length;
      if (count > 0) {
        setSizes(Array(count).fill(100 / count));
      }
    }
  }, [agentIds, runningAgents.length]);

  const containerRefCallback = useCallback((agentId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      containersRef.current.set(agentId, el);
    } else {
      containersRef.current.delete(agentId);
    }
  }, []);

  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const currentIds = new Set(runningAgents.map(a => a.id));
    const panes = panesRef.current;

    // Tear down panes for agents that are no longer running
    for (const [id, pane] of panes) {
      if (!currentIds.has(id)) {
        pane.cleanup?.();
        pane.term.dispose();
        panes.delete(id);
      }
    }

    // Create/attach panes for running agents
    for (const agent of runningAgents) {
      const container = containersRef.current.get(agent.id);
      if (!container) continue;

      if (panes.has(agent.id)) {
        // Already exists — just refit
        const pane = panes.get(agent.id)!;
        try { pane.fit.fit(); } catch { /* ignore */ }
        continue;
      }

      const term = new XTerm({
        theme: THEME,
        fontSize: 12,
        fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code", monospace',
        fontWeight: '400',
        fontWeightBold: '500',
        lineHeight: 1.25,
        cursorBlink: true,
        cursorStyle: 'bar',
        cursorWidth: 1,
        scrollback: 10000,
        allowProposedApi: true,
        minimumContrastRatio: 1,
        drawBoldTextInBrightColors: true,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);

      try {
        const u11 = new Unicode11Addon();
        term.loadAddon(u11);
        term.unicode.activeVersion = '11';
      } catch { /* optional */ }

      try {
        term.loadAddon(new WebLinksAddon());
      } catch { /* optional */ }

      term.open(container);
      try { fit.fit(); } catch { /* ignore */ }

      // Load scrollback
      let scrollbackLoaded = false;
      fetch(`/api/agents/${agent.id}/scrollback`)
        .then(r => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.scrollback && term) {
            const CHUNK = 16384;
            const sb = data.scrollback as string;
            let offset = 0;
            const writeNext = () => {
              if (offset >= sb.length) {
                scrollbackLoaded = true;
                term.scrollToBottom();
                setTimeout(() => term.scrollToBottom(), 50);
                return;
              }
              const chunk = sb.slice(offset, offset + CHUNK);
              offset += CHUNK;
              term.write(chunk, writeNext);
            };
            writeNext();
          } else {
            scrollbackLoaded = true;
          }
        })
        .catch(() => { scrollbackLoaded = true; });

      // Live PTY data
      const ptyEvent = `agent:pty:${agent.id}`;
      const onPtyData = (data: string) => {
        const buffer = term.buffer.active;
        const isAtBottom = buffer.viewportY >= buffer.baseY - 1;
        term.write(data);
        if (scrollbackLoaded && isAtBottom) term.scrollToBottom();
      };
      sock.on(ptyEvent, onPtyData);

      // Keyboard input
      const onTermData = term.onData((data: string) => {
        sock.emit('agent:input', agent.id, data);
      });

      term.attachCustomKeyEventHandler((ev) => {
        if (ev.type === 'keydown' && ev.key === 'Enter' && ev.shiftKey) {
          ev.preventDefault();
          sock.emit('agent:input', agent.id, '\n');
          return false;
        }
        return true;
      });

      // Resize observer
      const ro = new ResizeObserver(() => {
        try {
          fit.fit();
          sock.emit('agent:resize', agent.id, term.cols, term.rows);
        } catch { /* ignore */ }
      });
      ro.observe(container);

      // Capture-phase image paste/drop on pane container
      const paneEl = containersRef.current.get(agent.id)?.parentElement;
      const agentId = agent.id;

      const doImageUpload = async (file: File) => {
        term.write('\r\n\x1b[33mUploading image...\x1b[0m');
        const filePath = await uploadImageAndGetPath(file);
        if (filePath) {
          sock.emit('agent:input', agentId, filePath + '\r');
          term.write('\r\n\x1b[32mImage ready: ' + filePath + '\x1b[0m\r\n');
        } else {
          term.write('\r\n\x1b[31mFailed to upload image\x1b[0m\r\n');
        }
      };

      const onPasteCapture = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            const file = item.getAsFile();
            if (file) doImageUpload(file);
            return;
          }
        }
        const text = e.clipboardData?.getData('text/plain');
        if (text) {
          e.preventDefault();
          e.stopPropagation();
          const sanitized = text.replace(/\r\n|\r|\n/g, ' ');
          sock.emit('agent:input', agentId, sanitized);
        }
      };

      const onDragOverCapture = (e: DragEvent) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      const onDropCapture = (e: DragEvent) => {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            doImageUpload(file);
            return;
          }
        }
      };

      paneEl?.addEventListener('paste', onPasteCapture, true);
      paneEl?.addEventListener('dragover', onDragOverCapture, true);
      paneEl?.addEventListener('drop', onDropCapture, true);

      const cleanup = () => {
        sock.off(ptyEvent, onPtyData);
        onTermData.dispose();
        ro.disconnect();
        paneEl?.removeEventListener('paste', onPasteCapture, true);
        paneEl?.removeEventListener('dragover', onDragOverCapture, true);
        paneEl?.removeEventListener('drop', onDropCapture, true);
      };

      panes.set(agent.id, { term, fit, cleanup });
    }

    return () => {
      // Full teardown on unmount
      for (const [, pane] of panes) {
        pane.cleanup?.();
        pane.term.dispose();
      }
      panes.clear();
    };
  }, [runningAgents.map(a => a.id).join(','), socket.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaneClick = useCallback((agent: Agent) => {
    setFocusedId(agent.id);
    const pane = panesRef.current.get(agent.id);
    if (pane) pane.term.focus();
    onSelectAgent?.(agent);
  }, [onSelectAgent]);

  const handleDividerDrag = useCallback((index: number, delta: number) => {
    if (!containerWrapperRef.current) return;
    const containerWidth = containerWrapperRef.current.offsetWidth;
    const deltaPercent = (delta / containerWidth) * 100;

    setSizes(prev => {
      const newSizes = [...prev];
      const minSize = 10;
      
      const newLeft = newSizes[index] + deltaPercent;
      const newRight = newSizes[index + 1] - deltaPercent;
      
      if (newLeft >= minSize && newRight >= minSize) {
        newSizes[index] = newLeft;
        newSizes[index + 1] = newRight;
      }
      
      return newSizes;
    });
  }, []);

  const count = runningAgents.length;

  if (count === 0) {
    return (
      <div className="multi-term-empty">
        <div className="multi-term-empty-icon">_</div>
        <div className="multi-term-empty-text">No running agents</div>
      </div>
    );
  }

  const effectiveSizes = sizes.length === count ? sizes : Array(count).fill(100 / count);

  return (
    <div className="multi-term-container" ref={containerWrapperRef}>
      {runningAgents.map((agent, idx) => (
        <React.Fragment key={agent.id}>
          <div
            className={`multi-term-pane ${focusedId === agent.id ? 'focused' : ''}`}
            style={{ flexBasis: `${effectiveSizes[idx]}%` }}
            onClick={() => handlePaneClick(agent)}
            onPointerDownCapture={() => handlePaneClick(agent)}
          >
            <div className="multi-term-pane-header">
              <span
                className="multi-term-status-dot"
                style={{ background: statusColor(agent.status) }}
              />
              <span className="multi-term-pane-name">{agent.name}</span>
              <span className="multi-term-pane-task">{agent.task}</span>
            </div>
            <div
              className="multi-term-pane-body"
              ref={containerRefCallback(agent.id)}
            />
          </div>
          {idx < count - 1 && (
            <Divider
              orientation="horizontal"
              onDrag={(delta) => handleDividerDrag(idx, delta)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
