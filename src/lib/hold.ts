import { db } from "./db";
import { holds, seats } from "./db/schema";
import { eq, lt, and, inArray } from "drizzle-orm";

const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
