import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { getOrCreateSession } from "@/lib/session";
import { markReservationPaid } from "@/lib/payments";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Simulation non disponible en production" }, { status: 403 });
  }

  const sessionId = await getOrCreateSession();
  const { reservationId } = await request.json();
  const id = Number(reservationId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "reservationId requis" }, { status: 400 });
  }

  const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
  if (!reservation || reservation.sessionId !== sessionId || reservation.stripeStatus !== "pending") {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const marked = await markReservationPaid(reservation.id, `sim_${randomBytes(8).toString("hex")}`, reservation.totalAmount);
  if (!marked) {
    return NextResponse.json({ error: "Simulation impossible" }, { status: 409 });
  }
  return NextResponse.json({ success: true, publicToken: reservation.publicToken });
}
