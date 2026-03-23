import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
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

  if (reservation.stripeStatus === "paid") {
    return NextResponse.json(
      { error: "Cette réservation est déjà payée" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Réservation Cmotion #${reservation.id}`,
            description: `Spectacle - ${reservation.referentStudent}`,
          },
          unit_amount: reservation.totalAmount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/confirmation/${reservation.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/reservation/${reservation.eventId}?cancelled=true`,
    metadata: {
      reservationId: reservation.id.toString(),
    },
    customer_email: reservation.email,
  });

  await db
    .update(reservations)
    .set({ stripePaymentId: session.id })
    .where(eq(reservations.id, reservationId));

  return NextResponse.json({ url: session.url });
}
