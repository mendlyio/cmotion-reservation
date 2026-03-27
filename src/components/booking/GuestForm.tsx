"use client";

import { useState } from "react";
import { MEAL_OPTIONS, DESSERT_PRICE, MealChoice, SeatFormData } from "@/types";

interface Props {
  index: number;
  seatId: number;
  seatLabel: string;
  data: SeatFormData;
  isVip: boolean;
  onChange: (data: SeatFormData) => void;
}

const inputClass = (value: string, touched: boolean) =>
  `w-full h-11 px-3 rounded-lg border text-sm text-white placeholder-[#333] focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30 focus:border-[#c9a227]/50 transition-all ${
    touched && value.trim() === ""
      ? "border-red-500/30 bg-red-500/5"
      : "border-[#2a2a2a] bg-[#141414]"
  }`;

export function GuestForm({ index, seatLabel, data, isVip, onChange }: Props) {
  const [touched, setTouched] = useState({ firstName: false, lastName: false });
  const done = !!data.firstName && !!data.lastName;

  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors ${
        done
          ? "bg-gradient-to-r from-[#1a1400] to-[#0f0c00] border-[#c9a227]/25"
          : "bg-[#141414] border-[#1e1e1e]"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center transition-all ${
            done
              ? "bg-[#c9a227]/20 text-[#c9a227] border border-[#c9a227]/40"
              : "bg-[#1a1a1a] text-[#555] border border-[#2a2a2a]"
          }`}>
            {done ? "✓" : index + 1}
          </div>
          <span className={`text-xs font-bold tracking-wide transition-colors ${done ? "text-[#c9a227]" : "text-[#666]"}`}>
            Convive {index + 1}
            {done && (
              <span className="ml-2 font-normal text-[#c9a227]/60">
                — {data.firstName} {data.lastName}
              </span>
            )}
          </span>
        </div>
        <span className={`text-[10px] font-mono transition-colors ${done ? "text-[#c9a227]/40" : "text-[#333]"}`}>
          {seatLabel}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-1">
              Prénom <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoComplete="given-name"
              value={data.firstName}
              onChange={(e) => onChange({ ...data, firstName: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
              placeholder="Prénom"
              className={inputClass(data.firstName, touched.firstName)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-1">
              Nom <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoComplete="family-name"
              value={data.lastName}
              onChange={(e) => onChange({ ...data, lastName: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
              placeholder="Nom"
              className={inputClass(data.lastName, touched.lastName)}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-1">
            Choix du plat <span className="text-red-400">*</span>
          </label>
          <select
            value={data.mealChoice}
            onChange={(e) => onChange({ ...data, mealChoice: e.target.value as MealChoice })}
            className="w-full h-11 px-3 rounded-lg border border-[#2a2a2a] bg-[#141414] text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30 focus:border-[#c9a227]/50 transition-all"
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
              <div className="w-10 h-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full peer-checked:bg-[#c9a227]/30 peer-checked:border-[#c9a227]/50 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-[#444] rounded-full shadow-sm transition-all peer-checked:translate-x-4 peer-checked:bg-[#c9a227]" />
            </div>
            <span className="text-sm text-[#888]">
              Tiramisu <span className="text-[#555]">(+{(DESSERT_PRICE / 100).toFixed(2)}€)</span>
            </span>
          </label>
        )}

        {isVip && (
          <p className="text-[11px] text-[#c9a227]/70 flex items-center gap-1.5">
            <span className="text-[#c9a227]">★</span> Dessert inclus
          </p>
        )}
      </div>
    </div>
  );
}
