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

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold tabular-nums border transition-all ${
      low
        ? "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse"
        : "bg-[#c9a227]/10 text-[#c9a227] border-[#c9a227]/25"
    }`}>
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
