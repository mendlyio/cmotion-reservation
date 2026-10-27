import { and, eq, isNotNull } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { queryRows } from "@/lib/query";
import { PREPARE_CLAIM_SQL, CLAIM_SEATS_SQL, RELEASE_SESSION_SQL } from "@/lib/sql/booking";
import { fastCleanup } from "@/lib/cleanup";
import { markReservationPaid, sendPaidConfirmation } from "@/lib/payments";

const HOLD_DURATION_MS = 10 * 60 * 1000;

export function getHoldExpiry(): Date {
  return new Date(Date.now() + HOLD_DURATION_MS);
}

export async function cleanupExpiredHolds(): Promise<void> {
  await fastCleanup();
}

/**
 * Rend les places de la session. Si un paiement Stripe est déjà encaissé,
 * la réservation est confirmée au lieu d'être annulée.
 */
export async function releaseHoldsBySession(sessionId: string): Promise<void> {
  const pending = await db
    .select({
      id: reservations.id,
      stripePaymentId: reservations.stripePaymentId,
      totalAmount: reservations.totalAmount,
    })
    .from(reservations)
    .where(and(eq(reservations.sessionId, sessionId), eq(reservations.stripeStatus, "pending"), isNotNull(reservations.stripePaymentId)));

  for (const row of pending) {
    if (!row.stripePaymentId) continue;
    try {
      const session = await stripe.checkout.sessions.retrieve(row.stripePaymentId);
      if (session.payment_status === "paid" && session.amount_total === row.totalAmount && session.currency === "eur") {
        const marked = await markReservationPaid(row.id, session.id, row.totalAmount);
        if (marked) {
          try {
            await sendPaidConfirmation(row.id);
          } catch {
            /* l'email ne doit pas bloquer la libération des autres places */
          }
        }
        continue;
      }
      if (session.status === "open") {
        try {
          await stripe.checkout.sessions.expire(row.stripePaymentId);
        } catch {
          /* déjà expirée */
        }
      }
    } catch {
      /* session introuvable : la requête suivante passe la réservation en failed */
    }
  }

  await queryRows(RELEASE_SESSION_SQL, [sessionId]);
}

export async function claimSeats(input: {
  seatIds: number[];
  eventId: number;
  sessionId: string;
  expiresAt: Date;
}): Promise<number[]> {
  if (input.seatIds.length === 0) return [];
  await queryRows(PREPARE_CLAIM_SQL, [input.seatIds]);
  const rows = await queryRows<{ seat_id: number }>(CLAIM_SEATS_SQL, [
    input.seatIds,
    input.eventId,
    input.seatIds.length,
    input.sessionId,
    input.expiresAt.toISOString(),
  ]);
  return rows.map((row) => Number(row.seat_id));
}
