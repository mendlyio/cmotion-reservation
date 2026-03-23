import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  reservations,
  reservationSeats,
  seats,
  holds,
  events,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { resend } from "@/lib/resend";
import { renderConfirmationEmail } from "@/emails/ConfirmationEmail";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const reservationId = parseInt(session.metadata?.reservationId || "0");

    if (reservationId) {
      // Update reservation status
      await db
        .update(reservations)
        .set({
          stripeStatus: "paid",
          stripePaymentId: session.id,
        })
        .where(eq(reservations.id, reservationId));

      // Get reservation seats and mark them as reserved
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

        // Clean up holds for these seats
        await db.delete(holds).where(inArray(holds.seatId, seatIds));
      }

      // Send confirmation email
      try {
        const [reservation] = await db
          .select()
          .from(reservations)
          .where(eq(reservations.id, reservationId));

        const [eventData] = await db
          .select()
          .from(events)
          .where(eq(events.id, reservation.eventId));

        const guestList = await db
          .select()
          .from(reservationSeats)
          .where(eq(reservationSeats.reservationId, reservationId));

        const html = renderConfirmationEmail({
          reservationId: reservation.id,
          eventName: eventData.name,
          eventDate: eventData.eventDate,
          timeInfo: eventData.timeInfo,
          referentStudent: reservation.referentStudent,
          totalAmount: reservation.totalAmount,
          guests: guestList.map((g) => ({
            firstName: g.firstName,
            lastName: g.lastName,
            mealChoice: g.mealChoice,
            hasDessert: g.hasDessert,
          })),
        });

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
          to: reservation.email,
          subject: `Confirmation de réservation #${reservation.id} - Cmotion`,
          html,
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const reservationId = parseInt(session.metadata?.reservationId || "0");

    if (reservationId) {
      await db
        .update(reservations)
        .set({ stripeStatus: "failed" })
        .where(eq(reservations.id, reservationId));

      const resSeats = await db
        .select()
        .from(reservationSeats)
        .where(eq(reservationSeats.reservationId, reservationId));

      const seatIds = resSeats.map((rs) => rs.seatId);

      if (seatIds.length > 0) {
        await db
          .update(seats)
          .set({ status: "available" })
          .where(inArray(seats.id, seatIds));

        await db.delete(holds).where(inArray(holds.seatId, seatIds));
      }
    }
  }

  return NextResponse.json({ received: true });
}
