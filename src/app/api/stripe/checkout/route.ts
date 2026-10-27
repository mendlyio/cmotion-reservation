import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { holds, reservationSeats, reservations } from "@/lib/db/schema";
import { getOrCreateSession } from "@/lib/session";
import { getBaseUrl } from "@/lib/base-url";
import { queryRows } from "@/lib/query";

export async function POST(request: NextRequest) {
  let reservationId: number;
  try {
    const body = await request.json();
    reservationId = Number(body.reservationId);
  } catch {
    return NextResponse.json({ error: "reservationId requis" }, { status: 400 });
  }
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return NextResponse.json({ error: "reservationId requis" }, { status: 400 });
  }

  const baseUrl = getBaseUrl();

  const sessionId = await getOrCreateSession();
  const [reservation] = await db.select().from(reservations).where(eq(reservations.id, reservationId));
  if (!reservation || reservation.sessionId !== sessionId) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }
  if (reservation.stripeStatus !== "pending") {
    return NextResponse.json({ error: "Cette réservation n'est plus payable" }, { status: 400 });
  }
  if (!Number.isInteger(reservation.totalAmount) || reservation.totalAmount <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const seatRows = await db
    .select({ seatId: reservationSeats.seatId })
    .from(reservationSeats)
    .where(eq(reservationSeats.reservationId, reservation.id));
  if (seatRows.length === 0) {
    return NextResponse.json({ error: "Cette réservation n'a plus de places" }, { status: 409 });
  }

  const seatIds = seatRows.map((row) => row.seatId);
  const now = Date.now();
  const holdRows = await db
    .select()
    .from(holds)
    .where(and(eq(holds.sessionId, sessionId), inArray(holds.seatId, seatIds)));
  if (holdRows.length !== seatIds.length || holdRows.some((hold) => new Date(hold.expiresAt).getTime() <= now)) {
    return NextResponse.json({ error: "Votre réservation a expiré. Veuillez recommencer." }, { status: 409 });
  }

  if (reservation.stripePaymentId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(reservation.stripePaymentId);
      if (existing.status === "open" && existing.url) {
        return NextResponse.json({ url: existing.url });
      }
      if (existing.payment_status === "paid") {
        return NextResponse.json({ error: "Cette réservation est déjà payée" }, { status: 400 });
      }
    } catch {
      /* session absente : on peut en ouvrir une nouvelle */
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    expires_at: Math.floor((Date.now() + 30 * 60 * 1000) / 1000),
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Réservation Cmotion #${reservation.id}`,
            description: `Spectacle - ${reservation.referentStudent}`.slice(0, 200),
          },
          unit_amount: reservation.totalAmount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/confirmation/${reservation.publicToken}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/reservation/${reservation.eventId}?cancelled=true`,
    metadata: { reservationId: reservation.id.toString() },
    customer_email: reservation.email,
  });

  const saved = await queryRows<{ id: number }>(
    `UPDATE reservations
     SET stripe_payment_id = $2
     WHERE id = $1
       AND stripe_status = 'pending'
       AND (stripe_payment_id IS NULL OR stripe_payment_id = $3)
     RETURNING id`,
    [reservation.id, session.id, reservation.stripePaymentId]
  );
  if (saved.length === 0) {
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch {
      /* déjà close */
    }
    return NextResponse.json({ error: "Paiement déjà engagé pour cette réservation" }, { status: 409 });
  }

  return NextResponse.json({ url: session.url });
}
