import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { events, reservationSeats, reservationUpsells, reservations, seats, tables } from "@/lib/db/schema";
import { canEditMeals, formatDeadlineFr, mealEditDeadline } from "@/lib/deadline";
import { validateMealEdit } from "@/lib/meals";
import { queryRows } from "@/lib/query";
import { UPDATE_MEALS_SQL } from "@/lib/sql/booking";
import { mealLabel } from "@/lib/pricing";
import { renderUpdateEmail } from "@/emails/ReservationUpdateEmail";
import { resend } from "@/lib/resend";

const bodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{32}$/i),
  guests: z
    .array(
      z.object({
        id: z.number().int().positive(),
        mealChoice: z.string().trim().min(1).max(40),
        hasDessert: z.boolean(),
      })
    )
    .min(1)
    .max(40),
  upsells: z
    .array(
      z.object({
        id: z.number().int().positive(),
        mealChoice: z.string().trim().min(1).max(40),
      })
    )
    .max(16),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const body = parsed.data;

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.publicToken, body.token.toLowerCase()));
  if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (reservation.stripeStatus !== "paid") {
    return NextResponse.json({ error: "La réservation n'est pas payée" }, { status: 403 });
  }

  const [event] = await db.select().from(events).where(eq(events.id, reservation.eventId));
  if (!event) return NextResponse.json({ error: "Spectacle introuvable" }, { status: 404 });
  if (!canEditMeals(event.eventDate)) {
    return NextResponse.json(
      { error: `La modification des plats est close depuis le ${formatDeadlineFr(mealEditDeadline(event.eventDate))}` },
      { status: 403 }
    );
  }

  const guestRows = await db.select().from(reservationSeats).where(eq(reservationSeats.reservationId, reservation.id));
  const upsellRows = await db
    .select()
    .from(reservationUpsells)
    .where(eq(reservationUpsells.reservationId, reservation.id));
  const seatIds = guestRows.map((guest) => guest.seatId);
  const seatRows = seatIds.length
    ? await db.select({ id: seats.id, tableId: seats.tableId }).from(seats).where(inArray(seats.id, seatIds))
    : [];
  const tableIds = [...new Set(seatRows.map((seat) => seat.tableId))];
  const tableRows = tableIds.length
    ? await db.select({ id: tables.id, isVip: tables.isVip }).from(tables).where(inArray(tables.id, tableIds))
    : [];
  const isVip = tableRows.some((table) => table.isVip);

  const check = validateMealEdit({
    isVip,
    currentGuestIds: guestRows.map((guest) => guest.id),
    currentUpsellIds: upsellRows.map((upsell) => upsell.id),
    guests: body.guests,
    upsells: body.upsells,
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const updated = await queryRows<{ guests: number; upsells: number }>(UPDATE_MEALS_SQL, [
    reservation.id,
    JSON.stringify(body.guests.map((guest) => ({
      id: guest.id,
      meal_choice: guest.mealChoice,
      has_dessert: guest.hasDessert,
    }))),
    JSON.stringify(body.upsells.map((upsell) => ({ id: upsell.id, meal_choice: upsell.mealChoice }))),
  ]);
  const written = updated[0];
  if (!written || Number(written.guests) !== body.guests.length) {
    return NextResponse.json({ error: "Modification impossible" }, { status: 409 });
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (from) {
    const changes = body.guests.map((guest) => {
      const previous = guestRows.find((row) => row.id === guest.id);
      const name = previous ? `${previous.firstName} ${previous.lastName}` : "Convive";
      return `${name} : ${mealLabel(guest.mealChoice)}${guest.hasDessert ? ", dessert" : ""}`;
    });
    const html = renderUpdateEmail({
      reservationId: reservation.id,
      eventName: event.name,
      eventDate: event.eventDate,
      timeInfo: event.timeInfo,
      changes,
      guests: body.guests.map((guest) => {
        const previous = guestRows.find((row) => row.id === guest.id);
        return {
          firstName: previous?.firstName ?? "",
          lastName: previous?.lastName ?? "",
          mealChoice: guest.mealChoice,
          hasDessert: guest.hasDessert,
        };
      }),
    });
    try {
      await resend.emails.send({
        from,
        to: reservation.email,
        subject: "Modification des plats — Disney Show",
        html,
      });
    } catch (error) {
      console.error("Email de modification non envoyé", error instanceof Error ? error.name : "error");
    }
  }

  return NextResponse.json({ success: true, totalAmount: reservation.totalAmount });
}
