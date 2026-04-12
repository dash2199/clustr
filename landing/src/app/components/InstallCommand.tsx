"use client";

import { useState, useCallback } from "react";

export default function InstallCommand() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("npx clustr-ai").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-3 bg-bg-secondary border border-border rounded-xl px-5 py-4 font-mono text-base text-text cursor-pointer transition-all hover:border-[#444] hover:shadow-[0_0_0_1px_rgba(74,222,128,0.1)] min-w-[380px] max-w-full"
    >
      <span className="text-green select-none">$</span>
      <span className="flex-1 text-left">npx clustr-ai</span>
      <span
        className={`flex items-center justify-center w-9 h-9 border rounded-md transition-all flex-shrink-0 ${
          copied
            ? "text-green border-green/30 bg-green/8"
            : "text-text-muted border-border bg-bg-tertiary group-hover:text-text group-hover:border-[#444] group-hover:bg-bg-elevated"
        }`}
      >
        {copied ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </span>
    </button>
  );
}
