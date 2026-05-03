import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { apiFetch, type Agent } from '../hooks/useSocket';
import type { Socket } from 'socket.io-client';
import './UserShell.css';

interface Props {
  agent: Agent | null;
  socket: React.RefObject<Socket | null>;
  onClose: () => void;
}

export default function UserShell({ agent, socket, onClose }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const currentAgentId = useRef<string | null>(null);
  const initDone = useRef(false);

  const ensureTerm = () => {
    if (termRef.current || !wrapperRef.current || initDone.current) return;
    initDone.current = true;

    const term = new XTerm({
      theme: {
        background: '#050505',
        foreground: '#c7c7c7',
        cursor: '#f5f5f5',
        cursorAccent: '#050505',
        selectionBackground: 'rgba(255, 255, 255, 0.14)',
        black: '#0a0a0a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#93c5fd',
        magenta: '#c4b5fd',
        cyan: '#67e8f9',
        white: '#c7c7c7',
        brightBlack: '#555555',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
        brightBlue: '#bfdbfe',
        brightMagenta: '#ddd6fe',
        brightCyan: '#a5f3fc',
        brightWhite: '#f5f5f5',
      },
      fontSize: 12,
      fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code", monospace',
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 1,
      scrollback: 8000,
      allowProposedApi: true,
      minimumContrastRatio: 1,
      drawBoldTextInBrightColors: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    try {
      const unicode11 = new Unicode11Addon();
      term.loadAddon(unicode11);
      term.unicode.activeVersion = '11';
    } catch { /* optional */ }

    try {
      term.loadAddon(new WebLinksAddon());
    } catch { /* optional */ }

    term.open(wrapperRef.current);
    try { fit.fit(); } catch { /* container may not be visible yet */ }

    termRef.current = term;
    fitRef.current = fit;
  };

  useEffect(() => {
    ensureTerm();

    const el = wrapperRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      try { fitRef.current?.fit(); } catch { /* ignore */ }
      const agentId = currentAgentId.current;
      const term = termRef.current;
      if (agentId && term && socket.current) {
        socket.current.emit('user-shell:resize', agentId, term.cols, term.rows);
      }
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
      initDone.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ensureTerm();
    const term = termRef.current;
    const sock = socket.current;

    if (!agent || !term || !sock) {
      currentAgentId.current = null;
      return;
    }

    const previousAgentId = currentAgentId.current;
    currentAgentId.current = agent.id;

    if (previousAgentId !== agent.id) {
      term.write('\x1b[2J\x1b[3J\x1b[H');
    }

    apiFetch(`/api/agents/${agent.id}/user-shell/start`, { method: 'POST' })
      .then((res) => res.ok ? res.json() : res.json().then((data) => Promise.reject(data)))
      .then((data) => {
        if (currentAgentId.current === agent.id && data?.cwd) {
          term.writeln(`\x1b[90mUser shell cwd: ${data.cwd}\x1b[0m`);
        }
      })
      .catch((err) => {
        if (currentAgentId.current === agent.id) {
          term.writeln(`\x1b[31mFailed to start user shell: ${err?.error || err?.message || 'unknown error'}\x1b[0m`);
        }
      });

    apiFetch(`/api/agents/${agent.id}/user-shell/scrollback`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.scrollback && currentAgentId.current === agent.id && term) {
          term.write(data.scrollback);
          term.scrollToBottom();
        }
      })
      .catch(() => {});

    const ptyEvent = `user-shell:pty:${agent.id}`;
    const onPtyData = (data: string) => {
      if (currentAgentId.current === agent.id && term) {
        const buffer = term.buffer.active;
        const isAtBottom = buffer.viewportY >= buffer.baseY - 1;
        term.write(data);
        if (isAtBottom) term.scrollToBottom();
      }
    };
    sock.on(ptyEvent, onPtyData);

    const onTermData = term.onData((data: string) => {
      sock.emit('user-shell:input', agent.id, data);
    });

    try {
      fitRef.current?.fit();
      sock.emit('user-shell:resize', agent.id, term.cols, term.rows);
    } catch { /* ignore */ }

    term.focus();

    return () => {
      sock.off(ptyEvent, onPtyData);
      onTermData.dispose();
    };
  }, [agent, socket]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="user-shell-panel">
      <header className="user-shell-header">
        <div>
          <span className="user-shell-title">User Shell</span>
          <span className="user-shell-subtitle">
            {agent?.name ? `${agent.name}${agent.agent_cwd ? ` · ${agent.agent_cwd}` : ''}` : 'Select an agent'}
          </span>
        </div>
        <button className="user-shell-close" onClick={onClose} title="Close user shell">
          Close
        </button>
      </header>
      <div
        className="user-shell-terminal"
        ref={wrapperRef}
        onClick={() => termRef.current?.focus()}
        onPointerDownCapture={() => termRef.current?.focus()}
      />
    </section>
  );
}
