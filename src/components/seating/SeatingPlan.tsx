"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TableWithSeats, SeatData } from "@/types";
import { TableShape } from "./TableShape";
import { SeatingLegend } from "./SeatingLegend";

interface SeatingPlanProps {
  eventId: number;
  tables: TableWithSeats[];
  onTableSelect?: (table: TableWithSeats) => void;
  onSeatsSelect?: (tableId: number, seatIds: number[]) => void;
  selectedTableId?: number | null;
  selectedSeatIds?: number[];
  readOnly?: boolean;
}

const TABLE_RADIUS = 26;
const SEAT_RADIUS = 8;
const SEAT_GAP = 4;
const SEAT_DIST = TABLE_RADIUS + SEAT_GAP + SEAT_RADIUS;
const CELL_RADIUS = SEAT_DIST + SEAT_RADIUS;
const CELL_DIAMETER = CELL_RADIUS * 2;
const CELL_GAP = 10;
const CELL_STEP = CELL_DIAMETER + CELL_GAP;
const ROW_GAP = 12;
const PADDING_X = 48;
const PADDING_TOP = 16;
const SCENE_HEIGHT = 40;
const SCENE_GAP = 24;

export function SeatingPlan({
  eventId,
  tables: initialTables,
  onTableSelect,
  onSeatsSelect,
  selectedTableId,
  selectedSeatIds = [],
  readOnly = false,
}: SeatingPlanProps) {
  const [tables, setTables] = useState<TableWithSeats[]>(initialTables);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/seating/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setTables(data.tables);
        }
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const rows = groupByRow(tables);
  const maxTablesInRow = Math.max(...Object.values(rows).map((r) => r.length), 1);
  const totalRows = Object.keys(rows).length;

  const svgWidth = maxTablesInRow * CELL_STEP - CELL_GAP + PADDING_X * 2;
  const svgHeight =
    PADDING_TOP + SCENE_HEIGHT + SCENE_GAP +
    totalRows * (CELL_DIAMETER + ROW_GAP) - ROW_GAP + PADDING_TOP;

  const handleTableClick = useCallback(
    (table: TableWithSeats) => {
      if (readOnly) return;
      if (table.isVip) {
        const allAvailable = table.seats.every(
          (s) => s.status === "available" || selectedSeatIds.includes(s.id)
        );
        if (!allAvailable) return;
        onTableSelect?.(table);
      }
    },
    [readOnly, onTableSelect, selectedSeatIds]
  );

  const handleSeatClick = useCallback(
    (table: TableWithSeats, seat: SeatData) => {
      if (readOnly) return;
      if (table.isVip) { handleTableClick(table); return; }
      if (seat.status !== "available" && !selectedSeatIds.includes(seat.id)) return;
      onSeatsSelect?.(table.id, [seat.id]);
    },
    [readOnly, handleTableClick, onSeatsSelect, selectedSeatIds]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, table: TableWithSeats, seat?: SeatData) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let content = "";
      if (table.isVip) {
        const avail = table.seats.filter((s) => s.status === "available").length;
        const held = table.seats.some((s) => s.status === "held");
        content = held && avail < 8
          ? `Table ${table.rowNumber}-${table.tableNumber} VIP — En cours`
          : avail === 0
          ? `Table ${table.rowNumber}-${table.tableNumber} VIP — Réservée`
          : `Table ${table.rowNumber}-${table.tableNumber} VIP — 280€`;
      } else if (seat) {
        content = seat.status === "held" && !selectedSeatIds.includes(seat.id)
          ? `Siège ${seat.seatNumber} — En cours`
          : seat.status === "reserved"
          ? `Siège ${seat.seatNumber} — Réservé`
          : `Siège ${seat.seatNumber} — dès 28€`;
      }
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, content });
    },
    [selectedSeatIds]
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <SeatingLegend />

      {/* Scrollable SVG — no maxHeight, shows all rows */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto"
          style={{ minWidth: "600px" }}
        >
          {/* Scene */}
          <defs>
            <linearGradient id="sceneG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <rect
            x={PADDING_X}
            y={PADDING_TOP}
            width={svgWidth - PADDING_X * 2}
            height={SCENE_HEIGHT}
            rx={8}
            fill="url(#sceneG)"
          />
          <text
            x={svgWidth / 2}
            y={PADDING_TOP + SCENE_HEIGHT / 2 + 4}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={11}
            fontWeight="700"
            fontFamily="system-ui"
            letterSpacing="3"
          >
            SCÈNE
          </text>

          {/* Rows */}
          {Object.entries(rows).map(([rowNum, rowTables]) => {
            const ri = parseInt(rowNum) - 1;
            const cy = PADDING_TOP + SCENE_HEIGHT + SCENE_GAP + CELL_RADIUS + ri * (CELL_DIAMETER + ROW_GAP);
            const totalW = rowTables.length * CELL_STEP - CELL_GAP;
            const startCx = (svgWidth - totalW) / 2 + CELL_RADIUS;
            const isVip = rowTables[0]?.isVip;

            return (
              <g key={rowNum}>
                {/* Row label */}
                <text
                  x={12}
                  y={cy + 3}
                  fontSize={8}
                  fill={isVip ? "#d97706" : "#94a3b8"}
                  fontWeight="800"
                  fontFamily="system-ui"
                >
                  R{rowNum}
                </text>

                {rowTables.map((table, ti) => (
                  <TableShape
                    key={table.id}
                    table={table}
                    cx={startCx + ti * CELL_STEP}
                    cy={cy}
                    tableRadius={TABLE_RADIUS}
                    seatRadius={SEAT_RADIUS}
                    seatDist={SEAT_DIST}
                    isSelected={selectedTableId === table.id}
                    hasSelectedSeats={table.seats.some((s) => selectedSeatIds.includes(s.id))}
                    selectedSeatIds={selectedSeatIds}
                    isHovered={hoveredTable === table.id}
                    onTableClick={() => handleTableClick(table)}
                    onSeatClick={(seat) => handleSeatClick(table, seat)}
                    onMouseEnter={() => setHoveredTable(table.id)}
                    onMouseLeave={() => { setHoveredTable(null); setTooltip(null); }}
                    onMouseMove={(e, seat) => handleMouseMove(e, table, seat)}
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
            className="absolute pointer-events-none bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg z-50 whitespace-nowrap hidden sm:block"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
          >
            {tooltip.content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function groupByRow(tables: TableWithSeats[]): Record<number, TableWithSeats[]> {
  const rows: Record<number, TableWithSeats[]> = {};
  for (const t of tables) {
    if (!rows[t.rowNumber]) rows[t.rowNumber] = [];
    rows[t.rowNumber].push(t);
  }
  for (const r of Object.values(rows)) r.sort((a, b) => a.tableNumber - b.tableNumber);
  return rows;
}
