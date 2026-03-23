"use client";

import { UPSELL_OPTIONS } from "@/types";

interface UpsellSectionProps {
  upsells: { type: string; quantity: number }[];
  onChange: (upsells: { type: string; quantity: number }[]) => void;
}

export function UpsellSection({ upsells, onChange }: UpsellSectionProps) {
  const getQuantity = (type: string) =>
    upsells.find((u) => u.type === type)?.quantity || 0;

  const setQuantity = (type: string, quantity: number) => {
    const existing = upsells.filter((u) => u.type !== type);
    if (quantity > 0) {
      existing.push({ type, quantity });
    }
    onChange(existing);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">
          Extras
        </span>
        <span className="text-xs text-slate-400 ml-1">optionnel</span>
      </div>

      <div className="divide-y divide-slate-100">
        {UPSELL_OPTIONS.map((option) => {
          const qty = getQuantity(option.type);
          return (
            <div
              key={option.type}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {option.label}
                </p>
                <p className="text-xs text-slate-400">
                  {(option.price / 100).toFixed(2)}€ / unité
                </p>
              </div>
              <div className="flex items-center gap-0">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(option.type, Math.max(0, qty - 1))
                  }
                  disabled={qty === 0}
                  className="w-10 h-10 flex items-center justify-center rounded-l-lg border border-r-0 border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 active:bg-slate-100 text-lg"
                >
                  −
                </button>
                <div className="w-10 h-10 flex items-center justify-center border-y border-slate-200 font-mono text-sm font-semibold text-slate-800 bg-white">
                  {qty}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity(option.type, qty + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-r-lg border border-l-0 border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 text-lg"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
