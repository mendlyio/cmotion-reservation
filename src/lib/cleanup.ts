import { and, eq, isNotNull, lt, lte } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db, sql } from "@/lib/db";
import { adminSessions, events, requestLimits, reservations } from "@/lib/db/schema";
import { FAST_CLEANUP_SQL } from "@/lib/sql/booking";
import { failPendingReservation, markReservationPaid, sendPaidConfirmation } from "@/lib/payments";

const CHECKOUT_GRACE_MS = 35 * 60 * 1000;

export async function fastCleanup(): Promise<void> {
  await sql.query(FAST_CLEANUP_SQL);
}

export async function openDueEvents(now = new Date()): Promise<number[]> {
  const due = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.isActive, false), isNotNull(events.openAt), lte(events.openAt, now)));

  const opened: number[] = [];
  for (const row of due) {
    await db
      .update(events)
      .set({ isActive: true })
      .where(and(eq(events.id, row.id), eq(events.isActive, false)));
    opened.push(row.id);
  }
  return opened;
}

/** Vérifie auprès de Stripe les pending qui ont une session, sans dépendre d'une visite. */
export async function reconcileStripePending(): Promise<void> {
  const pending = await db
    .select({
      id: reservations.id,
      stripePaymentId: reservations.stripePaymentId,
      totalAmount: reservations.totalAmount,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .where(and(eq(reservations.stripeStatus, "pending"), isNotNull(reservations.stripePaymentId)))
    .limit(40);

  for (const row of pending) {
    if (!row.stripePaymentId) continue;
    let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>> | null = null;
    try {
      session = await stripe.checkout.sessions.retrieve(row.stripePaymentId);
    } catch {
      if (Date.now() - new Date(row.createdAt).getTime() > CHECKOUT_GRACE_MS) {
        await failPendingReservation(row.id);
      }
      continue;
    }

    if (session.payment_status === "paid") {
      if (session.currency === "eur" && session.amount_total === row.totalAmount) {
        const marked = await markReservationPaid(row.id, session.id, row.totalAmount);
        if (marked) {
          try {
            await sendPaidConfirmation(row.id);
          } catch (err) {
            console.error("Confirmation après rapprochement", row.id, err instanceof Error ? err.name : "error");
          }
        }
      } else {
        console.error("Rapprochement : montant ou devise inattendu", row.id, session.id);
      }
      continue;
    }

    if (session.status === "expired") {
      await failPendingReservation(row.id);
    }
  }
}

export async function purgeEphemeralRows(): Promise<void> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.delete(requestLimits).where(lt(requestLimits.createdAt, dayAgo));
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
}

export async function performReservationMaintenance(): Promise<{ openedEventIds: number[] }> {
  await fastCleanup();
  const openedEventIds = await openDueEvents();
  return { openedEventIds };
}

export async function performScheduledMaintenance(): Promise<{ openedEventIds: number[] }> {
  const result = await performReservationMaintenance();
  await reconcileStripePending();
  await fastCleanup();
  await purgeEphemeralRows();
  return result;
}
