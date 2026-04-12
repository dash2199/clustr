"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    num: "1",
    title: "Install and start",
    description: (
      <>
        Run{" "}
        <code className="font-mono text-[13px] bg-[#111111] px-2 py-0.5 rounded border border-[#2a2a2a] text-[#4ade80]">
          npx clustr-ai
        </code>{" "}
        in your terminal. Clustr builds and launches automatically — no config
        needed.
      </>
    ),
  },
  {
    num: "2",
    title: "Open the dashboard",
    description: (
      <>
        Visit{" "}
        <code className="font-mono text-[13px] bg-[#111111] px-2 py-0.5 rounded border border-[#2a2a2a] text-[#4ade80]">
          localhost:3100
        </code>{" "}
        in your browser. You&apos;ll see the workspace UI with agent graph,
        terminals, and messaging.
      </>
    ),
  },
  {
    num: "3",
    title: "Spawn agents",
    description:
      'Click "Open Project" to point agents at your codebase, or "New Agent" for custom tasks. Choose between Claude and Codex.',
  },
  {
    num: "4",
    title: "Watch them collaborate",
    description:
      "Agents discover each other, share context, and send messages. Monitor everything live from the dashboard.",
  },
];

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="py-20 px-6 max-w-[800px] mx-auto">
      <motion.h2
        className="text-center text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-white mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        Up and running in 30 seconds
      </motion.h2>

      <div ref={ref} className="relative flex flex-col">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-6 bottom-6 w-px bg-[#2a2a2a]" />

        {steps.map((step, index) => (
          <motion.div
            key={step.num}
            className="flex gap-6 py-6"
            initial={{ opacity: 0, x: -15 }}
            animate={
              isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -15 }
            }
            transition={{ duration: 0.4, delay: 0.15 * index }}
          >
            <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-center font-mono text-[13px] font-medium text-[#707070]">
              {step.num}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#eeeeee] mb-1.5">
                {step.title}
              </h3>
              <p className="text-sm text-[#707070] leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
