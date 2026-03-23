"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SeatingPlan } from "@/components/seating/SeatingPlan";
import { CountdownTimer } from "@/components/seating/CountdownTimer";
import { BookingForm } from "@/components/booking/BookingForm";
import { TableWithSeats, EventData } from "@/types";

interface ReservationClientProps {
  event: EventData;
}

type Step = "select" | "form";

export function ReservationClient({ event }: ReservationClientProps) {
  const [tables, setTables] = useState<TableWithSeats[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("select");
  const [selectedTable, setSelectedTable] = useState<TableWithSeats | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [seatSelectionMode, setSeatSelectionMode] = useState(false);

  const fetchSeating = useCallback(async () => {
    try {
      const res = await fetch(`/api/seating/${event.id}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables);
      }
    } catch {
      toast.error("Erreur de chargement du plan");
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    fetchSeating();
  }, [fetchSeating]);

  const createHold = async (tableId: number, seatIds?: number[]) => {
    try {
      const res = await fetch("/api/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          tableId,
          seatIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Impossible de réserver");
        return false;
      }

      const data = await res.json();
      setHoldExpiresAt(data.expiresAt);
      return true;
    } catch {
      toast.error("Erreur de connexion");
      return false;
    }
  };

  const releaseHold = async () => {
    try {
      await fetch("/api/hold", { method: "DELETE" });
    } catch {
      // silent
    }
    setHoldExpiresAt(null);
  };

  const handleTableSelect = async (table: TableWithSeats) => {
    if (!table.isVip) return;

    const success = await createHold(table.id);
    if (success) {
      setSelectedTable(table);
      setSelectedSeatIds(table.seats.map((s) => s.id));
      setStep("form");
      await fetchSeating();
    }
  };

  const handleSeatToggle = async (tableId: number, seatIds: number[]) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.isVip) return;

    const seatId = seatIds[0];
    const isAlreadySelected = selectedSeatIds.includes(seatId);

    if (!seatSelectionMode) {
      setSeatSelectionMode(true);
      setSelectedTable(table);
      setSelectedSeatIds([seatId]);
      return;
    }

    if (selectedTable && selectedTable.id !== tableId) {
      toast.error("Sélectionnez des sièges de la même table");
      return;
    }

    if (isAlreadySelected) {
      const newIds = selectedSeatIds.filter((id) => id !== seatId);
      if (newIds.length === 0) {
        setSeatSelectionMode(false);
        setSelectedTable(null);
      }
      setSelectedSeatIds(newIds);
    } else {
      setSelectedSeatIds([...selectedSeatIds, seatId]);
    }
  };

  const handleConfirmSeats = async () => {
    if (!selectedTable || selectedSeatIds.length === 0) return;

    const success = await createHold(selectedTable.id, selectedSeatIds);
    if (success) {
      setStep("form");
      await fetchSeating();
    }
  };

  const handleCancel = async () => {
    await releaseHold();
    setStep("select");
    setSelectedTable(null);
    setSelectedSeatIds([]);
    setSeatSelectionMode(false);
    await fetchSeating();
  };

  const handleExpired = async () => {
    toast.error("Votre réservation a expiré. Les sièges ont été libérés.");
    await handleCancel();
  };

  const date = new Date(event.eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
            >
              ← Retour aux spectacles
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">{event.name}</h1>
            <p className="text-slate-500 capitalize">
              {date} — {event.timeInfo}
            </p>
          </div>

          {holdExpiresAt && (
            <CountdownTimer
              expiresAt={holdExpiresAt}
              onExpired={handleExpired}
            />
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Seating plan */}
          <div className={`${step === "form" ? "lg:col-span-3" : "lg:col-span-5"}`}>
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Plan de salle
                </h2>
                {seatSelectionMode && step === "select" && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {selectedSeatIds.length} siège(s) sélectionné(s)
                    </span>
                    <button
                      onClick={handleConfirmSeats}
                      disabled={selectedSeatIds.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Confirmer la sélection
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>

              <SeatingPlan
                eventId={event.id}
                tables={tables}
                onTableSelect={handleTableSelect}
                onSeatsSelect={handleSeatToggle}
                selectedTableId={selectedTable?.id}
                selectedSeatIds={selectedSeatIds}
                readOnly={step === "form"}
              />

              {step === "select" && !seatSelectionMode && (
                <div className="mt-4 text-center text-sm text-slate-500">
                  <p>
                    <strong>Tables VIP (rangs 1-3)</strong> : cliquez sur une
                    table pour réserver les 8 places — 280€
                  </p>
                  <p>
                    <strong>Tables normales (rangs 4-9)</strong> : cliquez sur
                    les sièges individuels — à partir de 28€/siège
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Booking form */}
          <AnimatePresence>
            {step === "form" && selectedTable && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="lg:col-span-2"
              >
                <div className="bg-slate-50 rounded-2xl border p-6 sticky top-8">
                  <BookingForm
                    eventId={event.id}
                    table={selectedTable}
                    selectedSeatIds={selectedSeatIds}
                    onCancel={handleCancel}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
