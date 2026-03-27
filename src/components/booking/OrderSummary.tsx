"use client";

import { BookingFormData, TableWithSeats, calculateTotal, getMealPrice, MEAL_OPTIONS, DESSERT_PRICE, VIP_TABLE_PRICE, UPSELL_OPTIONS } from "@/types";

interface Props {
  data: BookingFormData;
  table?: TableWithSeats;
}

export function OrderSummary({ data, table }: Props) {
  const total = calculateTotal(data);

  return (
    <div className="rounded-xl border border-[#1e1a0e] bg-[#0f0f0f] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <p className="text-xs font-bold text-[#888] uppercase tracking-widest">Récapitulatif</p>
        <p className="text-xs text-[#555]">
          Table{" "}
          <span className="font-semibold text-[#aaa]">
            {data.tableId ? `${table?.rowNumber ?? "—"}-${table?.tableNumber ?? "—"}` : "—"}
          </span>
          {data.isVip && (
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30">
              VIP
            </span>
          )}
        </p>
      </div>

      <div className="divide-y divide-[#141414]">
        {data.isVip ? (
          <div className="p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-sm font-semibold text-white">Table VIP · 8 personnes</p>
                <p className="text-[11px] text-[#c9a227]/70 mt-0.5 flex items-center gap-1">
                  <span>★</span> Bulles, zakouski et dessert inclus
                </p>
              </div>
              <span className="text-sm font-bold text-[#c9a227] tabular-nums shrink-0 ml-3">
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
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] text-[10px] font-bold flex items-center justify-center">
                          {seatNumber}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                    </div>
                    <p className="text-[11px] text-[#555] mt-0.5 ml-7">{m?.label || "—"}</p>
                    {g.hasDessert && (
                      <p className="text-[11px] text-[#c9a227]/70 mt-0.5 ml-7 flex items-center gap-1">
                        <span>+</span> Tiramisu{" "}
                        <span className="text-[#444]">({(DESSERT_PRICE / 100).toFixed(2)}€)</span>
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-white tabular-nums">
                    {((p + (g.hasDessert ? DESSERT_PRICE : 0)) / 100).toFixed(2)}€
                  </span>
                </div>
              </div>
            );
          })
        )}

        {data.upsells.filter((u) => u.quantity > 0).length > 0 && (
          <div className="px-4 py-3 space-y-1">
            <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Extras</p>
            {data.upsells.filter((u) => u.quantity > 0).map((u) => {
              const o = UPSELL_OPTIONS.find((x) => x.type === u.type);
              if (!o) return null;
              return (
                <div key={u.type} className="flex justify-between items-center text-sm text-[#888]">
                  <span>{o.label} <span className="text-[#555]">×{u.quantity}</span></span>
                  <span className="font-semibold tabular-nums text-white">{((o.price * u.quantity) / 100).toFixed(2)}€</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="px-4 py-3.5 bg-gradient-to-r from-[#1a1400] to-[#141000] border-t border-[#c9a227]/15 flex justify-between items-center">
        <div>
          <span className="text-xs text-[#666]">Total à payer</span>
          {!data.isVip && data.guests.length > 1 && (
            <p className="text-[10px] text-[#444]">{data.guests.length} convives</p>
          )}
        </div>
        <span className="text-xl font-extrabold text-[#c9a227] tabular-nums">{(total / 100).toFixed(2)}€</span>
      </div>
    </div>
  );
}
