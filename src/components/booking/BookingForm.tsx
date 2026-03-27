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
  const [phoneTouched, setPhoneTouched] = useState(false);

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
    if (loading) return;
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
    { label: "Convives", done: gOk },
    { label: "Contact", done: cOk },
    { label: "Payer", done: false },
  ];

  return (
    <div>
      {/* Header bar */}
      <div className="bg-gradient-to-r from-[#141400] to-[#0f0f0f] border-b border-[#c9a227]/15 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">Table {table.rowNumber}-{table.tableNumber}</span>
            {vip && (
              <span className="bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                VIP ★
              </span>
            )}
          </div>
          <p className="text-[#555] text-[11px] mt-0.5">
            {vip ? "8 places · 280€ tout inclus" : `${ids.length} ${ids.length > 1 ? "sièges sélectionnés" : "siège sélectionné"}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#c9a227] font-extrabold text-lg tabular-nums">{(total / 100).toFixed(2)}€</span>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-[#1a1a1a] hover:bg-red-500/15 border border-[#2a2a2a] hover:border-red-500/30 flex items-center justify-center text-[#555] hover:text-red-400 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i as Step)}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-all relative ${
              step === i
                ? "text-[#c9a227]"
                : s.done && i < step
                ? "text-emerald-500"
                : "text-[#444]"
            }`}
          >
            {s.done && i < step ? "✓ " : ""}{s.label}
            {step === i && (
              <motion.div
                layoutId="tab"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-[#c9a227] to-[#a07818] rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }} className="space-y-3">
              {vip && (
                <div className="flex items-center gap-2 p-3 bg-[#c9a227]/8 border border-[#c9a227]/20 rounded-xl text-xs text-[#c9a227] font-medium">
                  <span>★</span> Bulles, zakouski et dessert inclus
                </div>
              )}
              {!vip && (
                <p className="text-[11px] text-[#c9a227]/70 bg-[#c9a227]/5 border border-[#c9a227]/15 px-3 py-2 rounded-xl">
                  Vous pouvez encore ajouter des sièges en cliquant sur le plan ci-dessus
                </p>
              )}
              <p className="text-[11px] text-[#555] bg-[#141414] border border-[#1e1e1e] px-3 py-2 rounded-xl">
                Veuillez choisir un plat pour chaque convive ci-dessous.
              </p>
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
                <p className="text-xs font-bold text-[#888] uppercase tracking-widest">Contact</p>
                <Field label="Élève référent" value={ref} set={setRef} placeholder="Nom de l'élève" required />
                <Field label="Email" value={email} set={setEmail} placeholder="votre@email.com" type="email" required />
                {/* Phone with country prefix */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-widest mb-1.5">
                    Téléphone <span className="text-red-400">*</span>
                  </label>
                  <div className={`flex rounded-xl border overflow-hidden transition-all focus-within:border-[#c9a227]/50 focus-within:ring-1 focus-within:ring-[#c9a227]/20 ${
                    !phoneTouched || phoneLocal.trim() ? "border-[#2a2a2a]" : "border-red-500/30 bg-red-500/5"
                  }`}>
                    <select
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="h-12 pl-3 pr-2 bg-[#141414] text-sm text-[#aaa] font-semibold border-r border-[#2a2a2a] focus:outline-none appearance-none cursor-pointer shrink-0"
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
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="470 12 34 56"
                      className="flex-1 h-12 px-3 bg-[#0f0f0f] text-sm text-white placeholder-[#333] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }} className="space-y-4">
              <OrderSummary data={data} table={table} />
              {error && (
                <div className="p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}
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
            className="w-full h-12 bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black text-sm font-bold rounded-xl disabled:opacity-25 active:scale-[0.98] transition-all shadow-lg shadow-[#c9a227]/20"
          >
            Continuer
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => pay(false)}
              disabled={!cOk || loading}
              className="flex-1 h-12 bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black text-sm font-bold rounded-xl disabled:opacity-25 active:scale-[0.98] transition-all shadow-lg shadow-[#c9a227]/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Traitement…
                </span>
              ) : `Payer ${(total / 100).toFixed(2)}€`}
            </button>
            {process.env.NODE_ENV !== "production" && (
              <button
                onClick={() => pay(true)}
                disabled={!cOk || loading}
                className="h-12 px-4 bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] text-[11px] font-bold rounded-xl disabled:opacity-25 active:scale-[0.98] transition-all"
              >
                Test
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, set, placeholder, type = "text", required }: {
  label: string; value: string; set: (v: string) => void; placeholder: string; type?: string; required?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const invalid = required && touched && value.trim() === "";
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        autoComplete={type === "email" ? "email" : undefined}
        value={value}
        onChange={(e) => set(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 rounded-xl border text-sm text-white placeholder-[#333] focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30 focus:border-[#c9a227]/50 transition-all ${
          invalid
            ? "border-red-500/30 bg-red-500/5"
            : "border-[#2a2a2a] bg-[#141414]"
        }`}
      />
    </div>
  );
}

function build(ids: number[], m: Map<number, SeatFormData>): SeatFormData[] {
  return ids.map((id) => m.get(id) || { seatId: id, firstName: "", lastName: "", mealChoice: "lasagne" as MealChoice, hasDessert: false });
}
