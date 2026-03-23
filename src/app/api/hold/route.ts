import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holds, seats, tables } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreateSession } from "@/lib/session";
import {
  cleanupExpiredHolds,
  getHoldExpiry,
  releaseHoldsBySession,
} from "@/lib/hold";

export async function POST(request: NextRequest) {
  const sessionId = await getOrCreateSession();
  const body = await request.json();
  const { eventId, tableId, seatIds } = body as {
    eventId: number;
    tableId: number;
    seatIds?: number[];
  };

  if (!eventId || !tableId) {
    return NextResponse.json(
      { error: "eventId et tableId requis" },
      { status: 400 }
    );
  }

  await cleanupExpiredHolds();
  await releaseHoldsBySession(sessionId);

  const [table] = await db
    .select()
    .from(tables)
    .where(eq(tables.id, tableId));

  if (!table) {
    return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
  }

  if (table.eventId !== eventId) {
    return NextResponse.json(
      { error: "Table n'appartient pas à cet événement" },
      { status: 400 }
    );
  }

  let targetSeatIds: number[];

  if (table.isVip) {
    const tableSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.tableId, tableId));
    targetSeatIds = tableSeats.map((s) => s.id);
  } else {
    if (!seatIds || seatIds.length === 0) {
      return NextResponse.json(
        { error: "seatIds requis pour les tables normales" },
        { status: 400 }
      );
    }

    // Validate seats belong to the specified table
    const validSeats = await db
      .select()
      .from(seats)
      .where(and(inArray(seats.id, seatIds), eq(seats.tableId, tableId)));

    if (validSeats.length !== seatIds.length) {
      return NextResponse.json(
        { error: "Sièges invalides" },
        { status: 400 }
      );
    }

    targetSeatIds = seatIds;
  }

  // Pre-check: reject if any target seats already have active holds
  const existingHolds = await db
    .select()
    .from(holds)
    .where(inArray(holds.seatId, targetSeatIds));

  if (existingHolds.length > 0) {
    // Verify these holds have matching seat states — clean up orphans
    const holdSeatIds = existingHolds.map((h) => h.seatId!).filter(Boolean);
    const seatStates = await db
      .select()
      .from(seats)
      .where(inArray(seats.id, holdSeatIds));
    const actuallyHeld = new Set(
      seatStates.filter((s) => s.status === "held").map((s) => s.id)
    );

    const orphanIds = existingHolds
      .filter((h) => h.seatId && !actuallyHeld.has(h.seatId))
      .map((h) => h.id);
    if (orphanIds.length > 0) {
      await db.delete(holds).where(inArray(holds.id, orphanIds));
    }

    const realConflicts = existingHolds.filter(
      (h) => h.seatId && actuallyHeld.has(h.seatId)
    );
    if (realConflicts.length > 0) {
      const unavailable = seatStates.filter((s) => s.status !== "available");
      return NextResponse.json(
        {
          error: table.isVip
            ? "Cette table VIP est en cours de réservation par un autre utilisateur"
            : "Certains sièges ne sont plus disponibles",
          details: unavailable.map(
            (s) =>
              `Siège ${s.seatNumber}: ${s.status === "held" ? "en cours de réservation" : "réservé"}`
          ),
        },
        { status: 409 }
      );
    }
  }

  // Atomic hold: UPDATE only seats that are still 'available'
  await db
    .update(seats)
    .set({ status: "held" })
    .where(
      and(inArray(seats.id, targetSeatIds), eq(seats.status, "available"))
    );

  // Verify all target seats are now held (handles race with 'reserved' seats)
  const nowHeld = await db
    .select()
    .from(seats)
    .where(and(inArray(seats.id, targetSeatIds), eq(seats.status, "held")));

  if (nowHeld.length !== targetSeatIds.length) {
    // Rollback — release only the seats we just flipped (no prior hold record)
    const existingHolds = await db
      .select()
      .from(holds)
      .where(inArray(holds.seatId, targetSeatIds));

    const alreadyHeldByOthers = new Set(existingHolds.map((h) => h.seatId));
    const ourHeldIds = targetSeatIds.filter(
      (id) => !alreadyHeldByOthers.has(id)
    );

    if (ourHeldIds.length > 0) {
      await db
        .update(seats)
        .set({ status: "available" })
        .where(
          and(inArray(seats.id, ourHeldIds), eq(seats.status, "held"))
        );
    }

    const allTargetSeats = await db
      .select()
      .from(seats)
      .where(inArray(seats.id, targetSeatIds));

    const unavailable = allTargetSeats.filter(
      (s) => s.status !== "available"
    );

    return NextResponse.json(
      {
        error: table.isVip
          ? "Cette table VIP est en cours de réservation par un autre utilisateur"
          : "Certains sièges ne sont plus disponibles",
        details: unavailable.map(
          (s) =>
            `Siège ${s.seatNumber}: ${s.status === "held" ? "en cours de réservation" : "réservé"}`
        ),
      },
      { status: 409 }
    );
  }

  const expiresAt = getHoldExpiry();

  const holdValues = targetSeatIds.map((seatId) => ({
    sessionId,
    eventId,
    tableId,
    seatId,
    expiresAt,
  }));

  await db.insert(holds).values(holdValues);

  return NextResponse.json({
    success: true,
    sessionId,
    tableId,
    seatIds: targetSeatIds,
    expiresAt: expiresAt.toISOString(),
    isVip: table.isVip,
  });
}

export async function DELETE() {
  const sessionId = await getOrCreateSession();
  await releaseHoldsBySession(sessionId);
  return NextResponse.json({ success: true });
}
