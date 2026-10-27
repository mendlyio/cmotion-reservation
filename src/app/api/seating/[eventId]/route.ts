import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tables, seats } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: eventIdStr } = await params;
  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

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
    if (!seatsByTable.has(seat.tableId)) seatsByTable.set(seat.tableId, []);
    seatsByTable.get(seat.tableId)!.push(seat);
  }

  const tablesWithSeats = eventTables.map((table) => ({
    ...table,
    seats: seatsByTable.get(table.id) || [],
  }));

  const response = NextResponse.json({ tables: tablesWithSeats });
  // Le navigateur ne met rien en cache. Le CDN garde la réponse 2 secondes.
  response.headers.set("Cache-Control", "public, max-age=0, s-maxage=2");
  return response;
}
