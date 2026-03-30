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

// Core: hold a flat list of seat IDs (already validated)
async function holdSeatIds(
  sessionId: string,
  eventId: number,
  expiresAt: Date,
  seatToTable: Map<number, number>, // seatId → tableId
  isVip: boolean
): Promise<{ error: string; status: number } | { ok: true; seatIds: number[] }> {
  const targetSeatIds = Array.from(seatToTable.keys());

  // Pre-check: reject active holds from OTHER sessions
  const existingHolds = await db
    .select()
    .from(holds)
    .where(inArray(holds.seatId, targetSeatIds));

  if (existingHolds.length > 0) {
    const holdSeatIds = existingHolds.map((h) => h.seatId!).filter(Boolean);
    const seatStates = await db.select().from(seats).where(inArray(seats.id, holdSeatIds));
    const actuallyHeld = new Set(seatStates.filter((s) => s.status === "held").map((s) => s.id));

    const orphanIds = existingHolds
      .filter((h) => h.seatId && !actuallyHeld.has(h.seatId))
      .map((h) => h.id);
    if (orphanIds.length > 0) await db.delete(holds).where(inArray(holds.id, orphanIds));

    const realConflicts = existingHolds.filter((h) => h.seatId && actuallyHeld.has(h.seatId));
    if (realConflicts.length > 0) {
      const unavailable = seatStates.filter((s) => s.status !== "available");
      return {
        error: isVip
          ? "Cette table VIP est en cours de réservation par un autre utilisateur"
          : `Certains sièges ne sont plus disponibles (${unavailable.map((s) => `S${s.seatNumber}`).join(", ")})`,
        status: 409,
      };
    }
  }

  // Atomic hold
  await db.update(seats).set({ status: "held" })
    .where(and(inArray(seats.id, targetSeatIds), eq(seats.status, "available")));

  const nowHeld = await db.select().from(seats)
    .where(and(inArray(seats.id, targetSeatIds), eq(seats.status, "held")));

  if (nowHeld.length !== targetSeatIds.length) {
    // Rollback seats we just flipped
    const holdAfter = await db.select().from(holds).where(inArray(holds.seatId, targetSeatIds));
    const alreadyByOthers = new Set(holdAfter.map((h) => h.seatId));
    const ours = targetSeatIds.filter((id) => !alreadyByOthers.has(id));
    if (ours.length > 0)
      await db.update(seats).set({ status: "available" })
        .where(and(inArray(seats.id, ours), eq(seats.status, "held")));

    const all = await db.select().from(seats).where(inArray(seats.id, targetSeatIds));
    const unavailable = all.filter((s) => s.status !== "available");
    return {
      error: isVip
        ? "Cette table VIP est réservée par quelqu'un d'autre"
        : `Certains sièges ne sont plus disponibles (${unavailable.map((s) => `S${s.seatNumber}`).join(", ")})`,
      status: 409,
    };
  }

  // Insert hold records with correct tableId per seat
  const holdValues = targetSeatIds.map((seatId) => ({
    sessionId,
    eventId,
    tableId: seatToTable.get(seatId)!,
    seatId,
    expiresAt,
  }));
  await db.insert(holds).values(holdValues);

  return { ok: true, seatIds: targetSeatIds };
}

export async function POST(request: NextRequest) {
  const sessionId = await getOrCreateSession();
  const body = await request.json();
  const { eventId, tableId, selections } = body as {
    eventId: number;
    tableId?: number;       // VIP path
    selections?: { tableId: number; seatIds: number[] }[]; // multi-table path
  };

  if (!eventId) {
    return NextResponse.json({ error: "eventId requis" }, { status: 400 });
  }

  await cleanupExpiredHolds();
  await releaseHoldsBySession(sessionId);

  const expiresAt = getHoldExpiry();

  // ── VIP path ────────────────────────────────────────────────────────────
  if (tableId && !selections) {
    const [table] = await db.select().from(tables).where(eq(tables.id, tableId));
    if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
    if (table.eventId !== eventId)
      return NextResponse.json({ error: "Table n'appartient pas à cet événement" }, { status: 400 });

    const tableSeats = await db.select().from(seats).where(eq(seats.tableId, tableId));
    const seatToTable = new Map(tableSeats.map((s) => [s.id, tableId]));

    const result = await holdSeatIds(sessionId, eventId, expiresAt, seatToTable, true);
    if ("error" in result)
      return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({
      success: true, sessionId, tableId, seatIds: result.seatIds,
      expiresAt: expiresAt.toISOString(), isVip: true,
    });
  }

  // ── Multi-table normal path ──────────────────────────────────────────────
  if (selections && selections.length > 0) {
    const allTableIds = selections.map((s) => s.tableId);
    const allSeatIds = selections.flatMap((s) => s.seatIds);

    // Validate tables belong to event
    const eventTables = await db.select().from(tables).where(inArray(tables.id, allTableIds));
    if (
      eventTables.length !== allTableIds.length ||
      eventTables.some((t) => t.eventId !== eventId)
    ) {
      return NextResponse.json({ error: "Tables invalides pour cet événement" }, { status: 400 });
    }

    // Validate seats belong to their claimed table
    for (const sel of selections) {
      const valid = await db.select().from(seats)
        .where(and(inArray(seats.id, sel.seatIds), eq(seats.tableId, sel.tableId)));
      if (valid.length !== sel.seatIds.length)
        return NextResponse.json({ error: "Sièges invalides" }, { status: 400 });
    }

    const seatToTable = new Map(
      selections.flatMap(({ tableId: tid, seatIds }) => seatIds.map((sid) => [sid, tid]))
    );

    const result = await holdSeatIds(sessionId, eventId, expiresAt, seatToTable, false);
    if ("error" in result)
      return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({
      success: true, sessionId, seatIds: allSeatIds,
      expiresAt: expiresAt.toISOString(), isVip: false,
    });
  }

  return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
}

export async function DELETE() {
  const sessionId = await getOrCreateSession();
  await releaseHoldsBySession(sessionId);
  return NextResponse.json({ success: true });
}
