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
  const [phonePrefix, setPhonePrefix] = useState("+32");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(0);

  const phone = phoneLocal.trim() ? `${phonePrefix} ${phoneLocal.trim()}` : "";

  useEffect(() => {
    for (const g of guests) map.current.set(g.seatId, g);
    setGuests(build(ids, map.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeatIds.join(",")]);

  const data: BookingFormData = {
    eventId, tableId: table.id, seatIds: ids, isVip: vip,
    guests, upsells, referentStudent: ref, email, phone,
  };
  const gOk = guests.every((g) => g.firstName.trim() && g.lastName.trim() && g.mealChoice);
  const cOk = !!ref.trim() && !!email.trim() && !!phoneLocal.trim();
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
    <div>
      {/* Header bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">Table {table.rowNumber}-{table.tableNumber}</span>
            {vip && <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">VIP</span>}
          </div>
          <p className="text-white/40 text-[11px] mt-0.5">
            {vip ? "8 places · 280€ tout inclus" : `${ids.length} ${ids.length > 1 ? "sièges sélectionnés" : "siège sélectionné"}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white font-extrabold text-lg tabular-nums">{(total / 100).toFixed(2)}€</span>
          <button onClick={onCancel} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:text-red-300 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex border-b border-slate-100">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i as Step)}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-all relative ${
              step === i ? "text-slate-900" : s.done && i < step ? "text-emerald-600" : "text-slate-300"
            }`}
          >
            <span className="mr-1">{s.done && i < step ? "✓" : s.emoji}</span>
            {s.label}
            {step === i && <motion.div layoutId="tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-slate-900 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }} className="space-y-3">
              {vip && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 font-medium">
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
                <Field
                  label="Élève référent"
                  value={ref}
                  set={setRef}
                  placeholder="Nom de l'élève"
                  required
                />
                <Field
                  label="Email"
                  value={email}
                  set={setEmail}
                  placeholder="votre@email.com"
                  type="email"
                  required
                />
                {/* Téléphone avec préfixe pays */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Téléphone <span className="text-red-400">*</span>
                  </label>
                  <div className={`flex rounded-xl border overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 ${
                    phoneLocal.trim() ? "border-slate-200" : "border-red-300 bg-red-50/20"
                  }`}>
                    <select
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="h-12 pl-3 pr-2 bg-slate-50 text-sm text-slate-700 font-semibold border-r border-slate-200 focus:outline-none appearance-none cursor-pointer shrink-0"
                      style={{ backgroundImage: "none" }}
                    >
                      <option value="+32">🇧🇪 +32</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+352">🇱🇺 +352</option>
                    </select>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phoneLocal}
                      onChange={(e) => setPhoneLocal(e.target.value)}
                      placeholder="470 12 34 56"
                      className="flex-1 h-12 px-3 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
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
            className="w-full h-12 bg-slate-900 text-white text-sm font-bold rounded-xl disabled:opacity-20 active:scale-[0.98] transition-all"
          >
            Continuer
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => pay(false)} disabled={!cOk || loading}
              className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold rounded-xl disabled:opacity-20 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20">
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
  const empty = required && value.trim() === "";
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        autoComplete={type === "email" ? "email" : undefined}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 rounded-xl border text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all ${
          empty ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-slate-50/50"
        }`}
      />
    </div>
  );
}

function build(ids: number[], m: Map<number, SeatFormData>): SeatFormData[] {
  return ids.map((id) => m.get(id) || { seatId: id, firstName: "", lastName: "", mealChoice: "lasagne" as MealChoice, hasDessert: false });
}
