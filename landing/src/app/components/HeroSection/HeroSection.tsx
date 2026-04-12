"use client";

import { motion } from "framer-motion";
import InstallCommand from "../InstallCommand";
import TypewriterText from "../TypewriterText";
import GridBackground from "../GridBackground";
import DashboardMock from "../DashboardMock";

export default function HeroSection() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden"
    >
      <GridBackground />

      {/* ── Ambient glow behind the mock ── */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[55%] w-[900px] h-[600px] opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(74,222,128,0.15) 0%, rgba(74,222,128,0.04) 40%, transparent 70%)",
        }}
      />

      {/* ── Text content — centered above the mock ── */}
      <div className="relative z-10 flex flex-col items-center text-center pt-32 pb-8 px-6">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#2a2a2a] rounded-full text-xs text-[#707070] bg-[#0a0a0a]/80 backdrop-blur-sm mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          Now with Codex support
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-[clamp(40px,6vw,72px)] font-semibold leading-[1.05] tracking-tight text-white max-w-[700px] mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Your agents,
          <br />
          <span className="bg-gradient-to-br from-white to-[#4ade80] bg-clip-text text-transparent">
            <TypewriterText text="collaborating." speed={60} delay={800} />
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-[clamp(15px,1.6vw,18px)] text-[#707070] max-w-[540px] leading-relaxed mb-10 font-light"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Orchestrate Claude, Codex, and more AI coding agents collaborating
          in real time. Spawn, monitor, and coordinate — all from one terminal.
        </motion.p>

        {/* Install command */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <InstallCommand />
          <span className="text-xs text-[#707070] tracking-wide">
            Requires Node.js 18+ and Claude Code or Codex CLI installed
          </span>
        </motion.div>
      </div>

      {/* ── Dashboard mock — cinematic showcase ── */}
      <div className="relative z-10 flex justify-center px-6 pt-8 pb-24">
        <motion.div
          className="w-full max-w-[1050px]"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: "easeOut" }}
          style={{
            perspective: "1200px",
          }}
        >
          <motion.div
            initial={{ rotateX: 6, scale: 0.95 }}
            animate={{ rotateX: 2, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.9, ease: "easeOut" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <DashboardMock />
          </motion.div>
        </motion.div>
      </div>

      {/* ── Bottom fade to black ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />
    </section>
  );
}
