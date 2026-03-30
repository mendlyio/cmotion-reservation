"use client";

import { SeatData, TableWithSeats, getTableLabel, getSeatLabel } from "@/types";

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

export const SEAT_COLORS: Record<string, string> = {
  available: "#4ade80",   // vert — libre
  held:      "#fbbf24",   // ambre — en cours
  reserved:  "#374151",   // gris — pris
  selected:  "#3b82f6",   // bleu — ma sélection
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
  const hasAvailNormal = !vip && table.seats.some((s) => s.status === "available" || selectedSeatIds.includes(s.id));
  const canClick = !readOnly && ((vip && vipOk && !isSelected) || hasAvailNormal);

  // Fond de la table
  let fill = "rgba(255,255,255,0.03)";
  if (isSelected) fill = "rgba(59,130,246,0.15)";
  else if (allRes) fill = "rgba(55,65,81,0.15)";
  else if (anyHeld) fill = "rgba(251,191,36,0.08)";

  // Bordure de la table
  const stroke = vip
    ? (isHovered && canClick ? "#e4c76b" : "#c9a227")
    : (isSelected ? "#3b82f6" : isHovered && hasAvailNormal && !readOnly ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)");

  const strokeW = vip ? 1.5 : isSelected ? 1 : 0.5;

  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Glow VIP */}
      {vip && (
        <circle cx={cx} cy={cy} r={tr + 4}
          fill="none" stroke="#c9a227" strokeWidth={6} opacity={0.06} />
      )}

      {/* Cercle de table */}
      <circle cx={cx} cy={cy} r={tr} fill={fill} stroke={stroke} strokeWidth={strokeW}
        className={canClick ? "cursor-pointer" : ""}
        onClick={canClick ? onTableClick : undefined}
        onMouseMove={(e) => onMouseMove(e)}
        style={{ transition: "fill .2s, stroke .2s" }}
      />

      {/* Numéro de table */}
      <text x={cx} y={cy + (vip ? -2 : 1)} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontWeight="800"
        fill={vip ? "rgba(201,162,39,0.6)" : "rgba(255,255,255,0.25)"}
        fontFamily="system-ui" pointerEvents="none">
        T{getTableLabel(table.rowNumber, table.tableNumber)}
      </text>
      {vip && (
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={5} fontWeight="900"
          fill="#c9a227" fontFamily="system-ui" pointerEvents="none" letterSpacing="1">
          VIP
        </text>
      )}

      {/* Sièges */}
      {table.seats.map((seat, i) => {
        const a = (i / table.seats.length) * Math.PI * 2 - Math.PI / 2;
        const sx = cx + Math.cos(a) * sd;
        const sy = cy + Math.sin(a) * sd;
        const sel = selectedSeatIds.includes(seat.id);
        const color = sel ? SEAT_COLORS.selected : (SEAT_COLORS[seat.status] ?? SEAT_COLORS.available);
        const canClickSeat = !readOnly && !vip && (seat.status === "available" || sel);

        return (
          <g key={seat.id}>
            {/* Zone de clic élargie */}
            <circle cx={sx} cy={sy} r={sr + 4} fill="transparent"
              className={canClickSeat || (vip && !readOnly) ? "cursor-pointer" : ""}
              onClick={() => { if (canClickSeat || (vip && !readOnly)) onSeatClick(seat); }}
              onMouseMove={(e) => onMouseMove(e, seat)}
            />
            {/* Halo de sélection */}
            {sel && (
              <circle cx={sx} cy={sy} r={sr + 2.5}
                fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.5} />
            )}
            {/* Siège */}
            <circle cx={sx} cy={sy} r={sr} fill={color}
              stroke={sel ? "#93c5fd" : "rgba(0,0,0,0.35)"} strokeWidth={sel ? 1.5 : 0.5}
              pointerEvents="none" style={{ transition: "fill .15s" }}
            />
            {/* Numéro de siège */}
            <text x={sx} y={sy + 0.5} textAnchor="middle" dominantBaseline="middle"
              fontSize={6}
              fill={seat.status === "reserved" && !sel ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.8)"}
              fontWeight="900" fontFamily="system-ui" pointerEvents="none">
              {getSeatLabel(seat.seatNumber)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
