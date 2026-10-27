import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, seats, tables } from "@/lib/db/schema";
import { getOrCreateSession } from "@/lib/session";
import { DANCER_MEAL_OPTIONS, quoteBooking } from "@/lib/pricing";
import { bookingSchema } from "@/lib/booking-schema";
import { isEventOpen } from "@/lib/open";
import { queryRows, isUniqueViolation } from "@/lib/query";
import { INSERT_RESERVATION_SQL } from "@/lib/sql/booking";

const CHECKOUT_GRACE_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  const sessionId = await getOrCreateSession();
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Données de réservation invalides" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données de réservation invalides" }, { status: 400 });
  }
  const body = parsed.data;

  const [event] = await db.select().from(events).where(eq(events.id, body.eventId));
  if (!event || !isEventOpen(event)) {
    return NextResponse.json({ error: "Les réservations ne sont pas ouvertes pour ce spectacle" }, { status: 403 });
  }

  const seatRows = await db
    .select({
      seatId: seats.id,
      tableId: tables.id,
      eventId: tables.eventId,
      isVip: tables.isVip,
      seatCount: tables.seatCount,
    })
    .from(seats)
    .innerJoin(tables, eq(seats.tableId, tables.id))
    .where(inArray(seats.id, body.seatIds));

  if (seatRows.length !== body.seatIds.length || seatRows.some((row) => row.eventId !== body.eventId)) {
    return NextResponse.json({ error: "Sièges invalides pour ce spectacle" }, { status: 400 });
  }

  const tableIds = [...new Set(seatRows.map((row) => row.tableId))];
  const tableSeatRows = await db
    .select({ id: seats.id, tableId: seats.tableId })
    .from(seats)
    .where(inArray(seats.tableId, tableIds));

  const vipTableIds = [...new Set(seatRows.filter((row) => row.isVip).map((row) => row.tableId))];
  const normalTableIds = [...new Set(seatRows.filter((row) => !row.isVip).map((row) => row.tableId))];
  if (vipTableIds.length > 0 && normalTableIds.length > 0) {
    return NextResponse.json({ error: "Une table VIP se réserve entière, sans mélange" }, { status: 400 });
  }
  if (vipTableIds.length > 1) {
    return NextResponse.json({ error: "Une seule table VIP à la fois" }, { status: 400 });
  }

  const isVip = vipTableIds.length === 1;
  if (isVip) {
    const tableId = vipTableIds[0];
    const expected = tableSeatRows.filter((row) => row.tableId === tableId).map((row) => row.id);
    const got = new Set(body.seatIds);
    if (expected.length !== body.seatIds.length || expected.some((id) => !got.has(id))) {
      return NextResponse.json({ error: "La table VIP doit être réservée en entier" }, { status: 400 });
    }
  }

  const guests = body.guests.map((guest) => ({
    ...guest,
    hasDessert: isVip ? true : guest.hasDessert,
  }));
  const upsells = body.upsells ?? [];
  const quoted = quoteBooking({ isVip, guests, upsells });
  if (!quoted.ok) {
    return NextResponse.json({ error: quoted.error }, { status: 400 });
  }

  const publicToken = randomBytes(16).toString("hex");
  const checkoutExpiry = new Date(Date.now() + CHECKOUT_GRACE_MS);
  const guestJson = JSON.stringify(
    guests.map((guest) => ({
      seat_id: guest.seatId,
      first_name: guest.firstName,
      last_name: guest.lastName,
      meal_choice: guest.mealChoice,
      has_dessert: guest.hasDessert,
    }))
  );
  const upsellJson = JSON.stringify(
    upsells.map((upsell) => {
      const opt = DANCER_MEAL_OPTIONS.find((item) => item.value === upsell.mealChoice);
      return {
        upsell_type: upsell.type,
        quantity: upsell.quantity,
        unit_price: opt?.price ?? 0,
        meal_choice: upsell.mealChoice ?? "",
      };
    })
  );

  try {
    const rows = await queryRows<{ id: number }>(INSERT_RESERVATION_SQL, [
      sessionId,
      body.eventId,
      body.seatIds,
      checkoutExpiry.toISOString(),
      body.seatIds.length,
      guestJson,
      body.referentStudent,
      body.email,
      body.phone,
      quoted.total,
      publicToken,
      upsellJson,
    ]);
    const created = rows[0];
    if (!created) {
      return NextResponse.json(
        { error: "Votre réservation a expiré ou ces sièges ne sont plus disponibles. Veuillez recommencer." },
        { status: 409 }
      );
    }
    return NextResponse.json({
      success: true,
      reservationId: Number(created.id),
      publicToken,
      totalAmount: quoted.total,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Ces sièges viennent d'être réservés. Veuillez recommencer." },
        { status: 409 }
      );
    }
    console.error("Création de réservation", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "Réservation impossible pour le moment" }, { status: 500 });
  }
}
