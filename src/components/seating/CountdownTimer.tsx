"use client";

import { useEffect, useState } from "react";

export function CountdownTimer({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const d = new Date(expiresAt).getTime() - Date.now();
      if (d <= 0) { setLeft(0); onExpired(); return; }
      setLeft(d);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, onExpired]);

  if (left <= 0) return null;

  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const low = left < 60000;
  const pct = Math.min(100, (left / (5 * 60 * 1000)) * 100);

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold tabular-nums border ${
      low
        ? "bg-red-500/15 border-red-500/30 text-red-300"
        : "bg-white/8 border-white/10 text-white/80"
    }`}>
      {/* Arc SVG */}
      <svg className="w-5 h-5 -rotate-90 flex-shrink-0" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.15" />
        <circle
          cx="10" cy="10" r="7" fill="none"
          stroke={low ? "#f87171" : "#a3e635"}
          strokeWidth="2" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 43.98} 43.98`}
          className={low ? "animate-pulse" : ""}
        />
      </svg>
      <span>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
      <span className={`text-[9px] font-semibold uppercase tracking-wider ${low ? "text-red-400/60" : "text-white/25"}`}>
        restant
      </span>
    </div>
  );
}
