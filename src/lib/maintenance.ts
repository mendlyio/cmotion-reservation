import { cleanupExpiredHolds } from "@/lib/hold";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";

/**
 * Anciennement déclenché par le cron Vercel : nettoyage des holds + ouverture auto (openAt).
 * Appelé à la demande quand un utilisateur réel utilise le site (pas de réveil périodique).
 */
export async function performReservationMaintenance(): Promise<{
  openedEventIds: number[];
}> {
  await cleanupExpiredHolds();

  const now = new Date();
  const toOpen = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.isActive, false),
        isNotNull(events.openAt),
        lte(events.openAt, now)
      )
    );

  const openedEventIds: number[] = [];
  for (const row of toOpen) {
    await db.update(events).set({ isActive: true }).where(eq(events.id, row.id));
    openedEventIds.push(row.id);
  }

  return { openedEventIds };
}
