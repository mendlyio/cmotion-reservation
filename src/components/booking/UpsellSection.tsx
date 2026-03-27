"use client";

import { UPSELL_OPTIONS } from "@/types";

interface Props {
  upsells: { type: string; quantity: number }[];
  onChange: (u: { type: string; quantity: number }[]) => void;
}

export function UpsellSection({ upsells, onChange }: Props) {
  const qty = (t: string) => upsells.find((u) => u.type === t)?.quantity || 0;
  const set = (t: string, q: number) => {
    const rest = upsells.filter((u) => u.type !== t);
    if (q > 0) rest.push({ type: t, quantity: q });
    onChange(rest);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[#888] uppercase tracking-widest">Extras</p>
      {UPSELL_OPTIONS.map((o) => {
        const q = qty(o.type);
        return (
          <div key={o.type} className="flex items-center justify-between rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] px-4 py-3 hover:border-[#c9a227]/20 transition-colors">
            <div>
              <p className="text-sm font-semibold text-white">{o.label}</p>
              <p className="text-[11px] text-[#555]">{(o.price / 100).toFixed(2)}€</p>
            </div>
            <div className="flex items-center rounded-lg overflow-hidden border border-[#2a2a2a]">
              <button
                type="button"
                onClick={() => set(o.type, Math.max(0, q - 1))}
                disabled={q === 0}
                className="w-9 h-9 bg-[#141414] hover:bg-[#1e1e1e] text-[#888] hover:text-white disabled:opacity-20 text-base font-bold transition-colors border-r border-[#2a2a2a] active:bg-[#0a0a0a]"
              >
                −
              </button>
              <div className="w-9 h-9 flex items-center justify-center text-sm font-bold tabular-nums bg-[#0a0a0a] text-white">
                {q}
              </div>
              <button
                type="button"
                onClick={() => set(o.type, q + 1)}
                className="w-9 h-9 bg-[#141414] hover:bg-[#1e1e1e] text-[#888] hover:text-[#c9a227] text-base font-bold transition-colors border-l border-[#2a2a2a] active:bg-[#0a0a0a]"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
