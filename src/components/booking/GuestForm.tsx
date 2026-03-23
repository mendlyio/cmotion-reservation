"use client";

import { MEAL_OPTIONS, DESSERT_PRICE, MealChoice, SeatFormData } from "@/types";

interface GuestFormProps {
  index: number;
  seatId: number;
  seatLabel: string;
  data: SeatFormData;
  isVip: boolean;
  onChange: (data: SeatFormData) => void;
}

export function GuestForm({
  index,
  seatId,
  seatLabel,
  data,
  isVip,
  onChange,
}: GuestFormProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">
          Convive {index + 1}
        </span>
        <span className="text-xs text-slate-400">{seatLabel}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Name fields — stacked on tiny screens, side by side otherwise */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`first-${seatId}`}
              className="block text-xs font-medium text-slate-500 mb-1"
            >
              Prénom
            </label>
            <input
              id={`first-${seatId}`}
              type="text"
              autoComplete="given-name"
              value={data.firstName}
              onChange={(e) =>
                onChange({ ...data, firstName: e.target.value })
              }
              placeholder="Prénom"
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
            />
          </div>
          <div>
            <label
              htmlFor={`last-${seatId}`}
              className="block text-xs font-medium text-slate-500 mb-1"
            >
              Nom
            </label>
            <input
              id={`last-${seatId}`}
              type="text"
              autoComplete="family-name"
              value={data.lastName}
              onChange={(e) =>
                onChange({ ...data, lastName: e.target.value })
              }
              placeholder="Nom"
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
            />
          </div>
        </div>

        {/* Meal choice — native select for perfect mobile UX */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Choix du plat
          </label>
          <select
            value={data.mealChoice}
            onChange={(e) =>
              onChange({
                ...data,
                mealChoice: e.target.value as MealChoice,
              })
            }
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
          >
            {MEAL_OPTIONS.map((meal) => (
              <option key={meal.value} value={meal.value}>
                {meal.label} — {(meal.price / 100).toFixed(0)}€
              </option>
            ))}
          </select>
        </div>

        {/* Dessert toggle */}
        {!isVip && (
          <label className="flex items-center gap-3 py-2 cursor-pointer active:opacity-70">
            <div className="relative">
              <input
                type="checkbox"
                checked={data.hasDessert}
                onChange={(e) =>
                  onChange({ ...data, hasDessert: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm text-slate-700">
              Tiramisu{" "}
              <span className="text-slate-400">
                (+{(DESSERT_PRICE / 100).toFixed(2)}€)
              </span>
            </span>
          </label>
        )}

        {isVip && (
          <div className="flex items-center gap-2 py-1">
            <span className="text-amber-500">★</span>
            <span className="text-xs text-amber-700">
              Bulles, zakouski et dessert inclus
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
