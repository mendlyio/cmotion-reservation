import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tables, seats } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { performReservationMaintenance } from "@/lib/maintenance";

// Cache Vercel Edge : 8 secondes de fraîcheur, servi jusqu'à 15s en revalidation
// Réduit les hits DB de N_utilisateurs × 1/10s à 1 hit/8s par edge region
export const revalidate = 8;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: eventIdStr } = await params;
  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  await performReservationMaintenance();

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
  // Cache CDN Vercel : frais 8s, sert du stale jusqu'à 15s pendant la revalidation
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=8, stale-while-revalidate=15"
  );
  return response;
}
