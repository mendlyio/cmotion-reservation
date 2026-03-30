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
import { getTableLabel, getSeatLabel } from "@/types";

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

        // Resolve placement (table + seat) for each guest
        let tableInfo: string | undefined;
        let isVip = false;
        const placementMap: Record<number, string> = {};

        const guestSeatIds = guestList.map((g) => g.seatId);
        if (guestSeatIds.length > 0) {
          const seatRows = await db
            .select({ id: seats.id, seatNumber: seats.seatNumber, tableId: seats.tableId })
            .from(seats)
            .where(inArray(seats.id, guestSeatIds));

          const tableIds = [...new Set(seatRows.map((s) => s.tableId))];
          const tableRows = tableIds.length > 0
            ? await db
                .select({ id: tables.id, rowNumber: tables.rowNumber, tableNumber: tables.tableNumber, isVip: tables.isVip })
                .from(tables)
                .where(inArray(tables.id, tableIds))
            : [];
          const tMap: Record<number, typeof tableRows[0]> = {};
          for (const t of tableRows) tMap[t.id] = t;

          for (const s of seatRows) {
            const t = tMap[s.tableId];
            if (t) {
              placementMap[s.id] = `T${getTableLabel(t.rowNumber, t.tableNumber)} - ${getSeatLabel(s.seatNumber)}`;
            }
          }

          // tableInfo from first guest's seat
          const firstSeat = seatRows.find((s) => s.id === guestList[0].seatId);
          if (firstSeat) {
            const t = tMap[firstSeat.tableId];
            if (t) {
              tableInfo = `${getTableLabel(t.rowNumber, t.tableNumber)}`;
              isVip = t.isVip;
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
            placement: placementMap[g.seatId],
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
