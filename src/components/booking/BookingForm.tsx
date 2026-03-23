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

export function BookingForm({
  eventId,
  table,
  selectedSeatIds,
  onCancel,
}: BookingFormProps) {
  const isVip = table.isVip;
  const seatIds = isVip ? table.seats.map((s) => s.id) : selectedSeatIds;

  // Keep a map of guest data by seatId so data is preserved when seats are added/removed
  const guestMapRef = useRef<Map<number, SeatFormData>>(new Map());

  const [guests, setGuests] = useState<SeatFormData[]>(() =>
    buildGuestList(seatIds, guestMapRef.current)
  );
  const [upsells, setUpsells] = useState<{ type: string; quantity: number }[]>(
    []
  );
  const [referentStudent, setReferentStudent] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync guests when selectedSeatIds changes (add/remove seats dynamically)
  useEffect(() => {
    // Save current guest data into the map
    for (const g of guests) {
      guestMapRef.current.set(g.seatId, g);
    }
    // Rebuild the guest list based on new seatIds, reusing existing data
    const newGuests = buildGuestList(seatIds, guestMapRef.current);
    setGuests(newGuests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeatIds.join(",")]);

  const bookingData: BookingFormData = {
    eventId,
    tableId: table.id,
    seatIds,
    isVip,
    guests,
    upsells,
    referentStudent,
    email,
    phone,
  };

  const isValid =
    guests.every((g) => g.firstName && g.lastName && g.mealChoice) &&
    referentStudent &&
    email;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);

    try {
      const resResponse = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (!resResponse.ok) {
        const data = await resResponse.json();
        throw new Error(data.error || "Erreur lors de la réservation");
      }

      const { reservationId, totalAmount } = await resResponse.json();

      if (totalAmount === 0) {
        window.location.href = `/confirmation/${reservationId}`;
        return;
      }

      const stripeResponse = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });

      if (!stripeResponse.ok) {
        const data = await stripeResponse.json();
        throw new Error(data.error || "Erreur lors du paiement");
      }

      const { url } = await stripeResponse.json();
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleSimplePay = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);

    try {
      const resResponse = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (!resResponse.ok) {
        const data = await resResponse.json();
        throw new Error(data.error || "Erreur lors de la réservation");
      }

      const { reservationId } = await resResponse.json();

      const payResponse = await fetch("/api/stripe/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });

      if (!payResponse.ok) {
        throw new Error("Erreur lors du paiement simulé");
      }

      window.location.href = `/confirmation/${reservationId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal(bookingData);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isVip
              ? `Table VIP ${table.rowNumber}-${table.tableNumber}`
              : `Table ${table.rowNumber}-${table.tableNumber}`}
          </h2>
          <p className="text-xs text-slate-400">
            {isVip ? "8 places — 280€" : `${seatIds.length} siège(s) sélectionné(s)`}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors py-1 px-3 rounded-lg border border-slate-200 active:bg-slate-50"
        >
          Annuler
        </button>
      </div>

      {isVip && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-100">
          <span className="text-amber-500">★</span>
          <span className="text-xs text-amber-800 font-medium">
            Table VIP — Bulles, zakouski et dessert inclus
          </span>
        </div>
      )}

      {!isVip && (
        <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
          Cliquez sur d&apos;autres sièges de cette table pour les ajouter
        </p>
      )}

      {/* Guest forms — animate in/out as seats are added/removed */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {guests.map((guest, i) => {
            const seat = table.seats.find((s) => s.id === guest.seatId);
            return (
              <motion.div
                key={guest.seatId}
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                transition={{ duration: 0.2 }}
              >
                <GuestForm
                  index={i}
                  seatId={guest.seatId}
                  seatLabel={`Siège ${seat?.seatNumber || i + 1}`}
                  data={guest}
                  isVip={isVip}
                  onChange={(updated) => {
                    const newGuests = [...guests];
                    newGuests[i] = updated;
                    setGuests(newGuests);
                    guestMapRef.current.set(updated.seatId, updated);
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <UpsellSection upsells={upsells} onChange={setUpsells} />

      {/* Contact */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">Contact</span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Nom de l&apos;élève référent *
            </label>
            <input
              type="text"
              value={referentStudent}
              onChange={(e) => setReferentStudent(e.target.value)}
              placeholder="Nom de l'élève"
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Email *
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
            />
          </div>
        </div>
      </div>

      <OrderSummary data={bookingData} />

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sticky CTA */}
      <div className="sticky bottom-0 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-white via-white to-white/0 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:pt-0 sm:bg-transparent">
        <div className="flex gap-2.5">
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex-1 h-[52px] bg-slate-900 text-white text-[15px] font-bold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-slate-900/10"
          >
            {loading
              ? "Traitement…"
              : `Payer ${(total / 100).toFixed(2)}€`}
          </button>
          <button
            onClick={handleSimplePay}
            disabled={!isValid || loading}
            className="h-[52px] px-4 border border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            Test
          </button>
        </div>
      </div>
    </div>
  );
}

function buildGuestList(
  seatIds: number[],
  existingMap: Map<number, SeatFormData>
): SeatFormData[] {
  return seatIds.map(
    (seatId) =>
      existingMap.get(seatId) || {
        seatId,
        firstName: "",
        lastName: "",
        mealChoice: "lasagne" as MealChoice,
        hasDessert: false,
      }
  );
}
