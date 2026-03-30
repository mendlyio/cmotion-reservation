import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  reservations,
  reservationSeats,
  reservationUpsells,
  seats,
  tables,
  holds,
  events,
} from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
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
      // Idempotency: skip if already processed
      const [existing] = await db
        .select({ stripeStatus: reservations.stripeStatus })
        .from(reservations)
        .where(eq(reservations.id, reservationId));

      if (existing?.stripeStatus === "paid") {
        return NextResponse.json({ received: true });
      }

      await db
        .update(reservations)
        .set({ stripeStatus: "paid", stripePaymentId: session.id })
        .where(eq(reservations.id, reservationId));

      const resSeats = await db
        .select()
        .from(reservationSeats)
        .where(eq(reservationSeats.reservationId, reservationId));

      const seatIds = resSeats.map((rs) => rs.seatId);

      if (seatIds.length > 0) {
        // Only flip seats that are still 'held' — never overwrite an already-reserved seat
        await db
          .update(seats)
          .set({ status: "reserved" })
          .where(and(inArray(seats.id, seatIds), eq(seats.status, "held")));

        await db.delete(holds).where(inArray(holds.seatId, seatIds));
      }

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

        const upsellList = await db
          .select()
          .from(reservationUpsells)
          .where(eq(reservationUpsells.reservationId, reservationId));

        // Resolve table info from first guest's seat
        let tableInfo: string | undefined;
        let isVip = false;
        if (guestList.length > 0) {
          const [seatRow] = await db
            .select({ tableId: seats.tableId })
            .from(seats)
            .where(eq(seats.id, guestList[0].seatId));
          if (seatRow) {
            const [tableRow] = await db
              .select({ rowNumber: tables.rowNumber, tableNumber: tables.tableNumber, isVip: tables.isVip })
              .from(tables)
              .where(eq(tables.id, seatRow.tableId));
            if (tableRow) {
              tableInfo = `${tableRow.rowNumber}-${tableRow.tableNumber}`;
              isVip = tableRow.isVip;
            }
          }
        }

        const html = renderConfirmationEmail({
          reservationId: reservation.id,
          eventName: eventData.name,
          eventDate: eventData.eventDate,
          timeInfo: eventData.timeInfo,
          referentStudent: reservation.referentStudent,
          totalAmount: reservation.totalAmount,
          tableInfo,
          isVip,
          guests: guestList.map((g) => ({
            firstName: g.firstName,
            lastName: g.lastName,
            mealChoice: g.mealChoice,
            hasDessert: g.hasDessert,
          })),
          upsells: upsellList.map((u) => ({
            type: u.upsellType,
            quantity: u.quantity,
            unitPrice: u.unitPrice,
            mealChoice: u.mealChoice,
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
      // Only mark as failed if still pending — don't overwrite a paid reservation
      await db
        .update(reservations)
        .set({ stripeStatus: "failed" })
        .where(
          and(
            eq(reservations.id, reservationId),
            eq(reservations.stripeStatus, "pending")
          )
        );

      const resSeats = await db
        .select()
        .from(reservationSeats)
        .where(eq(reservationSeats.reservationId, reservationId));

      const seatIds = resSeats.map((rs) => rs.seatId);

      if (seatIds.length > 0) {
        // Guard: only release seats that are still 'held', never overwrite 'reserved'
        await db
          .update(seats)
          .set({ status: "available" })
          .where(
            and(inArray(seats.id, seatIds), eq(seats.status, "held"))
          );

        await db.delete(holds).where(inArray(holds.seatId, seatIds));
      }
    }
  }

  return NextResponse.json({ received: true });
}
