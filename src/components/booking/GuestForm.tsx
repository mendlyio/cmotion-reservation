"use client";

import { MEAL_OPTIONS, DESSERT_PRICE, MealChoice, SeatFormData } from "@/types";

interface Props {
  index: number;
  seatId: number;
  seatLabel: string;
  data: SeatFormData;
  isVip: boolean;
  onChange: (data: SeatFormData) => void;
}

const inputClass = (value: string) =>
  `h-11 px-3 rounded-lg border text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all bg-slate-50/50 ${
    value.trim() === ""
      ? "border-red-300 bg-red-50/30"
      : "border-slate-200"
  }`;

export function GuestForm({ index, seatLabel, data, isVip, onChange }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
            data.firstName && data.lastName ? "bg-indigo-500" : "bg-slate-300"
          }`}>
            {data.firstName && data.lastName ? "✓" : index + 1}
          </div>
          <span className="text-xs font-semibold text-slate-600">Convive {index + 1}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">{seatLabel}</span>
      </div>

      <div className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Prénom <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoComplete="given-name"
              value={data.firstName}
              onChange={(e) => onChange({ ...data, firstName: e.target.value })}
              placeholder="Prénom"
              className={`w-full ${inputClass(data.firstName)}`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Nom <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoComplete="family-name"
              value={data.lastName}
              onChange={(e) => onChange({ ...data, lastName: e.target.value })}
              placeholder="Nom"
              className={`w-full ${inputClass(data.lastName)}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Choix du plat <span className="text-red-400">*</span>
          </label>
          <select
            value={data.mealChoice}
            onChange={(e) => onChange({ ...data, mealChoice: e.target.value as MealChoice })}
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all"
          >
            {MEAL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {(m.price / 100).toFixed(0)}€
              </option>
            ))}
          </select>
        </div>

        {!isVip && (
          <label className="flex items-center gap-3 py-1 cursor-pointer active:opacity-70 select-none">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={data.hasDessert}
                onChange={(e) => onChange({ ...data, hasDessert: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-indigo-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm text-slate-600">
              Tiramisu <span className="text-slate-400">(+{(DESSERT_PRICE / 100).toFixed(2)}€)</span>
            </span>
          </label>
        )}

        {isVip && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1.5">
            <span>★</span> Dessert inclus
          </p>
        )}
      </div>
    </div>
  );
}
