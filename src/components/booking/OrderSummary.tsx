"use client";

import { BookingFormData, TableWithSeats, calculateTotal, getMealPrice, MEAL_OPTIONS, DESSERT_PRICE, VIP_TABLE_PRICE, UPSELL_OPTIONS } from "@/types";

interface Props {
  data: BookingFormData;
  table?: TableWithSeats;
}

export function OrderSummary({ data, table }: Props) {
  const total = calculateTotal(data);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Récapitulatif</p>
        <p className="text-xs text-slate-400">
          Table{" "}
          <span className="font-semibold text-slate-700">
            {data.tableId ? `${table?.rowNumber ?? "—"}-${table?.tableNumber ?? "—"}` : "—"}
          </span>
          {data.isVip && (
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              VIP
            </span>
          )}
        </p>
      </div>

      <div className="divide-y divide-slate-50">
        {data.isVip ? (
          <div className="p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-sm font-semibold text-slate-800">Table VIP · 8 personnes</p>
                <p className="text-[11px] text-amber-600 mt-0.5">★ Bulles, zakouski et dessert inclus</p>
              </div>
              <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0 ml-3">
                {(VIP_TABLE_PRICE / 100).toFixed(2)}€
              </span>
            </div>
          </div>
        ) : (
          data.guests.map((g, i) => {
            const m = MEAL_OPTIONS.find((x) => x.value === g.mealChoice);
            const p = getMealPrice(g.mealChoice);
            const seatNumber = table?.seats.find((s) => s.id === g.seatId)?.seatNumber;
            const fullName = [g.firstName, g.lastName].filter(Boolean).join(" ") || `Convive ${i + 1}`;

            return (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {seatNumber && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                          {seatNumber}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 ml-7">{m?.label || "—"}</p>
                    {g.hasDessert && (
                      <p className="text-[11px] text-indigo-500 mt-0.5 ml-7 flex items-center gap-1">
                        <span>+</span> Tiramisu{" "}
                        <span className="text-slate-400 font-normal">
                          ({(DESSERT_PRICE / 100).toFixed(2)}€)
                        </span>
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                    {((p + (g.hasDessert ? DESSERT_PRICE : 0)) / 100).toFixed(2)}€
                  </span>
                </div>
              </div>
            );
          })
        )}

        {data.upsells.filter((u) => u.quantity > 0).length > 0 && (
          <div className="px-4 py-3 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Extras</p>
            {data.upsells.filter((u) => u.quantity > 0).map((u) => {
              const o = UPSELL_OPTIONS.find((x) => x.type === u.type);
              if (!o) return null;
              return (
                <div key={u.type} className="flex justify-between items-center text-sm text-slate-600">
                  <span>{o.label} <span className="text-slate-400">×{u.quantity}</span></span>
                  <span className="font-semibold tabular-nums">{((o.price * u.quantity) / 100).toFixed(2)}€</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-slate-900 flex justify-between items-center">
        <div>
          <span className="text-xs text-white/40">Total à payer</span>
          {!data.isVip && data.guests.length > 1 && (
            <p className="text-[10px] text-white/25">
              {data.guests.length} convives
            </p>
          )}
        </div>
        <span className="text-xl font-extrabold text-white tabular-nums">{(total / 100).toFixed(2)}€</span>
      </div>
    </div>
  );
}
