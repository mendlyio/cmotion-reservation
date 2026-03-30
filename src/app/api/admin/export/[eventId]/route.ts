import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  reservations,
  reservationSeats,
  reservationUpsells,
  seats,
  tables,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { MEAL_OPTIONS, DANCER_MEAL_OPTIONS, DESSERT_LABEL, getTableLabel, getSeatLabel } from "@/types";

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

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const eventReservations = await db
    .select()
    .from(reservations)
    .where(eq(reservations.eventId, eventId));

  const paidReservations = eventReservations.filter((r) => r.stripeStatus === "paid");

  if (paidReservations.length === 0) {
    return new NextResponse("Aucune réservation payée", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const resIds = paidReservations.map((r) => r.id);

  // Guests
  const allGuests = await db
    .select()
    .from(reservationSeats)
    .where(inArray(reservationSeats.reservationId, resIds));

  // Upsells (repas danseur)
  const allUpsells = await db
    .select()
    .from(reservationUpsells)
    .where(inArray(reservationUpsells.reservationId, resIds));

  // Seat → table mapping
  const seatIds = allGuests.map((g) => g.seatId);
  const seatMap: Record<number, { seatNumber: number; tableId: number }> = {};
  const tableMap: Record<number, { rowNumber: number; tableNumber: number; isVip: boolean }> = {};

  if (seatIds.length > 0) {
    const seatDetails = await db
      .select({ id: seats.id, seatNumber: seats.seatNumber, tableId: seats.tableId })
      .from(seats)
      .where(inArray(seats.id, seatIds));

    for (const s of seatDetails) seatMap[s.id] = { seatNumber: s.seatNumber, tableId: s.tableId };

    const tableIds = [...new Set(seatDetails.map((s) => s.tableId))];
    const tableDetails = await db
      .select({ id: tables.id, rowNumber: tables.rowNumber, tableNumber: tables.tableNumber, isVip: tables.isVip })
      .from(tables)
      .where(inArray(tables.id, tableIds));

    for (const t of tableDetails) tableMap[t.id] = { rowNumber: t.rowNumber, tableNumber: t.tableNumber, isVip: t.isVip };
  }

  const resMap: Record<number, (typeof paidReservations)[0]> = {};
  for (const r of paidReservations) resMap[r.id] = r;

  // Group upsells per reservation
  const upsellsByRes: Record<number, string[]> = {};
  for (const u of allUpsells) {
    if (u.upsellType === "repas_danseur" && u.mealChoice) {
      const opt = DANCER_MEAL_OPTIONS.find((o) => o.value === u.mealChoice);
      const label = opt?.label || u.mealChoice;
      if (!upsellsByRes[u.reservationId]) upsellsByRes[u.reservationId] = [];
      for (let i = 0; i < u.quantity; i++) upsellsByRes[u.reservationId].push(label);
    }
  }

  // ── SECTION 1 : Convives ────────────────────────────────────────────────────
  const guestHeaders = [
    "Rés. #",
    "Élève référent",
    "Email",
    "Téléphone",
    "VIP",
    "Table",
    "Siège",
    "Prénom",
    "Nom",
    "Repas",
    "Dessert",
    "Repas Danseur(s)",
    "Total payé (€)",
    "Note admin",
  ];

  // Sort: by table row, then table number, then seat
  const sortedGuests = [...allGuests].sort((a, b) => {
    const sa = seatMap[a.seatId];
    const sb = seatMap[b.seatId];
    const ta = sa ? tableMap[sa.tableId] : null;
    const tb = sb ? tableMap[sb.tableId] : null;
    if (ta && tb) {
      if (ta.rowNumber !== tb.rowNumber) return ta.rowNumber - tb.rowNumber;
      if (ta.tableNumber !== tb.tableNumber) return ta.tableNumber - tb.tableNumber;
    }
    return (sa?.seatNumber ?? 0) - (sb?.seatNumber ?? 0);
  });

  const guestRows = sortedGuests.map((g) => {
    const seat = seatMap[g.seatId];
    const table = seat ? tableMap[seat.tableId] : null;
    const res = resMap[g.reservationId];
    const meal = MEAL_OPTIONS.find((m) => m.value === g.mealChoice)?.label || g.mealChoice;
    const dancerList = (upsellsByRes[g.reservationId] || []).join(", ");

    return [
      `#${g.reservationId}`,
      res?.referentStudent || "",
      res?.email || "",
      res?.phone || "",
      table?.isVip ? "VIP" : "",
      table ? `${getTableLabel(table.rowNumber, table.tableNumber)}` : "",
      seat ? getSeatLabel(seat.seatNumber) : "",
      g.firstName,
      g.lastName,
      meal,
      g.hasDessert ? DESSERT_LABEL : "",
      dancerList,
      res ? ((res.totalAmount) / 100).toFixed(2) : "",
      g.adminNotes || "",
    ];
  });

  // ── SECTION 2 : Récap traiteur ─────────────────────────────────────────────
  const mealTotals: Record<string, number> = {};
  let dessertTotal = 0;
  for (const g of allGuests) {
    const label = MEAL_OPTIONS.find((m) => m.value === g.mealChoice)?.label || g.mealChoice;
    mealTotals[label] = (mealTotals[label] || 0) + 1;
    if (g.hasDessert) dessertTotal++;
  }

  const dancerTotals: Record<string, number> = {};
  for (const u of allUpsells) {
    if (u.upsellType === "repas_danseur" && u.mealChoice) {
      const label = DANCER_MEAL_OPTIONS.find((o) => o.value === u.mealChoice)?.label || u.mealChoice;
      dancerTotals[label] = (dancerTotals[label] || 0) + u.quantity;
    }
  }

  const recapRows: string[][] = [
    [],
    ["RÉCAPITULATIF TRAITEUR"],
    ["Plat convive", "Quantité"],
    ...Object.entries(mealTotals).map(([label, count]) => [label, count.toString()]),
    [DESSERT_LABEL, dessertTotal.toString()],
  ];

  if (Object.keys(dancerTotals).length > 0) {
    recapRows.push([]);
    recapRows.push(["Repas Danseur", "Quantité"]);
    for (const [label, count] of Object.entries(dancerTotals)) {
      recapRows.push([label, count.toString()]);
    }
  }

  // ── Build CSV ─────────────────────────────────────────────────────────────
  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const formatRow = (row: string[]) => row.map(escape).join(",");

  const csvLines = [
    `CMOTION — ${event.name} — ${new Date(event.eventDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ${event.timeInfo}`,
    "",
    "LISTE CONVIVES",
    formatRow(guestHeaders),
    ...guestRows.map(formatRow),
    ...recapRows.map((row) =>
      row.length === 0 ? "" : row.length === 1 ? escape(row[0]) : formatRow(row)
    ),
  ];

  const bom = "\uFEFF";
  const csv = bom + csvLines.join("\n");

  const dateSlug = event.eventDate;
  const nameSlug = event.name.replace(/\s+/g, "-").toLowerCase();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cmotion-${nameSlug}-${dateSlug}.csv"`,
    },
  });
}
