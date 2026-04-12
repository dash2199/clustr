"use client";

import { motion } from "framer-motion";
import InstallCommand from "../InstallCommand";

export default function CTASection() {
  return (
    <section className="relative py-28 px-6 text-center">
      {/* Subtle glow */}
      <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.03)_0%,transparent_70%)] pointer-events-none" />

      <motion.h2
        className="relative text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-white mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        Start building with agent teams
      </motion.h2>
      <motion.p
        className="relative text-base text-[#707070] mb-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        One command. Multiple agents. Real collaboration.
      </motion.p>
      <motion.div
        className="relative flex justify-center"
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <InstallCommand />
      </motion.div>
    </section>
  );
}
