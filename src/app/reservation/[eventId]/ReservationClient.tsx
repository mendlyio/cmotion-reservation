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

export function ReservationClient({ event }: ReservationClientProps) {
  const [tables, setTables] = useState<TableWithSeats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableWithSeats | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdingInProgress, setHoldingInProgress] = useState(false);
  const hasSelection = selectedTable !== null && selectedSeatIds.length > 0;

  const fetchSeating = useCallback(async () => {
    try {
      const res = await fetch(`/api/seating/${event.id}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables);
      }
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => { fetchSeating(); }, [fetchSeating]);

  const createHold = async (tableId: number, seatIds?: number[]) => {
    setHoldingInProgress(true);
    try {
      const res = await fetch("/api/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, tableId, seatIds }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Place indisponible");
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
    try { await fetch("/api/hold", { method: "DELETE" }); } catch { /* */ }
    setHoldExpiresAt(null);
  };

  const handleTableSelect = async (table: TableWithSeats) => {
    if (!table.isVip) return;
    const ok = await createHold(table.id);
    if (ok) {
      setSelectedTable(table);
      setSelectedSeatIds(table.seats.map((s) => s.id));
    }
  };

  const handleSeatToggle = async (tableId: number, seatIds: number[]) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.isVip) return;
    const seatId = seatIds[0];

    if (selectedTable && selectedTable.id !== tableId) {
      toast.error("Même table uniquement");
      return;
    }

    const isSelected = selectedSeatIds.includes(seatId);

    if (isSelected) {
      const newIds = selectedSeatIds.filter((id) => id !== seatId);
      if (newIds.length === 0) {
        await releaseHold();
        setSelectedTable(null);
        setSelectedSeatIds([]);
        await fetchSeating();
        return;
      }
      setSelectedSeatIds(newIds);
      await createHold(tableId, newIds);
    } else {
      const newIds = [...selectedSeatIds, seatId];
      setSelectedTable(table);
      setSelectedSeatIds(newIds);
      const ok = await createHold(tableId, newIds);
      if (!ok) {
        setSelectedSeatIds(selectedSeatIds);
        if (selectedSeatIds.length === 0) setSelectedTable(null);
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
    toast.error("Votre réservation a expiré");
    await handleCancel();
  };

  const date = new Date(event.eventDate).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">{event.name}</h1>
              <p className="text-[10px] text-slate-400 truncate capitalize">{date} — {event.timeInfo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {holdingInProgress && (
              <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            )}
            {holdExpiresAt && (
              <CountdownTimer expiresAt={holdExpiresAt} onExpired={handleExpired} />
            )}
          </div>
        </div>
      </header>

      {/* Seating plan — full page, scrolls naturally */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        {!hasSelection && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
            <div className="flex gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mt-0.5" />
              <span><strong className="text-slate-700">VIP</strong> Cliquez sur une table</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mt-0.5" />
              <span><strong className="text-slate-700">Normal</strong> Cliquez sur les sièges</span>
            </div>
          </div>
        )}

        <SeatingPlan
          eventId={event.id}
          tables={tables}
          onTableSelect={handleTableSelect}
          onSeatsSelect={handleSeatToggle}
          selectedTableId={selectedTable?.id}
          selectedSeatIds={selectedSeatIds}
          readOnly={false}
        />
      </div>

      {/* Bottom sheet — slides up when seats are selected */}
      <AnimatePresence>
        {hasSelection && selectedTable && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col"
            style={{ maxHeight: "75vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            <BookingForm
              eventId={event.id}
              table={selectedTable}
              selectedSeatIds={selectedSeatIds}
              onCancel={handleCancel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: sidebar instead of bottom sheet */}
      <style>{`
        @media (min-width: 1024px) {
          .fixed.inset-x-0.bottom-0 {
            position: fixed !important;
            inset: auto 0 auto auto !important;
            top: 48px !important;
            bottom: 0 !important;
            width: 420px !important;
            max-height: none !important;
            border-radius: 0 !important;
            border-left: 1px solid #e2e8f0;
            box-shadow: -4px 0 20px rgba(0,0,0,0.05) !important;
          }
        }
      `}</style>
    </main>
  );
}
