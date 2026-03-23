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
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-slate-800 mb-4">Récapitulatif</h3>

      {data.isVip ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Table VIP complète (8 pers.)</span>
            <span className="font-semibold">
              {(VIP_TABLE_PRICE / 100).toFixed(2)}€
            </span>
          </div>
          <p className="text-xs text-amber-600">
            Inclus : verre de bulles, zakouski, dessert
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.guests.map((guest, i) => {
            const meal = MEAL_OPTIONS.find(
              (m) => m.value === guest.mealChoice
            );
            const mealPrice = getMealPrice(guest.mealChoice);
            return (
              <div key={i} className="text-sm">
                <div className="flex justify-between">
                  <span>
                    {guest.firstName || "Convive"} {guest.lastName || i + 1} —{" "}
                    {meal?.label || "Repas"}
                  </span>
                  <span>{(mealPrice / 100).toFixed(2)}€</span>
                </div>
                {guest.hasDessert && (
                  <div className="flex justify-between text-slate-500 ml-4">
                    <span>+ Tiramisu</span>
                    <span>{(DESSERT_PRICE / 100).toFixed(2)}€</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data.upsells.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1">
          {data.upsells.map((upsell) => {
            const option = UPSELL_OPTIONS.find(
              (o) => o.type === upsell.type
            );
            if (!option || upsell.quantity === 0) return null;
            return (
              <div key={upsell.type} className="flex justify-between text-sm">
                <span>
                  {option.label} ×{upsell.quantity}
                </span>
                <span>
                  {((option.price * upsell.quantity) / 100).toFixed(2)}€
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t flex justify-between items-center">
        <span className="font-bold text-lg">Total</span>
        <span className="font-bold text-2xl text-slate-900">
          {(total / 100).toFixed(2)}€
        </span>
      </div>
    </div>
  );
}
