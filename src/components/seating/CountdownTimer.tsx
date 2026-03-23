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
    <div     className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${
      low ? "bg-red-500/20 text-red-300" : "bg-violet-500/15 text-violet-300/70"
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${low ? "bg-red-400 animate-pulse" : "bg-violet-400"}`} />
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
