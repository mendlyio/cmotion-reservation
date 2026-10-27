import { db } from "@/lib/db";
import { events, seats, tables } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { verifyAdmin } from "@/lib/admin";
import { PrintPlan } from "./PrintPlan";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ eventId: string }>;
}

export default async function PrintSeatingPage({ params }: Props) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect("/admin");

  const { eventId: raw } = await params;
  const eventId = Number.parseInt(raw, 10);
  if (!Number.isInteger(eventId)) notFound();

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) notFound();

  const eventTables = await db
    .select()
    .from(tables)
    .where(eq(tables.eventId, eventId))
    .orderBy(tables.rowNumber, tables.tableNumber);
  const tableIds = eventTables.map((table) => table.id);
  const seatRows = tableIds.length ? await db.select().from(seats).where(inArray(seats.tableId, tableIds)) : [];
  const tablesWithSeats = eventTables.map((table) => ({
    ...table,
    seats: seatRows.filter((seat) => seat.tableId === table.id),
  }));

  return (
    <PrintPlan
      eventId={eventId}
      title={`${event.name} · ${event.timeInfo}`}
      tables={tablesWithSeats}
    />
  );
}
