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
      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Extras</p>
      {UPSELL_OPTIONS.map((o) => {
        const q = qty(o.type);
        return (
          <div key={o.type} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{o.label}</p>
              <p className="text-[11px] text-slate-400">{(o.price / 100).toFixed(2)}€</p>
            </div>
            <div className="flex items-center">
              <button type="button" onClick={() => set(o.type, Math.max(0, q - 1))} disabled={q === 0}
                className="w-9 h-9 rounded-l-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-20 text-base font-bold active:bg-slate-100">
                −
              </button>
              <div className="w-9 h-9 border-y border-slate-200 flex items-center justify-center text-sm font-bold text-slate-900 bg-slate-50 tabular-nums">
                {q}
              </div>
              <button type="button" onClick={() => set(o.type, q + 1)}
                className="w-9 h-9 rounded-r-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-base font-bold active:bg-slate-100">
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
