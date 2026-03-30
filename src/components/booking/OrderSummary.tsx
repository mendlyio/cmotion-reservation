"use client";

import { BookingFormData, TableWithSeats, calculateTotal, getMealPrice, MEAL_OPTIONS, DESSERT_PRICE, DESSERT_LABEL, VIP_TABLE_PRICE, DANCER_MEAL_OPTIONS } from "@/types";

interface Props {
  data: BookingFormData;
  tables?: TableWithSeats[];
}

export function OrderSummary({ data, tables = [] }: Props) {
  const total = calculateTotal(data);

  const tableLabel = tables.length > 1
    ? `Tables ${tables.map((t) => `${t.rowNumber}-${t.tableNumber}`).join(", ")}`
    : tables.length === 1
    ? `Table ${tables[0].rowNumber}-${tables[0].tableNumber}`
    : "—";

  // Find seat across all tables
  const findSeatLabel = (seatId: number) => {
    for (const t of tables) {
      const s = t.seats.find((s) => s.id === seatId);
      if (s) return tables.length > 1 ? `${t.rowNumber}-${t.tableNumber} S${s.seatNumber}` : `${s.seatNumber}`;
    }
    return undefined;
  };

  const dancerMeals = data.upsells.filter((u) => u.type === "repas_danseur");

  return (
    <div className="rounded-xl border border-[#1e1a0e] bg-[#0f0f0f] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <p className="text-xs font-bold text-[#888] uppercase tracking-widest">Récapitulatif</p>
        <p className="text-xs text-[#555]">
          <span className="font-semibold text-[#aaa]">{tableLabel}</span>
          {data.isVip && (
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30">
              VIP
            </span>
          )}
          {!data.isVip && tables.length > 1 && (
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
              Multi-table
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
                  <span>★</span> Bulles, zakouski, repas et {DESSERT_LABEL} inclus
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
            const seatLabel = findSeatLabel(g.seatId);
            const fullName = [g.firstName, g.lastName].filter(Boolean).join(" ") || `Convive ${i + 1}`;

            return (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {seatLabel && (
                        <span className="shrink-0 h-5 px-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] text-[10px] font-bold flex items-center justify-center">
                          {seatLabel}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                    </div>
                    <p className="text-[11px] text-[#555] mt-0.5 ml-7">{m?.label || "—"}</p>
                    {g.hasDessert && (
                      <p className="text-[11px] text-[#c9a227]/70 mt-0.5 ml-7 flex items-center gap-1">
                        <span>+</span> {DESSERT_LABEL}{" "}
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

        {dancerMeals.length > 0 && (
          <div className="px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Repas Danseur</p>
            {dancerMeals.map((u, i) => {
              const opt = DANCER_MEAL_OPTIONS.find((o) => o.value === u.mealChoice);
              if (!opt) return null;
              return (
                <div key={i} className="flex justify-between items-center text-sm text-[#888]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#c9a227]/15 text-[#c9a227] text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                    {opt.label}
                  </span>
                  <span className="font-semibold tabular-nums text-white">{(opt.price / 100).toFixed(2)}€</span>
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

      {/* Non remboursable */}
      <div className="px-4 py-2.5 bg-[#0a0a0a] border-t border-[#1a1a1a]">
        <p className="text-[10px] text-[#444] text-center">
          🔒 Non remboursable · Non annulable · Non modifiable
        </p>
      </div>
    </div>
  );
}
