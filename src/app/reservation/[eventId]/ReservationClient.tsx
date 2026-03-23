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

export function ReservationClient({ event }: ReservationClientProps) {
  const [tables, setTables] = useState<TableWithSeats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] =
    useState<TableWithSeats | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdingInProgress, setHoldingInProgress] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const hasForm = selectedTable !== null && selectedSeatIds.length > 0;

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
    setHoldingInProgress(true);
    try {
      const res = await fetch("/api/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, tableId, seatIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Place indisponible");
        return false;
      }

      const data = await res.json();
      setHoldExpiresAt(data.expiresAt);
      await fetchSeating();
      return true;
    } catch {
      toast.error("Erreur de connexion");
      return false;
    } finally {
      setHoldingInProgress(false);
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
    }, 250);
  };

  // VIP: click table → instant hold + form
  const handleTableSelect = async (table: TableWithSeats) => {
    if (!table.isVip) return;
    const success = await createHold(table.id);
    if (success) {
      setSelectedTable(table);
      setSelectedSeatIds(table.seats.map((s) => s.id));
      scrollToForm();
    }
  };

  // Normal: click seat → instant hold + form, subsequent clicks add/remove seats
  const handleSeatToggle = async (tableId: number, seatIds: number[]) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.isVip) return;
    const seatId = seatIds[0];
    const isAlreadySelected = selectedSeatIds.includes(seatId);

    // Clicking a seat on a different table — switch tables
    if (selectedTable && selectedTable.id !== tableId) {
      toast.error("Vous ne pouvez sélectionner que des sièges d'une même table");
      return;
    }

    if (isAlreadySelected) {
      // Deselect seat
      const newIds = selectedSeatIds.filter((id) => id !== seatId);
      if (newIds.length === 0) {
        // Last seat removed — release hold, clear form
        await releaseHold();
        setSelectedTable(null);
        setSelectedSeatIds([]);
        await fetchSeating();
        return;
      }
      setSelectedSeatIds(newIds);
      // Re-hold with updated seats
      await createHold(tableId, newIds);
    } else {
      // Add seat
      const newIds = [...selectedSeatIds, seatId];
      setSelectedTable(table);
      setSelectedSeatIds(newIds);
      const success = await createHold(tableId, newIds);
      if (!success) {
        // Revert if hold failed
        setSelectedSeatIds(selectedSeatIds);
        if (selectedSeatIds.length === 0) setSelectedTable(null);
        return;
      }
      if (selectedSeatIds.length === 0) {
        scrollToForm();
      }
    }
  };

  const handleCancel = async () => {
    await releaseHold();
    setSelectedTable(null);
    setSelectedSeatIds([]);
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
      {/* Top bar */}
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

          <div className="flex items-center gap-2">
            {holdingInProgress && (
              <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            )}
            {holdExpiresAt && (
              <CountdownTimer
                expiresAt={holdExpiresAt}
                onExpired={handleExpired}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-5xl mx-auto w-full">
        <div
          className={`grid gap-0 lg:gap-6 ${
            hasForm ? "lg:grid-cols-[1fr_380px]" : ""
          }`}
        >
          {/* Seating plan */}
          <div className="p-4 lg:p-6">
            <SeatingPlan
              eventId={event.id}
              tables={tables}
              onTableSelect={handleTableSelect}
              onSeatsSelect={handleSeatToggle}
              selectedTableId={selectedTable?.id}
              selectedSeatIds={selectedSeatIds}
              readOnly={false}
            />

            {!hasForm && (
              <div className="mt-3 px-1 space-y-1">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-amber-600">
                    VIP (rangs 1-3)
                  </span>{" "}
                  — Cliquez sur une table — 280€ / 8 pers.
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">
                    Normal (rangs 4-9)
                  </span>{" "}
                  — Cliquez sur les sièges — dès 28€
                </p>
              </div>
            )}
          </div>

          {/* Booking form — appears instantly on first click */}
          <AnimatePresence mode="wait">
            {hasForm && selectedTable && (
              <motion.div
                ref={formRef}
                key={selectedTable.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
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
