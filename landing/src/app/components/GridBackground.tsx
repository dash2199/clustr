"use client";

import { motion } from "framer-motion";

export default function GridBackground() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>grid</title>
        <defs>
          <pattern
            id="clustr-grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="clustr-grid-fade" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0.9" />
            <stop offset="85%" stopColor="white" stopOpacity="0.5" />
            <stop offset="95%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="clustr-grid-mask">
            <rect width="100%" height="100%" fill="url(#clustr-grid-fade)" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#clustr-grid)"
          mask="url(#clustr-grid-mask)"
        />
      </svg>
    </motion.div>
  );
}
