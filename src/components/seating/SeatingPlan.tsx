"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TableWithSeats, SeatData } from "@/types";
import { TableShape } from "./TableShape";
import { SeatingLegend } from "./SeatingLegend";

interface SeatingPlanProps {
  eventId: number;
  tables: TableWithSeats[];
  isVipMode?: boolean;
  onTableSelect?: (table: TableWithSeats) => void;
  onSeatsSelect?: (tableId: number, seatIds: number[]) => void;
  selectedTableId?: number | null;
  selectedSeatIds?: number[];
  sessionId?: string;
  holdExpiresAt?: string | null;
  readOnly?: boolean;
}

// Layout constants — CELL is the full footprint of a table + its seats
const TABLE_RADIUS = 30;
const SEAT_RADIUS = 9;
const SEAT_GAP = 5;
const SEAT_DIST = TABLE_RADIUS + SEAT_GAP + SEAT_RADIUS;
const CELL_RADIUS = SEAT_DIST + SEAT_RADIUS; // 53
const CELL_DIAMETER = CELL_RADIUS * 2; // 106
const CELL_GAP = 14;
const CELL_STEP = CELL_DIAMETER + CELL_GAP; // 120 center-to-center
const ROW_GAP = 16;
const PADDING_X = 60;
const PADDING_TOP = 50;
const SCENE_HEIGHT = 56;
const SCENE_GAP = 36;

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
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const pinchStart = useRef<number | null>(null);
  const scaleStart = useRef(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/seating/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setTables(data.tables);
        }
      } catch {
        // silent
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const rows = groupByRow(tables);
  const maxTablesInRow = Math.max(
    ...Object.values(rows).map((r) => r.length),
    1
  );
  const totalRows = Object.keys(rows).length;

  const svgWidth = maxTablesInRow * CELL_STEP - CELL_GAP + PADDING_X * 2;
  const svgHeight =
    PADDING_TOP +
    SCENE_HEIGHT +
    SCENE_GAP +
    totalRows * (CELL_DIAMETER + ROW_GAP) -
    ROW_GAP +
    PADDING_TOP;

  // ---- Touch zoom/pan handlers ----
  const getTouchDist = (e: React.TouchEvent) => {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStart.current = getTouchDist(e);
        scaleStart.current = scale;
      } else if (e.touches.length === 1 && scale > 1) {
        setIsPanning(true);
        panStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          tx: translate.x,
          ty: translate.y,
        };
      }
    },
    [scale, translate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStart.current !== null) {
        e.preventDefault();
        const dist = getTouchDist(e);
        const newScale = Math.min(
          3,
          Math.max(0.8, scaleStart.current * (dist / pinchStart.current))
        );
        setScale(newScale);
      } else if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        setTranslate({
          x: panStart.current.tx + dx,
          y: panStart.current.ty + dy,
        });
      }
    },
    [isPanning]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStart.current = null;
    setIsPanning(false);
  }, []);

  // Mouse wheel zoom (desktop)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((s) => Math.min(3, Math.max(0.8, s + delta)));
      }
    },
    []
  );

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  // ---- Click handlers ----
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
      if (table.isVip) {
        handleTableClick(table);
        return;
      }
      if (seat.status !== "available" && !selectedSeatIds.includes(seat.id))
        return;
      onSeatsSelect?.(table.id, [seat.id]);
    },
    [readOnly, handleTableClick, onSeatsSelect, selectedSeatIds]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, table: TableWithSeats, seat?: SeatData) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let content = "";
      if (table.isVip) {
        const availableCount = table.seats.filter(
          (s) => s.status === "available"
        ).length;
        const heldCount = table.seats.filter(
          (s) => s.status === "held"
        ).length;
        if (heldCount > 0 && availableCount < 8) {
          content = `Table ${table.rowNumber}-${table.tableNumber} (VIP) — En cours de réservation`;
        } else if (availableCount === 0) {
          content = `Table ${table.rowNumber}-${table.tableNumber} (VIP) — Réservée`;
        } else {
          content = `Table ${table.rowNumber}-${table.tableNumber} (VIP) — 280€ pour 8 pers.`;
        }
      } else if (seat) {
        if (seat.status === "held" && !selectedSeatIds.includes(seat.id)) {
          content = `Siège ${seat.seatNumber}, Table ${table.rowNumber}-${table.tableNumber} — En cours de réservation`;
        } else if (seat.status === "reserved") {
          content = `Siège ${seat.seatNumber}, Table ${table.rowNumber}-${table.tableNumber} — Réservé`;
        } else {
          content = `Siège ${seat.seatNumber}, Table ${table.rowNumber}-${table.tableNumber} — À partir de 28€`;
        }
      }

      setTooltip({ x, y: y - 10, content });
    },
    [selectedSeatIds]
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <SeatingLegend />

      {/* Zoom controls */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[11px] text-slate-400 hidden sm:block">
          Ctrl + molette pour zoomer
        </p>
        <p className="text-[11px] text-slate-400 sm:hidden">
          Pincez pour zoomer, glissez pour naviguer
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-bold"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.8, s - 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-bold"
          >
            −
          </button>
          {scale !== 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="h-7 px-2 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px]"
            >
              {Math.round(scale * 100)}% ✕
            </button>
          )}
        </div>
      </div>

      {/* SVG container with overflow + zoom/pan */}
      <div
        ref={svgContainerRef}
        className="overflow-hidden rounded-lg border bg-white touch-none"
        style={{ maxHeight: "70vh" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transformOrigin: "center top",
            transition: isPanning ? "none" : "transform 0.15s ease-out",
            overflow: scale > 1 ? "visible" : undefined,
          }}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto"
            style={{ minHeight: "420px" }}
          >
            {/* Scene */}
            <defs>
              <linearGradient id="sceneGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>
            <rect
              x={PADDING_X}
              y={PADDING_TOP}
              width={svgWidth - PADDING_X * 2}
              height={SCENE_HEIGHT}
              rx={10}
              fill="url(#sceneGrad)"
            />
            <text
              x={svgWidth / 2}
              y={PADDING_TOP + SCENE_HEIGHT / 2 + 5}
              textAnchor="middle"
              fill="white"
              fontSize={16}
              fontWeight="bold"
              fontFamily="system-ui"
              letterSpacing="2"
            >
              SCÈNE
            </text>

            {/* Table rows */}
            {Object.entries(rows).map(([rowNum, rowTables]) => {
              const rowIndex = parseInt(rowNum) - 1;
              const rowCenterY =
                PADDING_TOP +
                SCENE_HEIGHT +
                SCENE_GAP +
                CELL_RADIUS +
                rowIndex * (CELL_DIAMETER + ROW_GAP);

              const totalRowWidth =
                rowTables.length * CELL_STEP - CELL_GAP;
              const startCenterX =
                (svgWidth - totalRowWidth) / 2 + CELL_RADIUS;

              return rowTables.map((table, tableIndex) => {
                const cx = startCenterX + tableIndex * CELL_STEP;
                const cy = rowCenterY;

                const isSelected = selectedTableId === table.id;
                const hasSelectedSeats = table.seats.some((s) =>
                  selectedSeatIds.includes(s.id)
                );

                return (
                  <g key={table.id}>
                    <TableShape
                      table={table}
                      cx={cx}
                      cy={cy}
                      tableRadius={TABLE_RADIUS}
                      seatRadius={SEAT_RADIUS}
                      seatDist={SEAT_DIST}
                      isSelected={isSelected}
                      hasSelectedSeats={hasSelectedSeats}
                      selectedSeatIds={selectedSeatIds}
                      isHovered={hoveredTable === table.id}
                      onTableClick={() => handleTableClick(table)}
                      onSeatClick={(seat) => handleSeatClick(table, seat)}
                      onMouseEnter={() => setHoveredTable(table.id)}
                      onMouseLeave={() => {
                        setHoveredTable(null);
                        setTooltip(null);
                      }}
                      onMouseMove={(e, seat) =>
                        handleMouseMove(e, table, seat)
                      }
                      readOnly={readOnly}
                    />
                  </g>
                );
              });
            })}

            {/* Row labels */}
            {Object.entries(rows).map(([rowNum, rowTables]) => {
              const rowIndex = parseInt(rowNum) - 1;
              const y =
                PADDING_TOP +
                SCENE_HEIGHT +
                SCENE_GAP +
                CELL_RADIUS +
                rowIndex * (CELL_DIAMETER + ROW_GAP);
              const isVip = rowTables[0]?.isVip;

              return (
                <text
                  key={`label-${rowNum}`}
                  x={16}
                  y={y + 4}
                  fontSize={10}
                  fill={isVip ? "#d97706" : "#94a3b8"}
                  fontWeight="700"
                  fontFamily="system-ui"
                >
                  R{rowNum}
                  {isVip ? " ★" : ""}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip (desktop only) */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50 max-w-[260px] hidden sm:block"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {tooltip.content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function groupByRow(
  tables: TableWithSeats[]
): Record<number, TableWithSeats[]> {
  const rows: Record<number, TableWithSeats[]> = {};
  for (const table of tables) {
    if (!rows[table.rowNumber]) rows[table.rowNumber] = [];
    rows[table.rowNumber].push(table);
  }
  for (const row of Object.values(rows)) {
    row.sort((a, b) => a.tableNumber - b.tableNumber);
  }
  return rows;
}
