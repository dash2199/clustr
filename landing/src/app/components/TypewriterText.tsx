"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
}

export default function TypewriterText({
  text,
  speed = 50,
  delay = 500,
  className,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsTyping(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!isTyping || displayedText.length >= text.length) return;
    const timeout = setTimeout(() => {
      setDisplayedText(text.slice(0, displayedText.length + 1));
    }, speed);
    return () => clearTimeout(timeout);
  }, [displayedText, isTyping, speed, text]);

  const isComplete = isTyping && displayedText.length === text.length;

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        className="inline-block ml-0.5 w-[3px] h-[0.9em] bg-green translate-y-0.5"
        animate={
          isComplete ? { opacity: [1, 1, 0, 0] } : { opacity: 1 }
        }
        transition={
          isComplete
            ? {
                duration: 1.5,
                times: [0, 0.5, 0.5, 1],
                repeat: Infinity,
                ease: "linear",
              }
            : {}
        }
      />
    </span>
  );
}
