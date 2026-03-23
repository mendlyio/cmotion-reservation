import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tables, seats, holds } from "@/lib/db/schema";
import { eq, lt, and, inArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: eventIdStr } = await params;
  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  // Cleanup expired holds first
  const now = new Date();
  const expiredHolds = await db
    .select()
    .from(holds)
    .where(and(eq(holds.eventId, eventId), lt(holds.expiresAt, now)));

  if (expiredHolds.length > 0) {
    const expiredSeatIds = expiredHolds
      .filter((h) => h.seatId !== null)
      .map((h) => h.seatId!);

    if (expiredSeatIds.length > 0) {
      await db
        .update(seats)
        .set({ status: "available" })
        .where(
          and(inArray(seats.id, expiredSeatIds), eq(seats.status, "held"))
        );
    }

    const expiredHoldIds = expiredHolds.map((h) => h.id);
    await db.delete(holds).where(inArray(holds.id, expiredHoldIds));
  }

  // Fetch all tables with their seats
  const eventTables = await db
    .select()
    .from(tables)
    .where(eq(tables.eventId, eventId))
    .orderBy(tables.rowNumber, tables.tableNumber);

  const tableIds = eventTables.map((t) => t.id);

  let allSeats: (typeof seats.$inferSelect)[] = [];
  if (tableIds.length > 0) {
    allSeats = await db
      .select()
      .from(seats)
      .where(inArray(seats.tableId, tableIds))
      .orderBy(seats.tableId, seats.seatNumber);
  }

  const seatsByTable = new Map<number, (typeof seats.$inferSelect)[]>();
  for (const seat of allSeats) {
    if (!seatsByTable.has(seat.tableId)) {
      seatsByTable.set(seat.tableId, []);
    }
    seatsByTable.get(seat.tableId)!.push(seat);
  }

  const tablesWithSeats = eventTables.map((table) => ({
    ...table,
    seats: seatsByTable.get(table.id) || [],
  }));

  return NextResponse.json({ tables: tablesWithSeats });
}
