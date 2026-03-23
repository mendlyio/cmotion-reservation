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

export function SeatingPlan({
  eventId,
  tables: initialTables,
  onTableSelect,
  onSeatsSelect,
  selectedTableId,
  selectedSeatIds = [],
  sessionId,
  holdExpiresAt,
  readOnly = false,
}: SeatingPlanProps) {
  const [tables, setTables] = useState<TableWithSeats[]>(initialTables);
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/seating/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setTables(data.tables);
        }
      } catch {
        // silent fail on polling
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const rows = groupByRow(tables);

  const maxTablesInRow = Math.max(...Object.values(rows).map((r) => r.length));
  const totalRows = Object.keys(rows).length;

  const TABLE_SIZE = 80;
  const TABLE_GAP = 16;
  const ROW_GAP = 24;
  const PADDING = 40;
  const SCENE_HEIGHT = 60;

  const svgWidth =
    maxTablesInRow * (TABLE_SIZE + TABLE_GAP) - TABLE_GAP + PADDING * 2;
  const svgHeight =
    SCENE_HEIGHT + 40 + totalRows * (TABLE_SIZE + ROW_GAP) + PADDING * 2;

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
          content = `Siège ${seat.seatNumber}, Table ${table.rowNumber}-${table.tableNumber} — En cours de réservation, sera libéré ou confirmé sous peu`;
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
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <SeatingLegend />

      <div className="min-w-[700px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto"
          style={{ minHeight: "500px" }}
        >
          {/* Scene */}
          <defs>
            <linearGradient id="sceneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>
          <rect
            x={PADDING}
            y={PADDING}
            width={svgWidth - PADDING * 2}
            height={SCENE_HEIGHT}
            rx={12}
            fill="url(#sceneGrad)"
          />
          <text
            x={svgWidth / 2}
            y={PADDING + SCENE_HEIGHT / 2 + 6}
            textAnchor="middle"
            fill="white"
            fontSize={18}
            fontWeight="bold"
            fontFamily="system-ui"
          >
            SCÈNE
          </text>

          {/* Table rows */}
          {Object.entries(rows).map(([rowNum, rowTables]) => {
            const rowIndex = parseInt(rowNum) - 1;
            const rowY =
              PADDING + SCENE_HEIGHT + 40 + rowIndex * (TABLE_SIZE + ROW_GAP);
            const totalRowWidth =
              rowTables.length * (TABLE_SIZE + TABLE_GAP) - TABLE_GAP;
            const startX = (svgWidth - totalRowWidth) / 2;

            return rowTables.map((table, tableIndex) => {
              const x = startX + tableIndex * (TABLE_SIZE + TABLE_GAP);
              const isSelected = selectedTableId === table.id;
              const hasSelectedSeats = table.seats.some((s) =>
                selectedSeatIds.includes(s.id)
              );

              return (
                <g key={table.id}>
                  <TableShape
                    table={table}
                    x={x}
                    y={rowY}
                    size={TABLE_SIZE}
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
            const rowY =
              PADDING +
              SCENE_HEIGHT +
              40 +
              rowIndex * (TABLE_SIZE + ROW_GAP) +
              TABLE_SIZE / 2;
            const isVip = rowTables[0]?.isVip;

            return (
              <text
                key={`label-${rowNum}`}
                x={14}
                y={rowY + 4}
                fontSize={11}
                fill={isVip ? "#d97706" : "#64748b"}
                fontWeight="600"
                fontFamily="system-ui"
              >
                R{rowNum}
                {isVip ? " ★" : ""}
              </text>
            );
          })}
        </svg>
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50 max-w-[280px]"
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
  for (const table of tables) {
    if (!rows[table.rowNumber]) rows[table.rowNumber] = [];
    rows[table.rowNumber].push(table);
  }
  for (const row of Object.values(rows)) {
    row.sort((a, b) => a.tableNumber - b.tableNumber);
  }
  return rows;
}
