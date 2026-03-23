"use client";

import { SeatData, TableWithSeats } from "@/types";

interface TableShapeProps {
  table: TableWithSeats;
  cx: number;
  cy: number;
  tableRadius: number;
  seatRadius: number;
  seatDist: number;
  isSelected: boolean;
  hasSelectedSeats: boolean;
  selectedSeatIds: number[];
  isHovered: boolean;
  onTableClick: () => void;
  onSeatClick: (seat: SeatData) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove: (e: React.MouseEvent<SVGElement>, seat?: SeatData) => void;
  readOnly: boolean;
}

// Couleurs des sièges — DOIVENT correspondre exactement à SEAT_COLORS dans SeatingPlan
export const SEAT_COLORS: Record<string, string> = {
  available: "#34d399",
  held: "#fbbf24",
  reserved: "#64748b",
  selected: "#818cf8",
};

export function TableShape({
  table, cx, cy, tableRadius: tr, seatRadius: sr, seatDist: sd,
  isSelected, selectedSeatIds, isHovered,
  onTableClick, onSeatClick, onMouseEnter, onMouseLeave, onMouseMove, readOnly,
}: TableShapeProps) {
  const allRes = table.seats.every((s) => s.status === "reserved");
  const anyHeld = table.seats.some((s) => s.status === "held") && !isSelected;
  const vip = table.isVip;
  const vipOk = vip && table.seats.every((s) => s.status === "available" || selectedSeatIds.includes(s.id));
  const canClick = !readOnly && vip && vipOk && !isSelected;

  let fill = "rgba(255,255,255,0.03)";
  if (isSelected) fill = "rgba(129,140,248,0.12)";
  else if (allRes) fill = "rgba(100,116,139,0.08)";
  else if (anyHeld) fill = "rgba(251,191,36,0.06)";

  const stroke = vip
    ? (isHovered && canClick ? "#fbbf24" : "#d97706")
    : (isSelected ? "#818cf8" : "rgba(255,255,255,0.06)");

  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <circle cx={cx} cy={cy} r={tr} fill={fill} stroke={stroke} strokeWidth={vip ? 1.5 : 0.5}
        className={canClick ? "cursor-pointer" : ""} onClick={vip ? onTableClick : undefined}
        onMouseMove={(e) => onMouseMove(e)} style={{ transition: "fill .2s, stroke .2s" }} />

      <text x={cx} y={cy + (vip ? -1 : 1)} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontWeight="800" fill="rgba(255,255,255,0.3)" fontFamily="system-ui" pointerEvents="none">
        T{table.tableNumber}
      </text>
      {vip && (
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={5} fontWeight="900"
          fill="#fbbf24" fontFamily="system-ui" pointerEvents="none" letterSpacing="1">
          VIP
        </text>
      )}

      {table.seats.map((seat, i) => {
        const a = (i / table.seats.length) * Math.PI * 2 - Math.PI / 2;
        const sx = cx + Math.cos(a) * sd;
        const sy = cy + Math.sin(a) * sd;
        const sel = selectedSeatIds.includes(seat.id);
        const color = sel ? SEAT_COLORS.selected : SEAT_COLORS[seat.status] || SEAT_COLORS.available;
        const canClickSeat = !readOnly && !vip && (seat.status === "available" || sel);

        return (
          <g key={seat.id}>
            <circle cx={sx} cy={sy} r={sr + 4} fill="transparent"
              className={canClickSeat || (vip && !readOnly) ? "cursor-pointer" : ""}
              onClick={() => { if (canClickSeat || (vip && !readOnly)) onSeatClick(seat); }}
              onMouseMove={(e) => onMouseMove(e, seat)} />
            <circle cx={sx} cy={sy} r={sr} fill={color}
              stroke={sel ? "#a5b4fc" : "rgba(0,0,0,0.25)"} strokeWidth={sel ? 1.5 : 0.5}
              pointerEvents="none" style={{ transition: "fill .15s" }} />
            <text x={sx} y={sy + 0.5} textAnchor="middle" dominantBaseline="middle"
              fontSize={6} fill={seat.status === "reserved" && !sel ? "rgba(255,255,255,0.5)" : "white"} fontWeight="800" fontFamily="system-ui" pointerEvents="none">
              {seat.seatNumber}
            </text>
          </g>
        );
      })}
    </g>
  );
}
