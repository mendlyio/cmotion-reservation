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

  const scrollForm = () => setTimeout(() =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200
  );

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

  const d = new Date(event.eventDate).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const isPlus12 = event.ageGroup === "+12";
  const accentColor = isPlus12 ? "#818cf8" : "#f472b6"; // indigo-400 / pink-400

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#0a0a14" }}>
      <div className="w-5 h-5 border-2 border-white/10 border-t-purple-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen" style={{ background: "#0a0a14" }}>

      {/* ── Header ── unified dark shell */}
      <header className="sticky top-0 z-40 border-b" style={{ background: "rgba(10,10,20,0.92)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Back + event info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ background: `${accentColor}22`, color: accentColor }}
                >
                  {isPlus12 ? "+12 ans" : "−12 ans"}
                </span>
                <h1 className="text-sm font-bold truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {event.name}
                </h1>
              </div>
              <p className="text-[10px] mt-0.5 truncate capitalize" style={{ color: "rgba(255,255,255,0.25)" }}>
                {d} · {event.timeInfo}
              </p>
            </div>
          </div>

          {/* Right: spinner + timer */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {holding && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-t-purple-400 animate-spin" style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#c084fc" }} />
            )}
            {holdExp && <CountdownTimer expiresAt={holdExp} onExpired={expired} />}
          </div>
        </div>
      </header>

      {/* ── Plan section ── same dark shell, no visual break */}
      <section>
        <div className="max-w-5xl mx-auto px-3 sm:px-5 pt-3 pb-4">

          {/* Instruction hint — only before selection */}
          {!has && (
            <div className="flex items-center justify-center gap-5 mb-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#c084fc" }} />
                <span><span className="font-bold" style={{ color: "#c084fc" }}>VIP</span> — cliquez sur la table</span>
              </div>
              <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#34d399" }} />
                <span><span className="font-bold" style={{ color: "#34d399" }}>Normal</span> — cliquez sur les sièges</span>
              </div>
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

      {/* ── Booking form ── white card below, clean separation */}
      <AnimatePresence>
        {has && selTable && (
          <motion.section
            ref={formRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Transition strip between dark plan and white form */}
            <div className="h-6" style={{ background: "linear-gradient(to bottom, #0a0a14, #f8f8fc)" }} />

            <div style={{ background: "#f8f8fc" }} className="pb-16">
              <div className="max-w-lg mx-auto px-4">
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
                  <BookingForm
                    eventId={event.id}
                    table={selTable}
                    selectedSeatIds={selSeats}
                    onCancel={cancel}
                  />
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
