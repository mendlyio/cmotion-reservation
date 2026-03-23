"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        onExpired();
        return;
      }
      setTimeLeft(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isLow = timeLeft < 60000;
  const progress = timeLeft / (5 * 60 * 1000);

  if (timeLeft <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${
        isLow
          ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20"
          : "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
      }`}
    >
      {/* Mini progress ring */}
      <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.15"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${progress * 50.26} 50.26`}
          className={isLow ? "animate-pulse" : ""}
        />
      </svg>
      <span className="font-mono tabular-nums">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </motion.div>
  );
}
