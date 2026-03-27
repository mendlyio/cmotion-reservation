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
  const ref = useRef<HTMLDivElement>(null);

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
    if (!ref.current) return;
    const rc = ref.current.getBoundingClientRect();
    let text = "";
    if (t.isVip) {
      const a = t.seats.filter((x) => x.status === "available").length;
      text = a === 0 ? "Réservée" : a < 8 ? "En cours…" : "280€ · 8 places";
    } else if (s) {
      text = s.status === "held" ? "En cours…" : s.status === "reserved" ? "Réservé" : "dès 28€";
    }
    setTooltip({ x: e.clientX - rc.left, y: e.clientY - rc.top - 8, text });
  }, []);

  // Légende Gala
  const LEGEND = [
    { c: "#4ade80",  l: "Libre",        filled: true },
    { c: "#c9a227",  l: "Ma sélection", filled: true },
    { c: "#fbbf24",  l: "En cours",     filled: true },
    { c: "#374151",  l: "Réservé",      filled: true },
    { c: "#c9a227",  l: "VIP",          filled: false },
  ];

  return (
    <div ref={ref} className="relative w-full rounded-2xl overflow-hidden" style={{ background: "#080700" }}>
      {/* Légende */}
      <div className="flex items-center justify-center gap-4 sm:gap-5 pt-3 pb-1 px-3 flex-wrap">
        {LEGEND.map((item) => (
          <div key={item.l} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
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

      <div className="overflow-x-auto pb-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 560 }}>
          <defs>
            {/* Scène : gradient doré */}
            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#c9a227" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#7a5c10" stopOpacity="0.2" />
            </linearGradient>
            {/* Glow pour la scène */}
            <filter id="sceneGlow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Glow léger pour les sièges VIP */}
            <filter id="goldGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Scène */}
          <rect x={PX + 20} y={PT} width={W - (PX + 20) * 2} height={SH} rx={SH / 2}
            fill="url(#sg)" filter="url(#sceneGlow)" />
          {/* Bordure scène */}
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
            const normTop = getCy(firstNormRowNum) - CR;
            const sepY = (vipBottom + normTop) / 2;
            return (
              <g>
                <line x1={PX + 12} y1={sepY} x2={W / 2 - 28} y2={sepY}
                  stroke="#c9a227" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
                <line x1={W / 2 + 28} y1={sepY} x2={W - PX - 12} y2={sepY}
                  stroke="#c9a227" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
                {/* Badge VIP centré */}
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
                {/* Numéro de rangée */}
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
      </div>

      {/* Tooltip */}
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
  );
}

function groupByRow(tables: TableWithSeats[]): Record<number, TableWithSeats[]> {
  const r: Record<number, TableWithSeats[]> = {};
  for (const t of tables) { if (!r[t.rowNumber]) r[t.rowNumber] = []; r[t.rowNumber].push(t); }
  for (const v of Object.values(r)) v.sort((a, b) => a.tableNumber - b.tableNumber);
  return r;
}
