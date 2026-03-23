"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GuestForm } from "./GuestForm";
import { UpsellSection } from "./UpsellSection";
import { OrderSummary } from "./OrderSummary";
import {
  TableWithSeats,
  SeatFormData,
  BookingFormData,
  MealChoice,
  calculateTotal,
} from "@/types";

interface BookingFormProps {
  eventId: number;
  table: TableWithSeats;
  selectedSeatIds: number[];
  onCancel: () => void;
}

type WizardStep = 0 | 1 | 2;

export function BookingForm({
  eventId,
  table,
  selectedSeatIds,
  onCancel,
}: BookingFormProps) {
  const isVip = table.isVip;
  const seatIds = isVip ? table.seats.map((s) => s.id) : selectedSeatIds;

  const guestMapRef = useRef<Map<number, SeatFormData>>(new Map());
  const [guests, setGuests] = useState<SeatFormData[]>(() =>
    buildGuestList(seatIds, guestMapRef.current)
  );
  const [upsells, setUpsells] = useState<{ type: string; quantity: number }[]>([]);
  const [referentStudent, setReferentStudent] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>(0);

  useEffect(() => {
    for (const g of guests) guestMapRef.current.set(g.seatId, g);
    setGuests(buildGuestList(seatIds, guestMapRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeatIds.join(",")]);

  const bookingData: BookingFormData = {
    eventId, tableId: table.id, seatIds, isVip, guests, upsells,
    referentStudent, email, phone,
  };

  const guestsValid = guests.every((g) => g.firstName && g.lastName && g.mealChoice);
  const contactValid = !!referentStudent && !!email;
  const total = calculateTotal(bookingData);

  const handlePay = async (simulate: boolean) => {
    if (!guestsValid || !contactValid) return;
    setLoading(true);
    setError(null);

    try {
      const resResponse = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      if (!resResponse.ok) {
        const d = await resResponse.json();
        throw new Error(d.error || "Erreur lors de la réservation");
      }
      const { reservationId, totalAmount } = await resResponse.json();

      if (simulate || totalAmount === 0) {
        if (simulate) {
          const pr = await fetch("/api/stripe/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservationId }),
          });
          if (!pr.ok) throw new Error("Erreur paiement simulé");
        }
        window.location.href = `/confirmation/${reservationId}`;
        return;
      }

      const sr = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      if (!sr.ok) {
        const d = await sr.json();
        throw new Error(d.error || "Erreur paiement");
      }
      const { url } = await sr.json();
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { label: "Convives", icon: "👤" },
    { label: "Extras", icon: "✨" },
    { label: "Paiement", icon: "💳" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Table {table.rowNumber}-{table.tableNumber}
            {isVip && <span className="text-amber-500 ml-1">★</span>}
          </h2>
          <p className="text-xs text-slate-400">
            {isVip ? "VIP · 8 places · 280€" : `${seatIds.length} siège(s) · dès 28€`}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 px-5 pb-4">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i as WizardStep)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                step === i
                  ? "bg-slate-900 text-white shadow-sm"
                  : i < step
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {isVip && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg text-xs text-amber-800 font-medium">
                  <span>★</span> Bulles, zakouski et dessert inclus
                </div>
              )}
              {!isVip && (
                <p className="text-xs text-blue-600 bg-blue-50/70 px-3 py-2 rounded-lg">
                  Cliquez sur d&apos;autres sièges pour les ajouter
                </p>
              )}
              <AnimatePresence initial={false}>
                {guests.map((guest, i) => {
                  const seat = table.seats.find((s) => s.id === guest.seatId);
                  return (
                    <motion.div
                      key={guest.seatId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <GuestForm
                        index={i}
                        seatId={guest.seatId}
                        seatLabel={`Siège ${seat?.seatNumber || i + 1}`}
                        data={guest}
                        isVip={isVip}
                        onChange={(u) => {
                          const ng = [...guests];
                          ng[i] = u;
                          setGuests(ng);
                          guestMapRef.current.set(u.seatId, u);
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <UpsellSection upsells={upsells} onChange={setUpsells} />

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">Contact</span>
                </div>
                <div className="p-4 space-y-3">
                  <InputField label="Nom de l'élève référent *" type="text" value={referentStudent} onChange={setReferentStudent} placeholder="Nom de l'élève" />
                  <InputField label="Email *" type="email" value={email} onChange={setEmail} placeholder="votre@email.com" autoComplete="email" />
                  <InputField label="Téléphone" type="tel" value={phone} onChange={setPhone} placeholder="06 12 34 56 78" autoComplete="tel" />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <OrderSummary data={bookingData} />

              {error && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 border-t bg-white px-5 py-3 space-y-2">
        {/* Price always visible */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{seatIds.length} place(s)</span>
          <span className="text-lg font-extrabold text-slate-900 tabular-nums">
            {(total / 100).toFixed(2)}€
          </span>
        </div>

        {step < 2 ? (
          <button
            onClick={() => setStep((step + 1) as WizardStep)}
            disabled={step === 0 && !guestsValid}
            className="w-full h-12 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-30 active:scale-[0.98] transition-all"
          >
            {step === 0
              ? (guestsValid ? "Continuer — Extras & Contact" : "Remplissez les convives")
              : (contactValid ? "Voir le récapitulatif" : "Remplissez le contact")}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handlePay(false)}
              disabled={!contactValid || loading}
              className="flex-1 h-12 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-30 active:scale-[0.98] transition-all"
            >
              {loading ? "Traitement…" : `Payer ${(total / 100).toFixed(2)}€`}
            </button>
            <button
              onClick={() => handlePay(true)}
              disabled={!contactValid || loading}
              className="h-12 px-3 border border-slate-200 text-slate-400 text-[11px] font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-30 active:scale-[0.98] transition-all"
            >
              Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({
  label, type, value, onChange, placeholder, autoComplete,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
      />
    </div>
  );
}

function buildGuestList(seatIds: number[], map: Map<number, SeatFormData>): SeatFormData[] {
  return seatIds.map(
    (id) =>
      map.get(id) || {
        seatId: id,
        firstName: "",
        lastName: "",
        mealChoice: "lasagne" as MealChoice,
        hasDessert: false,
      }
  );
}
