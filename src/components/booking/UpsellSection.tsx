"use client";

import { DANCER_MEAL_OPTIONS } from "@/types";

interface DancerMeal {
  type: "repas_danseur";
  quantity: number;
  mealChoice: string;
}

interface Props {
  upsells: { type: string; quantity: number; mealChoice?: string }[];
  onChange: (u: { type: string; quantity: number; mealChoice?: string }[]) => void;
}

export function UpsellSection({ upsells, onChange }: Props) {
  const dancerMeals = upsells.filter((u): u is DancerMeal => u.type === "repas_danseur");
  const others = upsells.filter((u) => u.type !== "repas_danseur");

  const addDancer = () => {
    onChange([...others, ...dancerMeals, {
      type: "repas_danseur",
      quantity: 1,
      mealChoice: DANCER_MEAL_OPTIONS[0].value,
    }]);
  };

  const removeDancer = (index: number) => {
    const updated = dancerMeals.filter((_, i) => i !== index);
    onChange([...others, ...updated]);
  };

  const updateMeal = (index: number, mealChoice: string) => {
    const updated = dancerMeals.map((u, i) => i === index ? { ...u, mealChoice } : u);
    onChange([...others, ...updated]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#888] uppercase tracking-widest">Repas Danseur</p>
        <p className="text-[11px] text-[#555]">Optionnel</p>
      </div>

      <div className="rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] p-3 space-y-1">
        <p className="text-[11px] text-[#555]">Commandez un repas pour les danseurs.</p>
        {DANCER_MEAL_OPTIONS.map((o) => (
          <p key={o.value} className="text-[11px] text-[#444]">
            · {o.label} — {(o.price / 100).toFixed(0)}€
          </p>
        ))}
      </div>

      {dancerMeals.length > 0 && (
        <div className="space-y-2">
          {dancerMeals.map((dm, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] px-3 py-2.5">
              <div className="w-6 h-6 rounded-full bg-[#c9a227]/15 text-[#c9a227] text-[10px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <select
                value={dm.mealChoice}
                onChange={(e) => updateMeal(i, e.target.value)}
                className="flex-1 h-9 px-2 rounded-lg border border-[#2a2a2a] bg-[#141414] text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30"
                style={{ backgroundImage: "none" }}
              >
                {DANCER_MEAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {(o.price / 100).toFixed(0)}€
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeDancer(i)}
                className="w-8 h-8 rounded-lg border border-[#2a2a2a] text-[#555] hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/8 transition text-sm font-bold shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addDancer}
        className="w-full h-10 rounded-xl border border-dashed border-[#c9a227]/30 bg-[#c9a227]/5 text-[#c9a227] text-sm font-semibold hover:bg-[#c9a227]/10 hover:border-[#c9a227]/50 transition active:scale-[0.98]"
      >
        + Ajouter un repas danseur
      </button>
    </div>
  );
}
