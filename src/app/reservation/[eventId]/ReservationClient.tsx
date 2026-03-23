"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SeatingPlan } from "@/components/seating/SeatingPlan";
import { CountdownTimer } from "@/components/seating/CountdownTimer";
import { BookingForm } from "@/components/booking/BookingForm";
import { TableWithSeats, EventData } from "@/types";

export function ReservationClient({ event }: { event: EventData }) {
  const [tables, setTables] = useState<TableWithSeats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selTable, setSelTable] = useState<TableWithSeats | null>(null);
  const [selSeats, setSelSeats] = useState<number[]>([]);
  const [holdExp, setHoldExp] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const has = selTable !== null && selSeats.length > 0;

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`/api/seating/${event.id}`);
      if (r.ok) setTables((await r.json()).tables);
    } catch { toast.error("Erreur de chargement"); }
    finally { setLoading(false); }
  }, [event.id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const hold = async (tid: number, sids?: number[]) => {
    setHolding(true);
    try {
      const r = await fetch("/api/hold", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, tableId: tid, seatIds: sids }),
      });
      if (!r.ok) { toast.error((await r.json()).error || "Indisponible"); return false; }
      setHoldExp((await r.json()).expiresAt);
      await fetch_();
      return true;
    } catch { toast.error("Erreur"); return false; }
    finally { setHolding(false); }
  };

  const release = async () => {
    try { await fetch("/api/hold", { method: "DELETE" }); } catch {}
    setHoldExp(null);
  };

  const scrollForm = () => setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);

  const onTable = async (t: TableWithSeats) => {
    if (!t.isVip) return;
    if (await hold(t.id)) { setSelTable(t); setSelSeats(t.seats.map((s) => s.id)); scrollForm(); }
  };

  const onSeat = async (tid: number, sids: number[]) => {
    const t = tables.find((x) => x.id === tid);
    if (!t || t.isVip) return;
    const sid = sids[0];
    if (selTable && selTable.id !== tid) { toast.error("Même table uniquement"); return; }
    const isSel = selSeats.includes(sid);

    if (isSel) {
      const n = selSeats.filter((id) => id !== sid);
      if (!n.length) { await release(); setSelTable(null); setSelSeats([]); await fetch_(); return; }
      setSelSeats(n); await hold(tid, n);
    } else {
      const n = [...selSeats, sid];
      setSelTable(t); setSelSeats(n);
      if (!(await hold(tid, n))) { setSelSeats(selSeats); if (!selSeats.length) setSelTable(null); return; }
      if (!selSeats.length) scrollForm();
    }
  };

  const cancel = async () => { await release(); setSelTable(null); setSelSeats([]); await fetch_(); };
  const expired = async () => { toast.error("Réservation expirée"); await cancel(); };

  const dateObj = new Date(event.eventDate);
  const dayName = dateObj.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayNum = dateObj.toLocaleDateString("fr-FR", { day: "numeric" });
  const monthName = dateObj.toLocaleDateString("fr-FR", { month: "long" });
  const isPlus12 = event.ageGroup === "+12";
  const accentColor = isPlus12 ? "#3b82f6" : "#f43f5e";

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d0d1a]">
      <div className="w-6 h-6 border-2 border-white/10 border-t-purple-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0c1d]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Back + Event info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/40 hover:bg-white/15 hover:text-white/70 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            {/* Mini calendar */}
            <div className="flex-shrink-0 w-10 text-center rounded-lg overflow-hidden shadow-sm shadow-black/30">
              <div className="py-0.5 text-white text-[9px] font-black uppercase tracking-wider" style={{ background: accentColor }}>
                {monthName}
              </div>
              <div className="bg-white/90 py-0.5">
                <div className="text-base font-extrabold leading-tight" style={{ color: accentColor }}>
                  {dayNum}
                </div>
              </div>
            </div>

            {/* Text info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                  style={{ background: accentColor }}
                >
                  {isPlus12 ? "+12 ans" : "−12 ans"}
                </span>
                <span className="text-white/80 text-[13px] font-semibold capitalize truncate">{dayName}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg className="w-3 h-3 flex-shrink-0" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-bold text-sm tabular-nums">{event.timeInfo}</span>
              </div>
            </div>
          </div>

          {/* Right: spinner + timer */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {holding && (
              <div className="w-3.5 h-3.5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
            )}
            {holdExp && <CountdownTimer expiresAt={holdExp} onExpired={expired} />}
          </div>
        </div>
      </header>

      {/* Plan */}
      <section className="bg-[#0f0c1d]">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3">
          {!has && (
            <div className="flex items-center justify-center gap-4 mb-2 text-[10px] text-violet-300/30">
              <span><span className="text-amber-400/80 font-bold">VIP</span> · cliquer sur la table · 280€</span>
              <span className="w-px h-3 bg-violet-800/50" />
              <span><span className="text-emerald-400/80 font-bold">Normal</span> · cliquer sur les sièges · dès 28€</span>
            </div>
          )}
          <SeatingPlan
            eventId={event.id}
            tables={tables}
            onTableSelect={onTable}
            onSeatsSelect={onSeat}
            selectedTableId={selTable?.id}
            selectedSeatIds={selSeats}
            readOnly={false}
          />
        </div>
      </section>

      {/* Booking form — inline below plan */}
      <AnimatePresence>
        {has && selTable && (
          <motion.section
            ref={formRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 -mt-3"
          >
            <div className="max-w-lg mx-auto px-4 pb-10">
              <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-slate-200/60 overflow-hidden">
                <BookingForm
                  eventId={event.id}
                  table={selTable}
                  selectedSeatIds={selSeats}
                  onCancel={cancel}
                />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
