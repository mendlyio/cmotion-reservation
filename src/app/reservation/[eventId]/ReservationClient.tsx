"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const [selectedTable, setSelectedTable] =
    useState<TableWithSeats | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [seatSelectionMode, setSeatSelectionMode] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ eventId: event.id, tableId, seatIds }),
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
      /* silent */
    }
    setHoldExpiresAt(null);
  };

  const scrollToForm = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const handleTableSelect = async (table: TableWithSeats) => {
    if (!table.isVip) return;
    const success = await createHold(table.id);
    if (success) {
      setSelectedTable(table);
      setSelectedSeatIds(table.seats.map((s) => s.id));
      setStep("form");
      await fetchSeating();
      scrollToForm();
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
      scrollToForm();
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
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Chargement du plan…</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Top bar — compact, sticky */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {event.name}
              </h1>
              <p className="text-[11px] text-slate-400 truncate capitalize">
                {date} — {event.timeInfo}
              </p>
            </div>
          </div>

          {holdExpiresAt && (
            <CountdownTimer
              expiresAt={holdExpiresAt}
              onExpired={handleExpired}
            />
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-5xl mx-auto w-full">
        <div className={`grid gap-0 lg:gap-6 ${step === "form" ? "lg:grid-cols-[1fr_380px]" : ""}`}>
          {/* Seating plan */}
          <div className="p-4 lg:p-6">
            {/* Selection bar — mobile friendly */}
            {seatSelectionMode && step === "select" && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center justify-between gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100"
              >
                <span className="text-sm font-semibold text-blue-800">
                  {selectedSeatIds.length} siège(s)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 bg-white active:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmSeats}
                    disabled={selectedSeatIds.length === 0}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 active:scale-[0.97]"
                  >
                    Confirmer
                  </button>
                </div>
              </motion.div>
            )}

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
              <div className="mt-3 px-1 space-y-1">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-amber-600">VIP (rangs 1-3)</span>{" "}
                  — Cliquez sur une table — 280€ / 8 pers.
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">Normal (rangs 4-9)</span>{" "}
                  — Cliquez sur les sièges — dès 28€
                </p>
              </div>
            )}
          </div>

          {/* Booking form */}
          <AnimatePresence>
            {step === "form" && selectedTable && (
              <motion.div
                ref={formRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="border-t lg:border-t-0 lg:border-l border-slate-200/60 bg-slate-50/50 p-4 lg:p-6 lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:sticky lg:top-14"
              >
                <BookingForm
                  eventId={event.id}
                  table={selectedTable}
                  selectedSeatIds={selectedSeatIds}
                  onCancel={handleCancel}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
