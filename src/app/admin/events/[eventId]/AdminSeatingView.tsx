"use client";

import { SeatingPlan } from "@/components/seating/SeatingPlan";
import { TableWithSeats } from "@/types";

interface AdminSeatingViewProps {
  tables: TableWithSeats[];
  eventId: number;
}

export function AdminSeatingView({ tables, eventId }: AdminSeatingViewProps) {
  return (
    <SeatingPlan
      eventId={eventId}
      tables={tables}
      readOnly={true}
    />
  );
}
