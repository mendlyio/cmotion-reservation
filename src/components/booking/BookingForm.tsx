"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GuestForm } from "./GuestForm";
import { UpsellSection } from "./UpsellSection";
import { OrderSummary } from "./OrderSummary";
import { TableWithSeats, SeatFormData, BookingFormData, MealChoice, calculateTotal } from "@/types";

interface Props {
  eventId: number;
  table: TableWithSeats;
  selectedSeatIds: number[];
  onCancel: () => void;
}

type Step = 0 | 1 | 2;

export function BookingForm({ eventId, table, selectedSeatIds, onCancel }: Props) {
  const vip = table.isVip;
  const ids = vip ? table.seats.map((s) => s.id) : selectedSeatIds;
  const map = useRef<Map<number, SeatFormData>>(new Map());

  const [guests, setGuests] = useState<SeatFormData[]>(() => build(ids, map.current));
  const [upsells, setUpsells] = useState<{ type: string; quantity: number }[]>([]);
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(0);

  useEffect(() => {
    for (const g of guests) map.current.set(g.seatId, g);
    setGuests(build(ids, map.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeatIds.join(",")]);

  const data: BookingFormData = {
    eventId, tableId: table.id, seatIds: ids, isVip: vip,
    guests, upsells, referentStudent: ref, email, phone,
  };
  const gOk = guests.every((g) => g.firstName && g.lastName && g.mealChoice);
  const cOk = !!ref && !!email;
  const total = calculateTotal(data);

  const pay = async (sim: boolean) => {
    setLoading(true); setError(null);
    try {
      const rr = await fetch("/api/reservation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!rr.ok) throw new Error((await rr.json()).error);
      const { reservationId, totalAmount } = await rr.json();
      if (sim || totalAmount === 0) {
        if (sim) { const p = await fetch("/api/stripe/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reservationId }) }); if (!p.ok) throw new Error("Erreur"); }
        window.location.href = `/confirmation/${reservationId}`; return;
      }
      const sr = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reservationId }) });
      if (!sr.ok) throw new Error((await sr.json()).error);
      const { url } = await sr.json();
      if (url) window.location.href = url;
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  };

  const STEPS = [
    { emoji: "👤", label: "Convives", done: gOk },
    { emoji: "✨", label: "Contact", done: cOk },
    { emoji: "💳", label: "Payer", done: false },
  ];

  return (
    <div className="bg-white">
      {/* Header — same #0a0a14 as the page, seamless */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: "#0a0a14", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm">
              Table {table.rowNumber}-{table.tableNumber}
            </span>
            {vip && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(192,132,252,0.15)", color: "#c084fc" }}
              >
                VIP
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            {vip ? "8 places · 280€ tout inclus" : `${ids.length} siège(s) · remontez pour en ajouter`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-extrabold text-lg tabular-nums" style={{ color: "#c084fc" }}>
            {(total / 100).toFixed(2)}€
          </span>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Step tabs — white with slate accents */}
      <div className="flex border-b border-slate-100">
        {STEPS.map((s, i) => {
          const active = step === i;
          const done = s.done && i < step;
          return (
            <button
              key={i}
              onClick={() => setStep(i as Step)}
              className="flex-1 py-3 text-center text-[11px] font-bold uppercase tracking-wider transition-colors relative"
              style={{ color: active ? "#1e293b" : done ? "#10b981" : "#cbd5e1" }}
            >
              <span className="mr-1">{done ? "✓" : s.emoji}</span>
              {s.label}
              {active && (
                <motion.div
                  layoutId="tab-ind"
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: "#c084fc" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }} className="space-y-3">
              {vip && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl text-xs text-purple-700 font-medium">
                  <span>★</span> Bulles, zakouski et dessert inclus
                </div>
              )}
              {!vip && (
                <p className="text-[11px] text-blue-500 bg-blue-50 px-3 py-2 rounded-xl">
                  Vous pouvez encore ajouter des sièges en cliquant sur le plan ci-dessus
                </p>
              )}
              <AnimatePresence initial={false}>
                {guests.map((g, i) => {
                  const seat = table.seats.find((s) => s.id === g.seatId);
                  return (
                    <motion.div key={g.seatId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.12 }}>
                      <GuestForm index={i} seatId={g.seatId} seatLabel={`S${seat?.seatNumber || i + 1}`} data={g} isVip={vip}
                        onChange={(u) => { const n = [...guests]; n[i] = u; setGuests(n); map.current.set(u.seatId, u); }} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }} className="space-y-4">
              <UpsellSection upsells={upsells} onChange={setUpsells} />
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Contact</p>
                <Field label="Élève référent" value={ref} set={setRef} placeholder="Nom de l'élève" required />
                <Field label="Email" value={email} set={setEmail} placeholder="votre@email.com" type="email" required />
                <Field label="Téléphone" value={phone} set={setPhone} placeholder="06 12 34 56 78" type="tel" />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }} className="space-y-4">
              <OrderSummary data={data} />
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-5">
        {step < 2 ? (
          <button
            onClick={() => setStep((step + 1) as Step)}
            disabled={step === 0 ? !gOk : !cOk}
            className="w-full h-12 text-white text-sm font-bold rounded-xl disabled:opacity-20 active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          >
            Continuer
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => pay(false)} disabled={!cOk || loading}
              className="flex-1 h-12 text-white text-sm font-bold rounded-xl disabled:opacity-20 active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}>
              {loading ? "Traitement…" : `Payer ${(total / 100).toFixed(2)}€`}
            </button>
            <button onClick={() => pay(true)} disabled={!cOk || loading}
              className="h-12 px-4 bg-slate-100 text-slate-500 text-[11px] font-bold rounded-xl disabled:opacity-20 active:scale-[0.98] transition-all">
              Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, set, placeholder, type = "text", required }: {
  label: string; value: string; set: (v: string) => void; placeholder: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input type={type} autoComplete={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
        value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 focus:bg-white transition-all" />
    </div>
  );
}

function build(ids: number[], m: Map<number, SeatFormData>): SeatFormData[] {
  return ids.map((id) => m.get(id) || { seatId: id, firstName: "", lastName: "", mealChoice: "lasagne" as MealChoice, hasDessert: false });
}
