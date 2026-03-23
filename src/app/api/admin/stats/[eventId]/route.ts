import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tables, seats, reservations, reservationSeats } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId: eidStr } = await params;
  const eventId = parseInt(eidStr);

  const eventTables = await db
    .select()
    .from(tables)
    .where(eq(tables.eventId, eventId));

  const tableIds = eventTables.map((t) => t.id);
  let allSeats: (typeof seats.$inferSelect)[] = [];
  if (tableIds.length > 0) {
    allSeats = await db
      .select()
      .from(seats)
      .where(inArray(seats.tableId, tableIds));
  }

  const totalSeats = allSeats.length;
  const reserved = allSeats.filter((s) => s.status === "reserved").length;
  const held = allSeats.filter((s) => s.status === "held").length;

  const eventReservations = await db
    .select()
    .from(reservations)
    .where(eq(reservations.eventId, eventId));

  const paid = eventReservations.filter((r) => r.stripeStatus === "paid");
  const revenue = paid.reduce((sum, r) => sum + r.totalAmount, 0);

  const paidIds = paid.map((r) => r.id);
  const mealCounts: Record<string, number> = {};
  let dessertCount = 0;

  if (paidIds.length > 0) {
    const allGuests = await db
      .select()
      .from(reservationSeats)
      .where(inArray(reservationSeats.reservationId, paidIds));

    for (const guest of allGuests) {
      mealCounts[guest.mealChoice] = (mealCounts[guest.mealChoice] || 0) + 1;
      if (guest.hasDessert) dessertCount++;
    }
  }

  return NextResponse.json({
    totalSeats,
    reserved,
    held,
    available: totalSeats - reserved - held,
    occupancyRate: totalSeats > 0 ? Math.round((reserved / totalSeats) * 100) : 0,
    revenue,
    totalReservations: eventReservations.length,
    paidReservations: paid.length,
    mealCounts,
    dessertCount,
  });
}
