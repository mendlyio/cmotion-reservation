"use client";

import { useState } from "react";
import { DESSERT_LABEL, MEAL_OPTIONS, VIP_FORMULA, VIP_MEAL, mealLabel } from "@/lib/pricing";
import {
  MEAL_EDIT_MESSAGE,
  dessertEditable,
  editableDancerMeals,
  editableGuestMeals,
} from "@/lib/meals";
import { PolicyNotice } from "@/components/PolicyNotice";

export interface EditorGuest {
  id: number;
  name: string;
  place: string;
  mealChoice: string;
  hasDessert: boolean;
}

export interface EditorUpsell {
  id: number;
  mealChoice: string;
  quantity: number;
}

export function MealEditor({
  token,
  isVip,
  deadlineLabel,
  editable,
  closedReason,
  guests,
  upsells,
  totalAmount,
}: {
  token: string;
  isVip: boolean;
  deadlineLabel: string;
  editable: boolean;
  closedReason?: string;
  guests: EditorGuest[];
  upsells: EditorUpsell[];
  totalAmount: number;
}) {
  const [rows, setRows] = useState(guests);
  const [extras, setExtras] = useState(upsells);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/reservation/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          guests: rows.map((row) => ({
            id: row.id,
            mealChoice: isVip ? VIP_MEAL : row.mealChoice,
            hasDessert: isVip ? true : row.hasDessert,
          })),
          upsells: extras.map((extra) => ({ id: extra.id, mealChoice: extra.mealChoice })),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Modification impossible");
      setMessage("Les plats sont enregistrés. Le montant payé reste le même.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PolicyNotice deadlineLabel={deadlineLabel} />
      {closedReason ? (
        <p className="rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 text-sm text-[#ccc]">{closedReason}</p>
      ) : null}
      <p className="rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 text-sm text-[#ccc]">{MEAL_EDIT_MESSAGE}</p>
      {isVip ? (
        <p className="rounded-xl border border-[#c9a227]/30 bg-[#1a1500] px-4 py-3 text-sm text-[#e4c76b]">{VIP_FORMULA}</p>
      ) : null}
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{row.name}</p>
              <span className="text-xs font-mono text-[#c9a227]">{row.place}</span>
            </div>
            {isVip ? (
              <p className="text-sm text-[#aaa]">Sans plat · dessert inclus</p>
            ) : (
              <GuestMealFields
                editable={editable}
                row={row}
                onMeal={(mealChoice) => {
                  const next = [...rows];
                  next[index] = { ...row, mealChoice };
                  setRows(next);
                }}
              />
            )}
          </div>
        ))}
      </div>
      {extras.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#666]">Repas élèves</p>
          {extras.map((extra, index) => {
            const options = editableDancerMeals(extra.mealChoice);
            const locked = !editable || options.length < 2;
            return (
              <div key={extra.id} className="flex items-center gap-3">
                <span className="text-xs text-[#888] w-16">×{extra.quantity}</span>
                <select
                  disabled={locked}
                  value={extra.mealChoice}
                  onChange={(event) => {
                    const next = [...extras];
                    next[index] = { ...extra, mealChoice: event.target.value };
                    setExtras(next);
                  }}
                  className="flex-1 h-11 px-3 rounded-lg border border-[#2a2a2a] bg-[#141414] text-sm text-white disabled:opacity-60"
                >
                  {(options.length > 0 ? options : [{ value: extra.mealChoice, label: mealLabel(extra.mealChoice) }]).map((meal) => (
                    <option key={meal.value} value={meal.value}>
                      {meal.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="text-sm text-[#888]">
        Montant déjà payé : <span className="font-bold text-[#c9a227]">{(totalAmount / 100).toFixed(2)} €</span>. Cette page ne modifie ni les places ni ce montant.
      </p>
      {editable ? (
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black text-sm font-bold disabled:opacity-40"
        >
          {loading ? "Enregistrement…" : "Enregistrer les plats"}
        </button>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

function GuestMealFields({
  editable,
  row,
  onMeal,
}: {
  editable: boolean;
  row: EditorGuest;
  onMeal: (mealChoice: string) => void;
}) {
  const options = editableGuestMeals(row);
  const locked = !editable || options.length < 2;
  const description = MEAL_OPTIONS.find((meal) => meal.value === row.mealChoice)?.description;
  return (
    <>
      <select
        disabled={locked}
        value={row.mealChoice}
        onChange={(event) => onMeal(event.target.value)}
        className="w-full h-11 px-3 rounded-lg border border-[#2a2a2a] bg-[#141414] text-sm text-white disabled:opacity-60"
      >
        {(options.length > 0 ? options : [{ value: row.mealChoice, label: mealLabel(row.mealChoice) }]).map((meal) => (
          <option key={meal.value} value={meal.value}>
            {meal.label}
          </option>
        ))}
      </select>
      {locked && editable ? (
        <p className="text-[11px] text-[#777]">Ce plat n&apos;a pas d&apos;équivalent au même prix : il reste inchangé.</p>
      ) : null}
      {description ? <p className="text-[11px] text-[#777]">{description}</p> : null}
      <label className="flex items-center gap-2 text-sm text-[#aaa]">
        <input
          type="checkbox"
          disabled={!editable || !dessertEditable()}
          checked={row.hasDessert}
          onChange={() => undefined}
        />
        {row.hasDessert
          ? `${DESSERT_LABEL} inclus. Il ne peut pas être retiré après le paiement.`
          : `${DESSERT_LABEL} non compris. Il ne peut pas être ajouté après le paiement.`}
      </label>
    </>
  );
}
