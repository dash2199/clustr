"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    title: "Multi-Agent Orchestration",
    description:
      "Spawn multiple AI agents that work in parallel on different parts of your project. Each runs in its own terminal with full shell access.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <circle cx="4" cy="8" r="2" />
        <circle cx="20" cy="8" r="2" />
        <circle cx="4" cy="16" r="2" />
        <circle cx="20" cy="16" r="2" />
        <path d="M6 8h3M15 8h3M6 16h3M15 16h3" />
      </svg>
    ),
  },
  {
    title: "Inter-Agent Messaging",
    description:
      "Agents talk to each other — send messages, share findings, and collaborate automatically. Broadcast to all or direct-message specific agents.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    title: "Real-Time Dashboard",
    description:
      "Web UI with live terminal views, agent graph visualization, message feed, shared context viewer, and file change tracking.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Shared Context Store",
    description:
      "A shared memory that all agents can read and write. When one agent discovers something useful, every other agent in the workspace knows instantly.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    title: "Multi-Service Support",
    description:
      "Run Claude Code and OpenAI Codex agents side by side. Choose the right model for each task — or let them collaborate across providers.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    title: "Your Own Command Terminal",
    description:
      "Open a separate terminal in an agent's project folder to run your own commands without sending them to the AI.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "Connect to Phone",
    description:
      "Monitor and control your agent swarm from any device. Scan a QR code to pair your phone — no account required. Enable a tunnel for remote access over cellular.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-28 px-6 max-w-[1100px] mx-auto">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-white mb-4">
          Built for multi-agent workflows
        </h2>
        <p className="text-base text-[#707070] max-w-[480px] mx-auto">
          Everything you need to run a swarm of AI agents on your codebase.
        </p>
      </motion.div>

      <div
        ref={ref}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#2a2a2a] border border-[#2a2a2a] rounded-2xl overflow-hidden"
      >
        {features.map((f, index) => (
          <motion.div
            key={f.title}
            className={`bg-[#0a0a0a] p-10 transition-colors hover:bg-[#111111]${index === features.length - 1 ? ' md:col-span-2 lg:col-span-3 md:text-center' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.4, delay: 0.08 * index }}
          >
            <motion.div
              className={`w-10 h-10 rounded-[10px] flex items-center justify-center mb-5 bg-[#111111] border border-[#2a2a2a] text-[#707070]${index === features.length - 1 ? ' md:mx-auto' : ''}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                isInView
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.8 }
              }
              transition={{ duration: 0.3, delay: 0.1 + 0.08 * index }}
            >
              {f.icon}
            </motion.div>
            <h3 className="text-base font-semibold text-[#eeeeee] mb-2 tracking-tight">
              {f.title}
            </h3>
            <p className="text-sm text-[#707070] leading-relaxed">
              {f.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
