"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  color: string;
  pulsePhase: number;
}

interface Message {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
}

const LABELS = ["claude", "codex", "researcher", "reviewer", "builder", "tester"];
const COLORS = ["#c4a67a", "#10b981", "#4ade80", "#60a5fa", "#f472b6", "#fbbf24"];

export default function AgentGraphAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const nodes: Node[] = [];
    const messages: Message[] = [];
    let tick = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initNodes() {
      nodes.length = 0;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.3;

      for (let i = 0; i < LABELS.length; i++) {
        const angle = (i / LABELS.length) * Math.PI * 2 - Math.PI / 2;
        const jitter = (Math.random() - 0.5) * radius * 0.3;
        nodes.push({
          x: cx + Math.cos(angle) * (radius + jitter),
          y: cy + Math.sin(angle) * (radius + jitter),
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 4 + Math.random() * 3,
          label: LABELS[i],
          color: COLORS[i],
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    }

    function spawnMessage() {
      if (nodes.length < 2) return;
      const from = Math.floor(Math.random() * nodes.length);
      let to = Math.floor(Math.random() * nodes.length);
      while (to === from) to = Math.floor(Math.random() * nodes.length);
      messages.push({
        fromIdx: from,
        toIdx: to,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012,
      });
    }

    function updateNodes() {
      const cx = width / 2;
      const cy = height / 2;

      for (const node of nodes) {
        // Wobble
        node.vx += (Math.random() - 0.5) * 0.02;
        node.vy += (Math.random() - 0.5) * 0.02;

        // Gentle pull toward center
        const dx = cx - node.x;
        const dy = cy - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > Math.min(width, height) * 0.35) {
          node.vx += dx * 0.0003;
          node.vy += dy * 0.0003;
        }

        // Damping
        node.vx *= 0.995;
        node.vy *= 0.995;

        node.x += node.vx;
        node.y += node.vy;

        // Keep in bounds
        const pad = 60;
        if (node.x < pad) { node.x = pad; node.vx *= -0.5; }
        if (node.x > width - pad) { node.x = width - pad; node.vx *= -0.5; }
        if (node.y < pad) { node.y = pad; node.vy *= -0.5; }
        if (node.y > height - pad) { node.y = height - pad; node.vy *= -0.5; }
      }
    }

    function updateMessages() {
      for (let i = messages.length - 1; i >= 0; i--) {
        messages[i].progress += messages[i].speed;
        if (messages[i].progress >= 1) {
          messages.splice(i, 1);
        }
      }
    }

    function drawEdges() {
      if (!ctx) return;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.min(width, height) * 0.55;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.15;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    function drawMessages() {
      if (!ctx) return;
      for (const msg of messages) {
        const from = nodes[msg.fromIdx];
        const to = nodes[msg.toIdx];
        const x = from.x + (to.x - from.x) * msg.progress;
        const y = from.y + (to.y - from.y) * msg.progress;

        // Glow
        const alpha = Math.sin(msg.progress * Math.PI);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 222, 128, ${alpha * 0.9})`;
        ctx.fill();

        // Trail
        ctx.beginPath();
        ctx.moveTo(from.x + (to.x - from.x) * Math.max(0, msg.progress - 0.1), from.y + (to.y - from.y) * Math.max(0, msg.progress - 0.1));
        ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(74, 222, 128, ${alpha * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function drawNodes() {
      if (!ctx) return;
      for (const node of nodes) {
        const pulse = 1 + Math.sin(tick * 0.03 + node.pulsePhase) * 0.15;

        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = node.color + "10";
        ctx.fill();

        // Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Label
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + node.radius * pulse + 14);
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      drawEdges();
      drawMessages();
      drawNodes();

      tick++;
      if (tick % 60 === 0) spawnMessage();
      if (tick % 90 === 0 && Math.random() > 0.4) spawnMessage();

      updateNodes();
      updateMessages();

      animRef.current = requestAnimationFrame(draw);
    }

    resize();
    initNodes();
    draw();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current);
      } else {
        animRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      aria-hidden="true"
    />
  );
}
