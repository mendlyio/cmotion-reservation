import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  reservations,
  reservationSeats,
  seats,
  tables,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { MEAL_OPTIONS } from "@/types";

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

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const eventReservations = await db
    .select()
    .from(reservations)
    .where(eq(reservations.eventId, eventId));

  const paidReservations = eventReservations.filter(
    (r) => r.stripeStatus === "paid"
  );

  if (paidReservations.length === 0) {
    return new NextResponse("Aucune réservation payée", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const resIds = paidReservations.map((r) => r.id);

  const allGuests = await db
    .select()
    .from(reservationSeats)
    .where(inArray(reservationSeats.reservationId, resIds));

  const seatIds = allGuests.map((g) => g.seatId);
  const seatMap: Record<number, { seatNumber: number; tableId: number }> = {};
  const tableMap: Record<
    number,
    { rowNumber: number; tableNumber: number; isVip: boolean }
  > = {};

  if (seatIds.length > 0) {
    const seatDetails = await db
      .select({
        id: seats.id,
        seatNumber: seats.seatNumber,
        tableId: seats.tableId,
      })
      .from(seats)
      .where(inArray(seats.id, seatIds));

    for (const s of seatDetails) {
      seatMap[s.id] = { seatNumber: s.seatNumber, tableId: s.tableId };
    }

    const tableIds = [...new Set(seatDetails.map((s) => s.tableId))];
    const tableDetails = await db
      .select({
        id: tables.id,
        rowNumber: tables.rowNumber,
        tableNumber: tables.tableNumber,
        isVip: tables.isVip,
      })
      .from(tables)
      .where(inArray(tables.id, tableIds));

    for (const t of tableDetails) {
      tableMap[t.id] = {
        rowNumber: t.rowNumber,
        tableNumber: t.tableNumber,
        isVip: t.isVip,
      };
    }
  }

  const resMap: Record<number, (typeof paidReservations)[0]> = {};
  for (const r of paidReservations) {
    resMap[r.id] = r;
  }

  // Build CSV
  const headers = [
    "Réservation",
    "Référent",
    "Email",
    "Table",
    "Rang",
    "VIP",
    "Siège",
    "Prénom",
    "Nom",
    "Repas",
    "Dessert",
    "Note Admin",
  ];

  const rows = allGuests.map((g) => {
    const seat = seatMap[g.seatId];
    const table = seat ? tableMap[seat.tableId] : null;
    const res = resMap[g.reservationId];
    const meal =
      MEAL_OPTIONS.find((m) => m.value === g.mealChoice)?.label ||
      g.mealChoice;

    return [
      `#${g.reservationId}`,
      res?.referentStudent || "",
      res?.email || "",
      table ? `${table.rowNumber}-${table.tableNumber}` : "",
      table?.rowNumber?.toString() || "",
      table?.isVip ? "Oui" : "Non",
      seat?.seatNumber?.toString() || "",
      g.firstName,
      g.lastName,
      meal,
      g.hasDessert ? "Tiramisu" : "",
      g.adminNotes || "",
    ];
  });

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\n");

  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cmotion-${event.name.replace(/\s+/g, "-")}-${event.eventDate}.csv"`,
    },
  });
}
