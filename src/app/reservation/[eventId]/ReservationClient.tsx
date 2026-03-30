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
  const [selSeats, setSelSeats] = useState<number[]>([]);
  const [vipTable, setVipTable] = useState<TableWithSeats | null>(null);
  const [holdExp, setHoldExp] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [floatingHidden, setFloatingHidden] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Refs for debounce
  const tablesRef = useRef<TableWithSeats[]>(tables);
  const addTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAddSeats = useRef<number[]>([]);
  useEffect(() => { tablesRef.current = tables; }, [tables]);

  // Derive involved tables from selection
  const selTables: TableWithSeats[] = vipTable
    ? [vipTable]
    : tables.filter((t) => t.seats.some((s) => selSeats.includes(s.id)));

  const has = selSeats.length > 0;

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`/api/seating/${event.id}`);
      if (r.ok) setTables((await r.json()).tables);
    } catch { toast.error("Erreur de chargement"); }
    finally { setLoading(false); }
  }, [event.id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const buildSelections = (seatIds: number[]) => {
    const byTable = new Map<number, number[]>();
    for (const seatId of seatIds) {
      const t = tablesRef.current.find((t) => t.seats.some((s) => s.id === seatId));
      if (!t) continue;
      if (!byTable.has(t.id)) byTable.set(t.id, []);
      byTable.get(t.id)!.push(seatId);
    }
    return Array.from(byTable.entries()).map(([tableId, tSeatIds]) => ({ tableId, seatIds: tSeatIds }));
  };

  // Immediate hold — used for DESELECTS (no debounce)
  const holdNow = useCallback(async (seatIds: number[]) => {
    if (addTimerRef.current) { clearTimeout(addTimerRef.current); addTimerRef.current = null; }
    pendingAddSeats.current = [];
    const selections = buildSelections(seatIds);
    if (!selections.length) return false;
    setHolding(true);
    try {
      const r = await fetch("/api/hold", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, selections }),
      });
      if (!r.ok) { toast.error((await r.json()).error || "Indisponible"); return false; }
      setHoldExp((await r.json()).expiresAt);
      await fetch_();
      return true;
    } catch { toast.error("Erreur"); return false; }
    finally { setHolding(false); }
  }, [event.id, fetch_]);

  // Debounced hold — used for ADDS (batches rapid clicks)
  const holdDebounced = useCallback((seatIds: number[]) => {
    pendingAddSeats.current = seatIds;
    if (addTimerRef.current) clearTimeout(addTimerRef.current);
    addTimerRef.current = setTimeout(async () => {
      const ids = pendingAddSeats.current;
      if (!ids.length) return;
      const selections = buildSelections(ids);
      if (!selections.length) return;
      setHolding(true);
      try {
        const r = await fetch("/api/hold", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id, selections }),
        });
        if (!r.ok) { toast.error((await r.json()).error || "Indisponible"); setSelSeats([]); return; }
        setHoldExp((await r.json()).expiresAt);
        await fetch_();
      } catch { toast.error("Erreur"); setSelSeats([]); }
      finally { setHolding(false); }
    }, 380);
  }, [event.id, fetch_]);

  const holdVip = async (tid: number) => {
    setHolding(true);
    try {
      const r = await fetch("/api/hold", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, tableId: tid }),
      });
      if (!r.ok) { toast.error((await r.json()).error || "Indisponible"); return false; }
      setHoldExp((await r.json()).expiresAt);
      await fetch_();
      return true;
    } catch { toast.error("Erreur"); return false; }
    finally { setHolding(false); }
  };

  const release = async () => {
    if (addTimerRef.current) { clearTimeout(addTimerRef.current); addTimerRef.current = null; }
    pendingAddSeats.current = [];
    try { await fetch("/api/hold", { method: "DELETE" }); } catch {}
    setHoldExp(null);
  };

  const scrollToForm = () => {
    setFloatingHidden(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const onTable = async (t: TableWithSeats) => {
    if (!t.isVip) return;
    if (vipTable?.id === t.id) { await cancel(); return; }
    if (await holdVip(t.id)) {
      setVipTable(t);
      setSelSeats(t.seats.map((s) => s.id));
    }
  };

  const onSeat = async (tid: number, sids: number[]) => {
    const t = tables.find((x) => x.id === tid);
    if (!t || t.isVip) return;
    if (vipTable) return;

    const tableSeatSet = new Set(t.seats.map((s) => s.id));
    const currentFromThisTable = selSeats.filter((id) => tableSeatSet.has(id));

    // ── Table-level click (multiple seats) ──────────────────────────────
    if (sids.length > 1) {
      const allAlreadySel = sids.every((id) => currentFromThisTable.includes(id));
      const otherSeats = selSeats.filter((id) => !tableSeatSet.has(id));

      if (allAlreadySel) {
        // DESELECT entire table → immediate
        if (!otherSeats.length) { await release(); setSelSeats([]); await fetch_(); return; }
        setSelSeats(otherSeats);
        await holdNow(otherSeats);
      } else {
        const n = [...otherSeats, ...sids];
        const firstTime = selSeats.length === 0;
        setSelSeats(n);
        holdDebounced(n);
        if (firstTime) setFloatingHidden(false);
      }
      return;
    }

    // ── Single seat toggle ───────────────────────────────────────────────
    const sid = sids[0];
    const isSel = selSeats.includes(sid);

    if (isSel) {
      // DESELECT → immediate
      const n = selSeats.filter((id) => id !== sid);
      if (!n.length) { await release(); setSelSeats([]); await fetch_(); return; }
      setSelSeats(n);
      await holdNow(n);
    } else {
      // ADD → debounced
      const n = [...selSeats, sid];
      const firstTime = selSeats.length === 0;
      setSelSeats(n);
      holdDebounced(n);
      if (firstTime) setFloatingHidden(false);
    }
  };

  const cancel = async () => {
    await release();
    setVipTable(null);
    setSelSeats([]);
    setFloatingHidden(false);
    await fetch_();
  };

  const expired = async () => { toast.error("Réservation expirée"); await cancel(); };

  const dateObj = new Date(event.eventDate);
  const dayName = dateObj.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayNum = dateObj.toLocaleDateString("fr-FR", { day: "numeric" });
  const monthName = dateObj.toLocaleDateString("fr-FR", { month: "long" });
  const isPlus12 = event.ageGroup === "+12";

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#c9a227]/20 border-t-[#c9a227] animate-spin" />
        <p className="text-xs text-[#555]">Chargement du plan…</p>
      </div>
    </div>
  );

  const primaryTable = selTables[0] ?? null;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-[#1e1a0e]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-[#666] hover:text-[#ccc] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="shrink-0 w-10 rounded-lg overflow-hidden shadow-md shadow-black/50">
              <div className="py-0.5 text-[9px] font-black uppercase tracking-widest text-black text-center bg-gradient-to-r from-[#c9a227] to-[#e4c76b]">{monthName}</div>
              <div className="bg-[#1a1500] border-x border-b border-[#c9a227]/20 py-0.5 text-center">
                <div className="text-base font-extrabold leading-tight text-[#c9a227]">{dayNum}</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-black bg-gradient-to-r from-[#c9a227] to-[#a07818]">
                  {isPlus12 ? "+12 ans" : "−12 ans"}
                </span>
                <span className="text-[#ccc] text-[13px] font-semibold capitalize truncate">{dayName}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg className="w-3 h-3 shrink-0 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-bold text-sm tabular-nums">{event.timeInfo}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {holding && <div className="w-3.5 h-3.5 border-2 border-[#c9a227]/20 border-t-[#c9a227] rounded-full animate-spin" />}
            {holdExp && <CountdownTimer expiresAt={holdExp} onExpired={expired} />}
          </div>
        </div>
      </header>

      {/* Seating plan area */}
      <section className="plan-bg">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3">
          {!has && (
            <div className="mb-4 px-3 pt-3 pb-1">
              <div className="relative flex items-start justify-center gap-0 mb-5">
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[calc(100%-80px)] h-px bg-[#c9a227]/10 hidden sm:block pointer-events-none" />
                <Step n="1" label="Choisissez" sub="Siège, table entière ou multi-table" />
                <div className="w-8 sm:w-12 shrink-0" />
                <Step n="2" label="Complétez" sub="Infos et repas de chaque convive" />
                <div className="w-8 sm:w-12 shrink-0" />
                <Step n="3" label="Payez" sub="Paiement sécurisé en ligne" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-[#c9a227]/20 bg-[#c9a227]/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227] shrink-0" />
                  <span className="text-[11px] font-bold text-[#c9a227] tracking-wide">VIP</span>
                  <span className="w-px h-3 bg-[#c9a227]/20" />
                  <span className="text-[11px] text-[#666]">Cliquer sur la table</span>
                  <span className="text-[11px] font-semibold text-[#aaa]">280€</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-white/8 bg-white/4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-400 tracking-wide">Normal</span>
                  <span className="w-px h-3 bg-white/10" />
                  <span className="text-[11px] text-[#666]">Sièges ou table(s) entière(s)</span>
                  <span className="text-[11px] font-semibold text-[#aaa]">dès 28€</span>
                </div>
              </div>
            </div>
          )}
          <SeatingPlan
            eventId={event.id}
            tables={tables}
            onTableSelect={onTable}
            onSeatsSelect={onSeat}
            selectedTableIds={selTables.map((t) => t.id)}
            selectedSeatIds={selSeats}
            readOnly={false}
            hideZoom={floatingHidden}
          />
        </div>
      </section>

      {/* Booking form */}
      <AnimatePresence>
        {has && selTables.length > 0 && (
          <motion.section
            ref={formRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10"
          >
            <div className="max-w-lg mx-auto px-4 py-6 pb-32">
              <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden shadow-2xl shadow-black/50">
                <BookingForm
                  eventId={event.id}
                  tables={selTables}
                  selectedSeatIds={selSeats}
                  onCancel={cancel}
                />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating CTA */}
      <AnimatePresence>
        {has && primaryTable && !floatingHidden && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
          >
            <div
              className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl shadow-black/70"
              style={{
                background: "linear-gradient(135deg, #1c1600 0%, #111000 100%)",
                border: "1px solid rgba(201,162,39,0.4)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-[#c9a227]/15 border border-[#c9a227]/30 flex items-center justify-center">
                  <span className="text-[#c9a227] text-sm font-black tabular-nums">{selSeats.length}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold leading-tight truncate">
                    {selSeats.length} {selSeats.length > 1 ? "places sélectionnées" : "place sélectionnée"}
                  </p>
                  <p className="text-[#c9a227]/55 text-[11px] leading-tight">
                    {selTables.length > 1
                      ? `Tables ${selTables.map((t) => `${t.rowNumber}-${t.tableNumber}`).join(", ")}`
                      : `${primaryTable.isVip ? "VIP · " : ""}Table ${primaryTable.rowNumber}-${primaryTable.tableNumber}`}
                  </p>
                </div>
              </div>

              <button
                onClick={scrollToForm}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black text-sm font-black shadow-lg shadow-[#c9a227]/20 hover:opacity-90 active:scale-[0.97] transition-all"
              >
                Continuer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              <button
                onClick={cancel}
                className="shrink-0 w-9 h-9 rounded-xl bg-[#1a1a1a] hover:bg-red-500/12 border border-[#2a2a2a] hover:border-red-500/25 flex items-center justify-center text-[#555] hover:text-red-400 transition-all"
                aria-label="Annuler la sélection"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Step({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div className="relative flex flex-col items-center gap-2 text-center z-10">
      <div className="w-9 h-9 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/30 flex items-center justify-center shadow-lg shadow-black/30">
        <span className="text-[13px] font-black text-[#c9a227]">{n}</span>
      </div>
      <div>
        <p className="text-[12px] font-bold text-[#ccc] leading-tight">{label}</p>
        <p className="text-[10px] text-[#555] mt-0.5 max-w-[90px] leading-tight">{sub}</p>
      </div>
    </div>
  );
}
