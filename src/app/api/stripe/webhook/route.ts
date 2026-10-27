import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { reservationSeats, reservations } from "@/lib/db/schema";
import { decideCheckoutCompleted, decideCheckoutExpired } from "@/lib/webhook-logic";
import { alertPaymentAnomaly } from "@/lib/alerts";
import { failPendingReservation, markReservationPaid, sendPaidConfirmation } from "@/lib/payments";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const reservationId = parseInt(session.metadata?.reservationId || "0", 10);
    const [existing] = reservationId
      ? await db
          .select({
            id: reservations.id,
            stripeStatus: reservations.stripeStatus,
            totalAmount: reservations.totalAmount,
            email: reservations.email,
          })
          .from(reservations)
          .where(eq(reservations.id, reservationId))
      : [];

    const seatCount = existing
      ? (
          await db
            .select({ id: reservationSeats.id })
            .from(reservationSeats)
            .where(eq(reservationSeats.reservationId, existing.id))
        ).length
      : 0;

    const decision = decideCheckoutCompleted({
      reservationFound: Boolean(existing),
      status: existing?.stripeStatus ?? null,
      expectedAmount: existing?.totalAmount ?? null,
      amountTotal: session.amount_total,
      paymentStatus: session.payment_status,
      currency: session.currency,
      hasSeats: seatCount > 0,
    });

    if (decision.type === "ignore_unpaid" || decision.type === "already_paid") {
      return NextResponse.json({ received: true });
    }

    if (decision.type === "alert") {
      const sent = await alertPaymentAnomaly({
        reason: decision.reason,
        reservationId: existing?.id ?? null,
        stripeSessionId: session.id,
        amountTotal: session.amount_total,
        expectedAmount: existing?.totalAmount ?? null,
        customerEmail: session.customer_email ?? existing?.email ?? null,
      });
      return sent
        ? NextResponse.json({ received: true })
        : NextResponse.json({ error: "Alerte non délivrée" }, { status: 500 });
    }

    const marked = await markReservationPaid(existing!.id, session.id, existing!.totalAmount);
    if (!marked) {
      const [again] = await db
        .select({ stripeStatus: reservations.stripeStatus })
        .from(reservations)
        .where(eq(reservations.id, existing!.id));
      if (again?.stripeStatus === "paid") return NextResponse.json({ received: true });
      const sent = await alertPaymentAnomaly({
        reason: "confirmation non appliquée",
        reservationId: existing!.id,
        stripeSessionId: session.id,
        amountTotal: session.amount_total,
        expectedAmount: existing!.totalAmount,
        customerEmail: existing!.email,
      });
      return sent
        ? NextResponse.json({ received: true })
        : NextResponse.json({ error: "Alerte non délivrée" }, { status: 500 });
    }

    if (decision.type === "mark_paid_without_seats") {
      const sent = await alertPaymentAnomaly({
        reason: "paiement sans places",
        reservationId: existing!.id,
        stripeSessionId: session.id,
        amountTotal: session.amount_total,
        expectedAmount: existing!.totalAmount,
        customerEmail: existing!.email,
      });
      if (!sent) return NextResponse.json({ error: "Alerte non délivrée" }, { status: 500 });
    }

    try {
      await sendPaidConfirmation(existing!.id);
    } catch (err) {
      console.error("Email de confirmation", existing!.id, err instanceof Error ? err.name : "error");
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const reservationId = parseInt(session.metadata?.reservationId || "0", 10);
    if (!reservationId) return NextResponse.json({ received: true });

    const [existing] = await db
      .select({ stripeStatus: reservations.stripeStatus })
      .from(reservations)
      .where(eq(reservations.id, reservationId));

    if (decideCheckoutExpired(existing?.stripeStatus ?? null) === "fail") {
      await failPendingReservation(reservationId);
    }
  }

  return NextResponse.json({ received: true });
}
