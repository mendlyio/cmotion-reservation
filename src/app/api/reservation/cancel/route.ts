import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reservations, reservationSeats, holds, seats } from "@/lib/db/schema";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { getOrCreateSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";

// Called when the user clicks "back" / "cancel" on the Stripe Checkout page.
// cancel_url = /reservation/{eventId}?cancelled=true
// Immediately: expires the Stripe session, cleans reservation_seats, releases the hold.
export async function POST() {
  const sessionId = await getOrCreateSession();

  // Find seats currently held by this session
  const sessionHolds = await db
    .select()
    .from(holds)
    .where(eq(holds.sessionId, sessionId));

  const heldSeatIds = sessionHolds
    .filter((h) => h.seatId !== null)
    .map((h) => h.seatId!);

  if (heldSeatIds.length > 0) {
    // Find any pending reservation that owns these seats
    const pendingRes = await db
      .select({
        reservationId: reservations.id,
        stripePaymentId: reservations.stripePaymentId,
      })
      .from(reservations)
      .innerJoin(reservationSeats, eq(reservationSeats.reservationId, reservations.id))
      .where(
        and(
          inArray(reservationSeats.seatId, heldSeatIds),
          eq(reservations.stripeStatus, "pending"),
          isNotNull(reservations.stripePaymentId)
        )
      );

    // Expire each open Stripe session so the user can no longer pay
    const stripeIds = [...new Set(pendingRes.map((r) => r.stripePaymentId).filter((id): id is string => id !== null))];
    for (const stripeSessionId of stripeIds) {
      try {
        await stripe.checkout.sessions.expire(stripeSessionId);
      } catch {
        // Already expired — safe to ignore
      }
    }

    // Delete reservation_seats for these pending reservations
    const resIds = [...new Set(pendingRes.map((r) => r.reservationId))];
    if (resIds.length > 0) {
      await db
        .delete(reservationSeats)
        .where(inArray(reservationSeats.reservationId, resIds));

      // Mark reservations as failed
      for (const resId of resIds) {
        await db
          .update(reservations)
          .set({ stripeStatus: "failed" })
          .where(
            and(
              eq(reservations.id, resId),
              eq(reservations.stripeStatus, "pending")
            )
          );
      }
    }

    // Release seats back to available
    await db
      .update(seats)
      .set({ status: "available" })
      .where(and(inArray(seats.id, heldSeatIds), eq(seats.status, "held")));

    // Delete the holds
    await db.delete(holds).where(eq(holds.sessionId, sessionId));
  }

  return NextResponse.json({ success: true });
}
