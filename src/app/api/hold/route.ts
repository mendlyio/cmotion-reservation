import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, seats, tables } from "@/lib/db/schema";
import { getOrCreateSession } from "@/lib/session";
import { claimSeats, getHoldExpiry, releaseHoldsBySession } from "@/lib/hold";
import { guardEvent } from "@/lib/event-guard";
import { getSeatLabel } from "@/types";
import { isUniqueViolation } from "@/lib/query";

export async function POST(request: NextRequest) {
  const sessionId = await getOrCreateSession();
  let body: { eventId?: number; tableId?: number; selections?: { tableId: number; seatIds: number[] }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const eventId = body.eventId;
  if (!eventId || !Number.isInteger(eventId)) {
    return NextResponse.json({ error: "eventId requis" }, { status: 400 });
  }

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!(await guardEvent(event))) {
    return NextResponse.json({ error: "Les réservations ne sont pas ouvertes pour ce spectacle" }, { status: 403 });
  }

  await releaseHoldsBySession(sessionId);
  const expiresAt = getHoldExpiry();

  if (body.tableId && !body.selections) {
    const [table] = await db.select().from(tables).where(eq(tables.id, body.tableId));
    if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
    if (table.eventId !== eventId || !table.isVip) {
      return NextResponse.json({ error: "Table VIP invalide pour cet événement" }, { status: 400 });
    }
    const tableSeats = await db.select().from(seats).where(eq(seats.tableId, table.id));
    const seatIds = tableSeats.map((seat) => seat.id);
    return respondClaim(sessionId, eventId, expiresAt, seatIds, true);
  }

  const selections = body.selections ?? [];
  if (selections.length === 0) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const allTableIds = [...new Set(selections.map((selection) => selection.tableId))];
  const eventTables = await db.select().from(tables).where(inArray(tables.id, allTableIds));
  if (
    eventTables.length !== allTableIds.length ||
    eventTables.some((table) => table.eventId !== eventId || table.isVip)
  ) {
    return NextResponse.json({ error: "Tables invalides pour cet événement" }, { status: 400 });
  }

  const allSeatIds = selections.flatMap((selection) => selection.seatIds);
  if (allSeatIds.length === 0 || allSeatIds.length > 40 || new Set(allSeatIds).size !== allSeatIds.length) {
    return NextResponse.json({ error: "Sièges invalides" }, { status: 400 });
  }

  for (const selection of selections) {
    if (selection.seatIds.length === 0) {
      return NextResponse.json({ error: "Sièges invalides" }, { status: 400 });
    }
    const valid = await db
      .select()
      .from(seats)
      .where(and(inArray(seats.id, selection.seatIds), eq(seats.tableId, selection.tableId)));
    if (valid.length !== selection.seatIds.length) {
      return NextResponse.json({ error: "Sièges invalides" }, { status: 400 });
    }
  }

  return respondClaim(sessionId, eventId, expiresAt, allSeatIds, false);
}

async function respondClaim(
  sessionId: string,
  eventId: number,
  expiresAt: Date,
  seatIds: number[],
  isVip: boolean
) {
  try {
    const claimed = await claimSeats({ seatIds, eventId, sessionId, expiresAt });
    if (claimed.length !== seatIds.length) {
      const states = await db.select().from(seats).where(inArray(seats.id, seatIds));
      const unavailable = states.filter((seat) => seat.status !== "available");
      return NextResponse.json(
        {
          error: isVip
            ? "Cette table VIP est en cours de réservation par un autre utilisateur"
            : `Certains sièges ne sont plus disponibles (${unavailable.map((seat) => getSeatLabel(seat.seatNumber)).join(", ")})`,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({
      success: true,
      sessionId,
      seatIds: claimed,
      expiresAt: expiresAt.toISOString(),
      isVip,
      ...(isVip ? { tableId: undefined } : {}),
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        {
          error: isVip
            ? "Cette table VIP vient d'être réservée par quelqu'un d'autre"
            : "Certains sièges viennent d'être pris. Veuillez choisir d'autres places.",
        },
        { status: 409 }
      );
    }
    console.error("Blocage de sièges", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "Blocage impossible pour le moment" }, { status: 500 });
  }
}

export async function DELETE() {
  const sessionId = await getOrCreateSession();
  await releaseHoldsBySession(sessionId);
  return NextResponse.json({ success: true });
}
