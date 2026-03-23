import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reservations, reservationSeats, seats, holds } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Simulation non disponible en production" },
      { status: 403 }
    );
  }

  const { reservationId } = await request.json();

  if (!reservationId) {
    return NextResponse.json(
      { error: "reservationId requis" },
      { status: 400 }
    );
  }

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId));

  if (!reservation) {
    return NextResponse.json(
      { error: "Réservation introuvable" },
      { status: 404 }
    );
  }

  // Mark as paid
  await db
    .update(reservations)
    .set({
      stripeStatus: "paid",
      stripePaymentId: `sim_${Date.now()}`,
    })
    .where(eq(reservations.id, reservationId));

  // Mark seats as reserved
  const resSeats = await db
    .select()
    .from(reservationSeats)
    .where(eq(reservationSeats.reservationId, reservationId));

  const seatIds = resSeats.map((rs) => rs.seatId);

  if (seatIds.length > 0) {
    await db
      .update(seats)
      .set({ status: "reserved" })
      .where(inArray(seats.id, seatIds));

    // Clean up holds
    await db.delete(holds).where(inArray(holds.seatId, seatIds));
  }

  return NextResponse.json({ success: true });
}
