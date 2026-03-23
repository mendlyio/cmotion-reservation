"use client";

import {
  BookingFormData,
  calculateTotal,
  getMealPrice,
  MEAL_OPTIONS,
  DESSERT_PRICE,
  VIP_TABLE_PRICE,
  UPSELL_OPTIONS,
} from "@/types";

interface OrderSummaryProps {
  data: BookingFormData;
}

export function OrderSummary({ data }: OrderSummaryProps) {
  const total = calculateTotal(data);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">
          Récapitulatif
        </span>
      </div>

      <div className="p-4 space-y-2">
        {data.isVip ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">
                Table VIP complète (8 pers.)
              </span>
              <span className="font-semibold text-slate-900">
                {(VIP_TABLE_PRICE / 100).toFixed(2)}€
              </span>
            </div>
            <p className="text-[11px] text-amber-600">
              ★ Inclus : bulles, zakouski, dessert
            </p>
          </>
        ) : (
          <>
            {data.guests.map((guest, i) => {
              const meal = MEAL_OPTIONS.find(
                (m) => m.value === guest.mealChoice
              );
              const mealPrice = getMealPrice(guest.mealChoice);
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 truncate mr-2">
                      {guest.firstName || `Convive ${i + 1}`} —{" "}
                      {meal?.label || "Repas"}
                    </span>
                    <span className="flex-shrink-0 font-medium text-slate-800">
                      {(mealPrice / 100).toFixed(2)}€
                    </span>
                  </div>
                  {guest.hasDessert && (
                    <div className="flex justify-between text-xs text-slate-400 ml-3">
                      <span>+ Tiramisu</span>
                      <span>{(DESSERT_PRICE / 100).toFixed(2)}€</span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {data.upsells.length > 0 && (
          <div className="pt-2 mt-2 border-t border-dashed border-slate-200 space-y-1">
            {data.upsells.map((upsell) => {
              const option = UPSELL_OPTIONS.find(
                (o) => o.type === upsell.type
              );
              if (!option || upsell.quantity === 0) return null;
              return (
                <div
                  key={upsell.type}
                  className="flex justify-between text-sm"
                >
                  <span className="text-slate-600">
                    {option.label} ×{upsell.quantity}
                  </span>
                  <span className="font-medium text-slate-800">
                    {((option.price * upsell.quantity) / 100).toFixed(2)}€
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total bar */}
      <div className="px-4 py-3 bg-slate-900 flex justify-between items-center">
        <span className="text-sm font-semibold text-slate-300">Total</span>
        <span className="text-xl font-extrabold text-white tracking-tight">
          {(total / 100).toFixed(2)}€
        </span>
      </div>
    </div>
  );
}
