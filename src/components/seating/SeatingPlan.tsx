"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TableWithSeats, SeatData } from "@/types";
import { TableShape } from "./TableShape";

interface SeatingPlanProps {
  eventId: number;
  tables: TableWithSeats[];
  onTableSelect?: (table: TableWithSeats) => void;
  onSeatsSelect?: (tableId: number, seatIds: number[]) => void;
  selectedTableId?: number | null;
  selectedSeatIds?: number[];
  readOnly?: boolean;
}

const TR = 24;
const SR = 7;
const SG = 4;
const SD = TR + SG + SR;
const CR = SD + SR;
const CD = CR * 2;
const CG = 8;
const CS = CD + CG;
const RG = 10;
const PX = 44;
const PT = 12;
const SH = 36;
const SGA = 20;

const SCALE_MIN = 0.8;
const SCALE_MAX = 3.0;
const SCALE_STEP = 0.25;

export function SeatingPlan({
  eventId,
  tables: init,
  onTableSelect,
  onSeatsSelect,
  selectedTableId,
  selectedSeatIds = [],
  readOnly = false,
}: SeatingPlanProps) {
  const [tables, setTables] = useState<TableWithSeats[]>(init);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  // Initialise le zoom selon la taille de l'écran au premier rendu
  useEffect(() => {
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      if (w < 400) setScale(2.0);
      else if (w < 480) setScale(1.75);
      else if (w < 640) setScale(1.5);
      else setScale(1.0);
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/seating/${eventId}`);
        if (r.ok) setTables((await r.json()).tables);
      } catch { /* */ }
    }, 10000);
    return () => clearInterval(iv);
  }, [eventId]);

  useEffect(() => { setTables(init); }, [init]);

  const rows = groupByRow(tables);
  const maxT = Math.max(...Object.values(rows).map((r) => r.length), 1);
  const totalR = Object.keys(rows).length;

  const hasVipRows = Object.values(rows).some((r) => r[0]?.isVip);
  const hasNormRows = Object.values(rows).some((r) => !r[0]?.isVip);
  const hasSep = hasVipRows && hasNormRows;
  const SEP_EXTRA = hasSep ? 22 : 0;
  const firstNormRowNum = hasSep
    ? Math.min(...Object.entries(rows).filter(([, r]) => !r[0]?.isVip).map(([n]) => parseInt(n)))
    : Infinity;

  const getCy = (rowNum: number) => {
    const ri = rowNum - 1;
    const base = PT + SH + SGA + CR + ri * (CD + RG);
    return rowNum >= firstNormRowNum ? base + SEP_EXTRA : base;
  };

  const W = maxT * CS - CG + PX * 2;
  const H = PT + SH + SGA + totalR * (CD + RG) - RG + PT + 8 + SEP_EXTRA;

  const onTClick = useCallback((t: TableWithSeats) => {
    if (readOnly || !t.isVip) return;
    if (!t.seats.every((s) => s.status === "available" || selectedSeatIds.includes(s.id))) return;
    onTableSelect?.(t);
  }, [readOnly, onTableSelect, selectedSeatIds]);

  const onSClick = useCallback((t: TableWithSeats, s: SeatData) => {
    if (readOnly) return;
    if (t.isVip) { onTClick(t); return; }
    if (s.status !== "available" && !selectedSeatIds.includes(s.id)) return;
    onSeatsSelect?.(t.id, [s.id]);
  }, [readOnly, onTClick, onSeatsSelect, selectedSeatIds]);

  const onMM = useCallback((e: React.MouseEvent, t: TableWithSeats, s?: SeatData) => {
    if (!containerRef.current) return;
    const rc = containerRef.current.getBoundingClientRect();
    let text = "";
    if (t.isVip) {
      const a = t.seats.filter((x) => x.status === "available").length;
      text = a === 0 ? "Réservée" : a < 8 ? "En cours…" : "280€ · 8 places";
    } else if (s) {
      text = s.status === "held" ? "En cours…" : s.status === "reserved" ? "Réservé" : "dès 28€";
    }
    // Tooltip positionné relatif au container scrollable
    const scrollLeft = svgWrapRef.current?.scrollLeft ?? 0;
    const scrollTop = svgWrapRef.current?.scrollTop ?? 0;
    setTooltip({
      x: e.clientX - rc.left + scrollLeft,
      y: e.clientY - rc.top + scrollTop - 8,
      text,
    });
  }, []);

  const zoomIn  = () => setScale((s) => Math.min(SCALE_MAX, parseFloat((s + SCALE_STEP).toFixed(2))));
  const zoomOut = () => setScale((s) => Math.max(SCALE_MIN, parseFloat((s - SCALE_STEP).toFixed(2))));

  const LEGEND = [
    { c: "#4ade80", l: "Libre",        filled: true  },
    { c: "#c9a227", l: "Ma sélection", filled: true  },
    { c: "#fbbf24", l: "En cours",     filled: true  },
    { c: "#374151", l: "Réservé",      filled: true  },
    { c: "#c9a227", l: "VIP",          filled: false },
  ];

  return (
    <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden" style={{ background: "#080700" }}>

      {/* Top bar : légende + zoom */}
      <div className="flex items-center justify-between gap-3 pt-3 pb-2 px-3">
        {/* Légende */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {LEGEND.map((item) => (
            <div key={item.l} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={item.filled
                  ? { background: item.c }
                  : { background: "transparent", boxShadow: `inset 0 0 0 1.5px ${item.c}` }
                }
              />
              <span className="text-[10px] font-medium" style={{ color: "rgba(201,162,39,0.45)" }}>
                {item.l}
              </span>
            </div>
          ))}
        </div>

        {/* Contrôles zoom */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={zoomOut}
            disabled={scale <= SCALE_MIN}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c9a227] font-bold text-base transition-all disabled:opacity-25 hover:bg-[#c9a227]/10 active:scale-90"
            style={{ border: "1px solid rgba(201,162,39,0.2)" }}
            aria-label="Dézoomer"
          >
            −
          </button>
          <span className="text-[10px] font-bold tabular-nums w-8 text-center" style={{ color: "rgba(201,162,39,0.6)" }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= SCALE_MAX}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c9a227] font-bold text-base transition-all disabled:opacity-25 hover:bg-[#c9a227]/10 active:scale-90"
            style={{ border: "1px solid rgba(201,162,39,0.2)" }}
            aria-label="Zoomer"
          >
            +
          </button>
        </div>
      </div>

      {/* Zone de scroll + SVG */}
      <div
        ref={svgWrapRef}
        className="overflow-auto pb-3"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {/* Le wrapper SVG a une taille fixe en pixels = viewBox × scale */}
        <div style={{ width: W * scale, height: H * scale, position: "relative" }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W * scale}
            height={H * scale}
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#c9a227" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#7a5c10" stopOpacity="0.2"  />
              </linearGradient>
              <filter id="sceneGlow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Scène */}
            <rect x={PX + 20} y={PT} width={W - (PX + 20) * 2} height={SH} rx={SH / 2}
              fill="url(#sg)" filter="url(#sceneGlow)" />
            <rect x={PX + 20} y={PT} width={W - (PX + 20) * 2} height={SH} rx={SH / 2}
              fill="none" stroke="#c9a227" strokeWidth="0.6" opacity="0.35" />
            <text x={W / 2} y={PT + SH / 2 + 4} textAnchor="middle"
              fill="#e4c76b" fontSize={10} fontWeight="800" fontFamily="system-ui"
              letterSpacing="5" opacity="0.85">
              SCÈNE
            </text>

            {/* Séparateur VIP / Normal */}
            {hasSep && (() => {
              const lastVipRowNum = Math.max(
                ...Object.entries(rows).filter(([, r]) => r[0]?.isVip).map(([n]) => parseInt(n))
              );
              const vipBottom = getCy(lastVipRowNum) + CR;
              const normTop   = getCy(firstNormRowNum) - CR;
              const sepY      = (vipBottom + normTop) / 2;
              return (
                <g>
                  <line x1={PX + 12} y1={sepY} x2={W / 2 - 28} y2={sepY}
                    stroke="#c9a227" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
                  <line x1={W / 2 + 28} y1={sepY} x2={W - PX - 12} y2={sepY}
                    stroke="#c9a227" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
                  <rect x={W / 2 - 22} y={sepY - 8} width={44} height={16} rx={8}
                    fill="#0f0c00" stroke="#c9a227" strokeWidth="0.8" opacity="0.95" />
                  <text x={W / 2} y={sepY} textAnchor="middle" dominantBaseline="central"
                    fill="#c9a227" fontSize={7} fontWeight="900" fontFamily="system-ui" letterSpacing="3">
                    VIP
                  </text>
                </g>
              );
            })()}

            {/* Rangées */}
            {Object.entries(rows).map(([rn, rt]) => {
              const cy = getCy(parseInt(rn));
              const tw = rt.length * CS - CG;
              const sx = (W - tw) / 2 + CR;
              return (
                <g key={rn}>
                  <text x={10} y={cy + 3} fontSize={7}
                    fill={rt[0]?.isVip ? "rgba(201,162,39,0.5)" : "rgba(255,255,255,0.1)"}
                    fontWeight="900" fontFamily="system-ui">
                    {rn}
                  </text>
                  {rt.map((t, ti) => (
                    <TableShape
                      key={t.id}
                      table={t}
                      cx={sx + ti * CS}
                      cy={cy}
                      tableRadius={TR}
                      seatRadius={SR}
                      seatDist={SD}
                      isSelected={selectedTableId === t.id}
                      hasSelectedSeats={t.seats.some((s) => selectedSeatIds.includes(s.id))}
                      selectedSeatIds={selectedSeatIds}
                      isHovered={hovered === t.id}
                      onTableClick={() => onTClick(t)}
                      onSeatClick={(s) => onSClick(t, s)}
                      onMouseEnter={() => setHovered(t.id)}
                      onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                      onMouseMove={(e, s) => onMM(e, t, s)}
                      readOnly={readOnly}
                    />
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Tooltip positionné à l'intérieur du wrapper scrollable */}
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute pointer-events-none z-50 whitespace-nowrap hidden sm:block"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%,-100%)",
                  background: "rgba(10,8,0,0.92)",
                  border: "1px solid rgba(201,162,39,0.3)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#e4c76b",
                  backdropFilter: "blur(8px)",
                }}
              >
                {tooltip.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function groupByRow(tables: TableWithSeats[]): Record<number, TableWithSeats[]> {
  const r: Record<number, TableWithSeats[]> = {};
  for (const t of tables) { if (!r[t.rowNumber]) r[t.rowNumber] = []; r[t.rowNumber].push(t); }
  for (const v of Object.values(r)) v.sort((a, b) => a.tableNumber - b.tableNumber);
  return r;
}
