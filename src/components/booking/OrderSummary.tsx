"use client";

import { BookingFormData, calculateTotal, getMealPrice, MEAL_OPTIONS, DESSERT_PRICE, VIP_TABLE_PRICE, UPSELL_OPTIONS } from "@/types";

export function OrderSummary({ data }: { data: BookingFormData }) {
  const total = calculateTotal(data);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Récapitulatif</p>
      </div>

      <div className="p-4 space-y-2 text-sm">
        {data.isVip ? (
          <>
            <Row left="Table VIP · 8 pers." right={`${(VIP_TABLE_PRICE / 100).toFixed(2)}€`} />
            <p className="text-[11px] text-purple-500">★ Bulles, zakouski, dessert inclus</p>
          </>
        ) : (
          data.guests.map((g, i) => {
            const m = MEAL_OPTIONS.find((x) => x.value === g.mealChoice);
            const p = getMealPrice(g.mealChoice);
            return (
              <div key={i}>
                <Row left={`${g.firstName || `Convive ${i + 1}`} · ${m?.label || "—"}`} right={`${(p / 100).toFixed(2)}€`} />
                {g.hasDessert && <Row left="  + Tiramisu" right={`${(DESSERT_PRICE / 100).toFixed(2)}€`} sub />}
              </div>
            );
          })
        )}

        {data.upsells.filter((u) => u.quantity > 0).map((u) => {
          const o = UPSELL_OPTIONS.find((x) => x.type === u.type);
          if (!o) return null;
          return <Row key={u.type} left={`${o.label} ×${u.quantity}`} right={`${((o.price * u.quantity) / 100).toFixed(2)}€`} />;
        })}
      </div>

      <div className="px-4 py-3 flex justify-between items-center" style={{ background: "#0a0a14" }}>
        <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Total</span>
        <span className="text-xl font-extrabold tabular-nums" style={{ color: "#c084fc" }}>{(total / 100).toFixed(2)}€</span>
      </div>
    </div>
  );
}

function Row({ left, right, sub }: { left: string; right: string; sub?: boolean }) {
  return (
    <div className={`flex justify-between ${sub ? "text-[12px] text-slate-400 ml-2" : "text-slate-700"}`}>
      <span className="truncate mr-2">{left}</span>
      <span className="flex-shrink-0 font-semibold tabular-nums">{right}</span>
    </div>
  );
}
