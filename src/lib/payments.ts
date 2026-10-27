import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, reservationSeats, reservationUpsells, reservations, seats, tables } from "@/lib/db/schema";
import { queryRows } from "@/lib/query";
import { MARK_PAID_SQL, RESERVE_SEATS_SQL, FAIL_PENDING_SQL } from "@/lib/sql/booking";
import { getTableLabel, getSeatLabel } from "@/types";
import { renderConfirmationEmail } from "@/emails/ConfirmationEmail";
import { resend } from "@/lib/resend";
import { getBaseUrl } from "@/lib/base-url";
import { alertPaymentAnomaly } from "@/lib/alerts";

export async function markReservationPaid(
  reservationId: number,
  stripeSessionId: string,
  amountTotal: number
): Promise<boolean> {
  const updated = await queryRows<{ id: number }>(MARK_PAID_SQL, [
    reservationId,
    stripeSessionId,
    amountTotal,
  ]);
  if (updated.length === 0) return false;
  await queryRows(RESERVE_SEATS_SQL, [reservationId]);
  return true;
}

export async function failPendingReservation(reservationId: number): Promise<void> {
  await queryRows(FAIL_PENDING_SQL, [reservationId]);
}

export async function sendPaidConfirmation(reservationId: number): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    console.error("Confirmation non envoyée : RESEND_FROM_EMAIL manquant", reservationId);
    return;
  }

  const [reservation] = await db.select().from(reservations).where(eq(reservations.id, reservationId));
  if (!reservation || reservation.stripeStatus !== "paid") return;

  const [eventData] = await db.select().from(events).where(eq(events.id, reservation.eventId));
  if (!eventData) return;

  const guestList = await db
    .select()
    .from(reservationSeats)
    .where(eq(reservationSeats.reservationId, reservationId));
  const upsellList = await db
    .select()
    .from(reservationUpsells)
    .where(eq(reservationUpsells.reservationId, reservationId));

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
    const tableRows =
      tableIds.length > 0
        ? await db
            .select({
              id: tables.id,
              rowNumber: tables.rowNumber,
              tableNumber: tables.tableNumber,
              isVip: tables.isVip,
            })
            .from(tables)
            .where(inArray(tables.id, tableIds))
        : [];
    const tMap = new Map(tableRows.map((t) => [t.id, t]));
    for (const s of seatRows) {
      const t = tMap.get(s.tableId);
      if (t) placementMap[s.id] = `T${getTableLabel(t.rowNumber, t.tableNumber)} - ${getSeatLabel(s.seatNumber)}`;
    }
    const first = seatRows.find((s) => s.id === guestList[0]?.seatId);
    const t = first ? tMap.get(first.tableId) : undefined;
    if (t) {
      tableInfo = `${getTableLabel(t.rowNumber, t.tableNumber)}`;
      isVip = t.isVip;
    }
  }

  let confirmationUrl: string | undefined;
  try {
    confirmationUrl = `${getBaseUrl()}/confirmation/${reservation.publicToken}`;
  } catch {
    confirmationUrl = undefined;
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
    confirmationUrl,
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
    from,
    to: reservation.email,
    subject: `Confirmation de réservation - Cmotion`,
    html,
  });
}

export async function alertMissing(sessionId: string, amount: number | null, email: string | null): Promise<boolean> {
  return alertPaymentAnomaly({
    reason: "paiement sans réservation",
    stripeSessionId: sessionId,
    amountTotal: amount,
    customerEmail: email,
  });
}
