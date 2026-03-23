"use client";

import { UPSELL_OPTIONS } from "@/types";
import { Button } from "@/components/ui/button";

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
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-slate-800 mb-4">
        Extras (optionnel)
      </h3>

      <div className="space-y-3">
        {UPSELL_OPTIONS.map((option) => {
          const qty = getQuantity(option.type);
          return (
            <div
              key={option.type}
              className="flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-slate-500">
                  {(option.price / 100).toFixed(2)}€ / unité
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(option.type, Math.max(0, qty - 1))}
                  disabled={qty === 0}
                  className="h-8 w-8 p-0"
                >
                  −
                </Button>
                <span className="w-8 text-center font-mono text-sm">
                  {qty}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(option.type, qty + 1)}
                  className="h-8 w-8 p-0"
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
