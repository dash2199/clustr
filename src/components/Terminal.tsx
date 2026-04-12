import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { Agent } from '../hooks/useSocket';
import type { Socket } from 'socket.io-client';

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
  agent: Agent | null;
  socket: React.RefObject<Socket | null>;
}

export default function Terminal({ agent, socket }: Props) {
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
        background: '#000000',
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
      },
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code", monospace',
      fontWeight: '400',
      fontWeightBold: '500',
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 1,
      scrollback: 15000,
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
      const webLinks = new WebLinksAddon();
      term.loadAddon(webLinks);
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
      if (agentId && socket.current) {
        const term = termRef.current;
        if (term) socket.current.emit('agent:resize', agentId, term.cols, term.rows);
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

    const prevId = currentAgentId.current;
    currentAgentId.current = agent.id;

    if (prevId !== agent.id) {
      term.write('\x1b[2J\x1b[3J\x1b[H');
    }

    let scrollbackLoaded = false;
    fetch(`/api/agents/${agent.id}/scrollback`)
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.scrollback && currentAgentId.current === agent.id && term) {
          const CHUNK = 16384;
          const sb = data.scrollback as string;
          let offset = 0;
          const writeNextChunk = () => {
            if (offset >= sb.length) {
              scrollbackLoaded = true;
              term.scrollToBottom();
              setTimeout(() => term.scrollToBottom(), 50);
              return;
            }
            const chunk = sb.slice(offset, offset + CHUNK);
            offset += CHUNK;
            term.write(chunk, writeNextChunk);
          };
          writeNextChunk();
        } else {
          scrollbackLoaded = true;
        }
      })
      .catch(() => { scrollbackLoaded = true; });

    const ptyEvent = `agent:pty:${agent.id}`;
    const onPtyData = (data: string) => {
      if (currentAgentId.current === agent.id && term) {
        const buffer = term.buffer.active;
        const isAtBottom = buffer.viewportY >= buffer.baseY - 1;
        term.write(data);
        if (scrollbackLoaded && isAtBottom) term.scrollToBottom();
      }
    };
    sock.on(ptyEvent, onPtyData);

    const onTermData = term.onData((data: string) => {
      sock.emit('agent:input', agent.id, data);
    });

    try {
      fitRef.current?.fit();
      sock.emit('agent:resize', agent.id, term.cols, term.rows);
    } catch { /* ignore */ }

    const el = wrapperRef.current;
    const agentId = agent.id;

    const doImageUpload = async (file: File) => {
      term.write('\r\n\x1b[33mUploading image...\x1b[0m');
      const filePath = await uploadImageAndGetPath(file);
      if (filePath && currentAgentId.current === agentId) {
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

    el?.addEventListener('paste', onPasteCapture, true);
    el?.addEventListener('dragover', onDragOverCapture, true);
    el?.addEventListener('drop', onDropCapture, true);

    term.focus();

    return () => {
      sock.off(ptyEvent, onPtyData);
      onTermData.dispose();
      el?.removeEventListener('paste', onPasteCapture, true);
      el?.removeEventListener('dragover', onDragOverCapture, true);
      el?.removeEventListener('drop', onDropCapture, true);
    };
  }, [agent, socket]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWrapperClick = () => {
    termRef.current?.focus();
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={wrapperRef}
        onClick={handleWrapperClick}
        style={{
          width: '100%',
          height: '100%',
          display: agent ? 'block' : 'none',
          padding: '2px 0',
          overscrollBehavior: 'contain',
        }}
      />
      {!agent && (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: '#333',
        }}>
          <div style={{
            fontSize: 28,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 400,
            letterSpacing: '0.05em',
          }}>
            _
          </div>
          <div style={{
            fontSize: 12,
            color: '#444',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.02em',
          }}>
            Select an agent to view its terminal
          </div>
        </div>
      )}
    </div>
  );
}
