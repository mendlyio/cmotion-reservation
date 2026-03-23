"use client";

import { SeatData, TableWithSeats } from "@/types";

interface TableShapeProps {
  table: TableWithSeats;
  x: number;
  y: number;
  size: number;
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
  x,
  y,
  size,
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
  const cx = x + size / 2;
  const cy = y + size / 2;
  const tableRadius = size / 2 - 4;

  const allReserved = table.seats.every((s) => s.status === "reserved");
  const allHeld = table.seats.some((s) => s.status === "held") && !isSelected;
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

  const vipStroke = isVip ? "#d97706" : "#cbd5e1";
  const vipStrokeWidth = isVip ? 2.5 : 1.5;

  const canClickTable =
    !readOnly && isVip && isVipAvailable && !isSelected;
  const tableStyle = canClickTable ? "cursor-pointer" : readOnly ? "" : "";

  return (
    <g
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Table circle */}
      <circle
        cx={cx}
        cy={cy}
        r={tableRadius}
        fill={tableFill}
        stroke={isHovered && canClickTable ? "#2563eb" : vipStroke}
        strokeWidth={isHovered && canClickTable ? 3 : vipStrokeWidth}
        className={tableStyle}
        onClick={isVip ? onTableClick : undefined}
        onMouseMove={(e) => onMouseMove(e)}
        style={{
          transition: "fill 0.2s, stroke 0.2s",
        }}
      />

      {/* Table label */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight="600"
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
          y={cy + 13}
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

      {/* Seats around the table */}
      {table.seats.map((seat, i) => {
        const angle = (i / table.seats.length) * Math.PI * 2 - Math.PI / 2;
        const seatRadius = 7;
        const seatDist = tableRadius + seatRadius + 3;
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
            <circle
              cx={sx}
              cy={sy}
              r={seatRadius}
              fill={fill}
              stroke={isSelectedSeat ? "#1d4ed8" : "white"}
              strokeWidth={isSelectedSeat ? 2 : 1.5}
              className={canClick ? "cursor-pointer" : ""}
              onClick={() => {
                if (canClick || (isVip && !readOnly)) {
                  onSeatClick(seat);
                }
              }}
              onMouseMove={(e) => onMouseMove(e, seat)}
              style={{ transition: "fill 0.2s, stroke 0.2s" }}
            />
            <text
              x={sx}
              y={sy + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7}
              fill="white"
              fontWeight="600"
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
