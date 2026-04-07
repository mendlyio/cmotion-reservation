import { db } from "./db";
import { holds, seats, reservationSeats, reservations } from "./db/schema";
import { eq, lt, and, inArray, ne, isNotNull } from "drizzle-orm";
import { stripe } from "./stripe";

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function cleanupExpiredHolds() {
  const now = new Date();

  const expiredHolds = await db
    .select()
    .from(holds)
    .where(lt(holds.expiresAt, now));

  if (expiredHolds.length === 0) return;

  const seatIds = expiredHolds
    .filter((h) => h.seatId !== null)
    .map((h) => h.seatId!);

  if (seatIds.length > 0) {
    await db
      .update(seats)
      .set({ status: "available" })
      .where(
        and(inArray(seats.id, seatIds), eq(seats.status, "held"))
      );

    // For pending reservations that opened a Stripe session: expire it immediately
    // so the user can no longer pay after their hold has lapsed.
    // The checkout.session.expired webhook will then handle the canonical cleanup.
    const pendingWithStripe = await db
      .select({ stripePaymentId: reservations.stripePaymentId })
      .from(reservations)
      .innerJoin(reservationSeats, eq(reservationSeats.reservationId, reservations.id))
      .where(
        and(
          inArray(reservationSeats.seatId, seatIds),
          eq(reservations.stripeStatus, "pending"),
          isNotNull(reservations.stripePaymentId)
        )
      );

    for (const r of pendingWithStripe) {
      if (r.stripePaymentId) {
        try {
          await stripe.checkout.sessions.expire(r.stripePaymentId);
        } catch {
          // Already expired or not found — safe to ignore
        }
      }
    }

    // Delete orphaned reservation_seats for non-paid reservations on these seats.
    // When a hold expires the seat is freed, but reservation_seats rows linger and
    // block the UNIQUE(seat_id) constraint for the next booking attempt.
    const orphanRS = await db
      .select({ id: reservationSeats.id })
      .from(reservationSeats)
      .innerJoin(reservations, eq(reservations.id, reservationSeats.reservationId))
      .where(
        and(
          inArray(reservationSeats.seatId, seatIds),
          ne(reservations.stripeStatus, "paid")
        )
      );

    if (orphanRS.length > 0) {
      await db
        .delete(reservationSeats)
        .where(inArray(reservationSeats.id, orphanRS.map((r) => r.id)));
    }
  }

  await db.delete(holds).where(lt(holds.expiresAt, now));
}

export function getHoldExpiry(): Date {
  return new Date(Date.now() + HOLD_DURATION_MS);
}

export async function releaseHoldsBySession(sessionId: string) {
  const sessionHolds = await db
    .select()
    .from(holds)
    .where(eq(holds.sessionId, sessionId));

  const seatIds = sessionHolds
    .filter((h) => h.seatId !== null)
    .map((h) => h.seatId!);

  if (seatIds.length > 0) {
    await db
      .update(seats)
      .set({ status: "available" })
      .where(
        and(inArray(seats.id, seatIds), eq(seats.status, "held"))
      );
  }

  await db.delete(holds).where(eq(holds.sessionId, sessionId));
}
