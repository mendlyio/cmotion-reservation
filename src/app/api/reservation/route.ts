import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  reservations,
  reservationSeats,
  reservationUpsells,
  holds,
  seats,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreateSession } from "@/lib/session";
import { calculateTotal, BookingFormData, DANCER_MEAL_OPTIONS } from "@/types";

// Grace period after reservation creation to cover Stripe checkout duration
const CHECKOUT_GRACE_MS = 45 * 60 * 1000; // 45 minutes

export async function POST(request: NextRequest) {
  const sessionId = await getOrCreateSession();
  const body: BookingFormData = await request.json();

  const {
    eventId,
    tableId,
    seatIds,
    isVip,
    guests,
    upsells,
    referentStudent,
    email,
    phone,
  } = body;

  if (!eventId || !tableId || !guests || guests.length === 0 || !email) {
    return NextResponse.json(
      { error: "Données de réservation incomplètes" },
      { status: 400 }
    );
  }

  // Verify the session holds these seats and holds haven't expired
  const now = new Date();
  const sessionHolds = await db
    .select()
    .from(holds)
    .where(and(eq(holds.sessionId, sessionId), eq(holds.eventId, eventId)));

  const validHolds = sessionHolds.filter(
    (h) => h.seatId !== null && new Date(h.expiresAt) > now
  );
  const heldSeatIds = validHolds.map((h) => h.seatId!);

  const allSeatsHeld = seatIds.every((id) => heldSeatIds.includes(id));
  if (!allSeatsHeld) {
    return NextResponse.json(
      { error: "Votre réservation a expiré. Veuillez recommencer." },
      { status: 409 }
    );
  }

  // Verify seats are still held
  const heldSeats = await db
    .select()
    .from(seats)
    .where(and(inArray(seats.id, seatIds), eq(seats.status, "held")));

  if (heldSeats.length !== seatIds.length) {
    return NextResponse.json(
      { error: "Certains sièges ne sont plus disponibles" },
      { status: 409 }
    );
  }

  // Final anti-double-booking guard: only block if a PAID reservation already
  // claims these seats. Pending/failed reservations are abandoned and must not
  // permanently lock seats.
  const alreadyBooked = await db
    .select({ seatId: reservationSeats.seatId })
    .from(reservationSeats)
    .innerJoin(reservations, eq(reservations.id, reservationSeats.reservationId))
    .where(
      and(
        inArray(reservationSeats.seatId, seatIds),
        eq(reservations.stripeStatus, "paid")
      )
    );

  if (alreadyBooked.length > 0) {
    return NextResponse.json(
      { error: "Ces sièges ont déjà été réservés. Veuillez recommencer." },
      { status: 409 }
    );
  }

  const totalAmount = calculateTotal(body);

  // Extend hold expiry to cover Stripe checkout window (prevents seat sniping)
  const checkoutExpiry = new Date(Date.now() + CHECKOUT_GRACE_MS);
  await db
    .update(holds)
    .set({ expiresAt: checkoutExpiry })
    .where(eq(holds.sessionId, sessionId));

  // Create reservation
  const [reservation] = await db
    .insert(reservations)
    .values({
      eventId,
      referentStudent: referentStudent || "",
      email,
      phone: phone || null,
      totalAmount,
      stripeStatus: "pending",
    })
    .returning();

  // Create reservation seats (VIP tables always include dessert)
  // UNIQUE constraint on seatId at DB level prevents any race-condition double-booking
  try {
    for (const guest of guests) {
      await db.insert(reservationSeats).values({
        reservationId: reservation.id,
        seatId: guest.seatId,
        firstName: guest.firstName,
        lastName: guest.lastName,
        mealChoice: guest.mealChoice,
        hasDessert: isVip ? true : guest.hasDessert,
      });
    }
  } catch {
    // Unique violation: another reservation already claimed one of these seats
    await db.delete(reservations).where(eq(reservations.id, reservation.id));
    return NextResponse.json(
      { error: "Ces sièges viennent d'être réservés par quelqu'un d'autre. Veuillez recommencer." },
      { status: 409 }
    );
  }

  // Create upsells — each repas_danseur entry has its own mealChoice
  if (upsells && upsells.length > 0) {
    for (const upsell of upsells) {
      if (upsell.type === "repas_danseur" && upsell.mealChoice) {
        const opt = DANCER_MEAL_OPTIONS.find((o) => o.value === upsell.mealChoice);
        if (opt) {
          await db.insert(reservationUpsells).values({
            reservationId: reservation.id,
            upsellType: "repas_danseur",
            quantity: upsell.quantity || 1,
            unitPrice: opt.price,
            mealChoice: upsell.mealChoice,
          });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    reservationId: reservation.id,
    totalAmount,
    sessionId,
  });
}
