"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const agents = [
  { name: "Claude Code", color: "bg-[#c4a67a]" },
  { name: "OpenAI Codex", color: "bg-[#10b981]" },
  { name: "More soon...", color: "bg-[#707070]" },
];

export default function AgentsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 px-6 text-center">
      <motion.h2
        className="text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-white mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        Supported agents
      </motion.h2>
      <motion.p
        className="text-base text-[#707070] mb-14"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        And more coming soon.
      </motion.p>

      <div ref={ref} className="flex items-center justify-center gap-6 flex-wrap">
        {agents.map((a, index) => (
          <motion.div
            key={a.name}
            className="flex items-center gap-3 px-7 py-3.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[15px] font-medium text-[#eeeeee] transition-all hover:border-[#444] hover:bg-[#111111]"
            initial={{ opacity: 0, x: -10 }}
            animate={
              isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }
            }
            transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
          >
            <span className={`w-2 h-2 rounded-full ${a.color}`} />
            {a.name}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
