"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [guests, setGuests] = useState<SeatFormData[]>(
    seatIds.map((seatId) => ({
      seatId,
      firstName: "",
      lastName: "",
      mealChoice: "lasagne" as MealChoice,
      hasDessert: false,
    }))
  );
  const [upsells, setUpsells] = useState<{ type: string; quantity: number }[]>(
    []
  );
  const [referentStudent, setReferentStudent] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Create reservation
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

      // For testing: simple pay button
      if (totalAmount === 0) {
        window.location.href = `/confirmation/${reservationId}`;
        return;
      }

      // Create Stripe checkout session
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
      if (url) {
        window.location.href = url;
      }
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

      // Simulate payment success
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">
          {isVip
            ? `Table VIP ${table.rowNumber}-${table.tableNumber}`
            : `Table ${table.rowNumber}-${table.tableNumber} — ${seatIds.length} siège(s)`}
        </h2>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annuler
        </Button>
      </div>

      {isVip && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ★ Table VIP : 280€ pour 8 personnes — Inclus verre de bulles,
          zakouski et dessert
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700">Informations des convives</h3>
        {guests.map((guest, i) => {
          const seat = table.seats.find((s) => s.id === guest.seatId);
          return (
            <GuestForm
              key={guest.seatId}
              index={i}
              seatId={guest.seatId}
              seatLabel={`Siège ${seat?.seatNumber || i + 1}`}
              data={guest}
              isVip={isVip}
              onChange={(updated) => {
                const newGuests = [...guests];
                newGuests[i] = updated;
                setGuests(newGuests);
              }}
            />
          );
        })}
      </div>

      <UpsellSection upsells={upsells} onChange={setUpsells} />

      <div className="border rounded-lg p-4 bg-white space-y-3">
        <h3 className="font-semibold text-slate-700">Informations de contact</h3>
        <div>
          <Label htmlFor="referent" className="text-xs">
            Nom de l&apos;élève référent *
          </Label>
          <Input
            id="referent"
            value={referentStudent}
            onChange={(e) => setReferentStudent(e.target.value)}
            placeholder="Nom de l'élève"
            required
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-xs">
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-xs">
            Téléphone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>

      <OrderSummary data={bookingData} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="flex-1 h-12 text-base font-semibold"
        >
          {loading ? "Traitement en cours..." : `Payer ${(calculateTotal(bookingData) / 100).toFixed(2)}€`}
        </Button>
        <Button
          onClick={handleSimplePay}
          disabled={!isValid || loading}
          variant="outline"
          className="h-12 text-sm"
        >
          Payer (test)
        </Button>
      </div>
    </motion.div>
  );
}
