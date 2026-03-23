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

const STATUS_COLORS: Record<string, string> = {
  available: "#22c55e",
  held: "#a855f7",
  reserved: "#ef4444",
  selected: "#3b82f6",
};

export function TableShape({
  table,
  cx,
  cy,
  tableRadius,
  seatRadius,
  seatDist,
  isSelected,
  selectedSeatIds,
  isHovered,
  onTableClick,
  onSeatClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  readOnly,
}: TableShapeProps) {
  const allReserved = table.seats.every((s) => s.status === "reserved");
  const allHeld =
    table.seats.some((s) => s.status === "held") && !isSelected;
  const isVip = table.isVip;

  const isVipAvailable =
    isVip &&
    table.seats.every(
      (s) => s.status === "available" || selectedSeatIds.includes(s.id)
    );

  let tableFill = "#f1f5f9";
  if (isSelected) tableFill = "#dbeafe";
  else if (allReserved) tableFill = "#fecaca";
  else if (allHeld) tableFill = "#e9d5ff";

  const strokeColor = isVip ? "#d97706" : "#cbd5e1";
  const strokeWidth = isVip ? 2.5 : 1.5;

  const canClickTable =
    !readOnly && isVip && isVipAvailable && !isSelected;

  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Table circle */}
      <circle
        cx={cx}
        cy={cy}
        r={tableRadius}
        fill={tableFill}
        stroke={isHovered && canClickTable ? "#2563eb" : strokeColor}
        strokeWidth={isHovered && canClickTable ? 3 : strokeWidth}
        className={canClickTable ? "cursor-pointer" : ""}
        onClick={isVip ? onTableClick : undefined}
        onMouseMove={(e) => onMouseMove(e)}
        style={{ transition: "fill 0.2s, stroke 0.2s" }}
      />

      {/* Table label */}
      <text
        x={cx}
        y={cy + (isVip ? -2 : 1)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight="700"
        fill="#475569"
        fontFamily="system-ui"
        pointerEvents="none"
      >
        {table.rowNumber}-{table.tableNumber}
      </text>

      {/* VIP badge */}
      {isVip && (
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize={7}
          fontWeight="bold"
          fill="#d97706"
          fontFamily="system-ui"
          pointerEvents="none"
        >
          VIP
        </text>
      )}

      {/* Seats arranged around the table */}
      {table.seats.map((seat, i) => {
        const angle =
          (i / table.seats.length) * Math.PI * 2 - Math.PI / 2;
        const sx = cx + Math.cos(angle) * seatDist;
        const sy = cy + Math.sin(angle) * seatDist;

        const isSelectedSeat = selectedSeatIds.includes(seat.id);
        let fill = STATUS_COLORS[seat.status] || STATUS_COLORS.available;
        if (isSelectedSeat) fill = STATUS_COLORS.selected;

        const canClick =
          !readOnly &&
          !isVip &&
          (seat.status === "available" || isSelectedSeat);

        return (
          <g key={seat.id}>
            {/* Invisible bigger hit area for touch */}
            <circle
              cx={sx}
              cy={sy}
              r={seatRadius + 4}
              fill="transparent"
              className={canClick || (isVip && !readOnly) ? "cursor-pointer" : ""}
              onClick={() => {
                if (canClick || (isVip && !readOnly)) {
                  onSeatClick(seat);
                }
              }}
              onMouseMove={(e) => onMouseMove(e, seat)}
            />
            {/* Visible seat */}
            <circle
              cx={sx}
              cy={sy}
              r={seatRadius}
              fill={fill}
              stroke={isSelectedSeat ? "#1d4ed8" : "white"}
              strokeWidth={isSelectedSeat ? 2.5 : 1.5}
              pointerEvents="none"
              style={{ transition: "fill 0.2s, stroke 0.2s" }}
            />
            <text
              x={sx}
              y={sy + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fill="white"
              fontWeight="700"
              fontFamily="system-ui"
              pointerEvents="none"
            >
              {seat.seatNumber}
            </text>
          </g>
        );
      })}
    </g>
  );
}
