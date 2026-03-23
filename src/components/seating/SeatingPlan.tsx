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
  const W = maxT * CS - CG + PX * 2;
  const H = PT + SH + SGA + totalR * (CD + RG) - RG + PT + 8;

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

  // Palette unifiée
  const LEGEND = [
    { c: "#34d399", l: "Libre" },        // émeraude — disponible
    { c: "#818cf8", l: "Ma sélection" }, // indigo — sélectionné (même violet que le plan)
    { c: "#a78bfa", l: "En cours" },     // violet clair — held
    { c: "#334155", l: "Réservé" },      // slate sombre — réservé
  ];

  return (
    <div ref={ref} className="relative w-full rounded-2xl overflow-hidden" style={{ background: "#0f0c1d" }}>
      {/* Legend — alignée sur la palette du plan */}
      <div className="flex items-center justify-center gap-5 pt-3 pb-1 px-3">
        {LEGEND.map((i) => (
          <div key={i.l} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full ring-1 ring-black/20" style={{ background: i.c }} />
            <span className="text-[10px] text-violet-300/50 font-medium">{i.l}</span>
          </div>
        ))}
        {/* VIP dot */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full ring-1 ring-amber-500/50" style={{ background: "transparent", outline: "1.5px solid #f59e0b" }} />
          <span className="text-[10px] text-violet-300/50 font-medium">VIP</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 560 }}>
          <defs>
            {/* Scène : même violet que la charte */}
            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.3" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Scène */}
          <rect x={PX + 20} y={PT} width={W - (PX + 20) * 2} height={SH} rx={SH / 2} fill="url(#sg)" filter="url(#glow)" />
          <text x={W / 2} y={PT + SH / 2 + 4} textAnchor="middle" fill="#e9d5ff" fontSize={10} fontWeight="800" fontFamily="system-ui" letterSpacing="4" opacity="0.8">
            SCÈNE
          </text>

          {/* Séparateur VIP / Normal */}
          {(() => {
            const vipRows = Object.entries(rows).filter(([, rt]) => rt[0]?.isVip);
            const normRows = Object.entries(rows).filter(([, rt]) => !rt[0]?.isVip);
            if (vipRows.length === 0 || normRows.length === 0) return null;
            const lastVipIdx = parseInt(vipRows[vipRows.length - 1][0]) - 1;
            const sepY = PT + SH + SGA + CR + lastVipIdx * (CD + RG) + CR + RG / 2;
            return (
              <g>
                <line x1={PX + 10} y1={sepY} x2={W - PX - 10} y2={sepY} stroke="#7c3aed" strokeWidth="0.5" strokeDasharray="5 5" opacity="0.35" />
                <text x={W / 2} y={sepY - 4} textAnchor="middle" fill="#a78bfa" fontSize={7} fontWeight="700" opacity="0.45" fontFamily="system-ui" letterSpacing="3">
                  VIP
                </text>
              </g>
            );
          })()}

          {/* Rangées */}
          {Object.entries(rows).map(([rn, rt]) => {
            const ri = parseInt(rn) - 1;
            const cy = PT + SH + SGA + CR + ri * (CD + RG);
            const tw = rt.length * CS - CG;
            const sx = (W - tw) / 2 + CR;
            return (
              <g key={rn}>
                {/* Numéro de rang — violet pour VIP, quasi invisible pour normal */}
                <text x={10} y={cy + 3} fontSize={7} fill={rt[0]?.isVip ? "#a78bfa" : "rgba(139,92,246,0.15)"} fontWeight="900" fontFamily="system-ui">
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

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none bg-black/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md z-50 whitespace-nowrap hidden sm:block"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%,-100%)" }}
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
