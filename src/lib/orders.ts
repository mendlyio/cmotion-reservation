import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, reservationSeats, reservationUpsells, reservations, seats, tables } from "@/lib/db/schema";
import { getSeatLabel, getTableLabel } from "@/types";
import type { SheetExtra, SheetGuest } from "@/lib/service-sheet";
import { formatReferentDisplay, sortByReferentName } from "@/lib/referent";

export interface LoadedGuest extends SheetGuest {
  reservationId: number;
  firstName: string;
  lastName: string;
  mealChoice: string;
}

export interface LoadedReservation {
  id: number;
  referent: string;
  referentStudent: string;
  referentLastName: string | null;
  referentFirstName: string | null;
  email: string;
  phone: string | null;
  status: string;
  totalAmount: number;
  createdAt: Date | null;
  guests: LoadedGuest[];
  extras: SheetExtra[];
}

export interface LoadedEventOrders {
  event: typeof events.$inferSelect;
  reservations: LoadedReservation[];
}

export async function loadEventOrders(eventId: number): Promise<LoadedEventOrders | null> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return null;

  const reservationRows = await db.select().from(reservations).where(eq(reservations.eventId, eventId));
  if (reservationRows.length === 0) return { event, reservations: [] };

  const ids = reservationRows.map((row) => row.id);
  const guestRows = await db.select().from(reservationSeats).where(inArray(reservationSeats.reservationId, ids));
  const upsellRows = await db.select().from(reservationUpsells).where(inArray(reservationUpsells.reservationId, ids));
  const seatIds = guestRows.map((guest) => guest.seatId);
  const seatRows = seatIds.length
    ? await db
        .select({ id: seats.id, seatNumber: seats.seatNumber, tableId: seats.tableId })
        .from(seats)
        .where(inArray(seats.id, seatIds))
    : [];
  const tableIds = [...new Set(seatRows.map((seat) => seat.tableId))];
  const tableRows = tableIds.length
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
  const seatMap = new Map(seatRows.map((seat) => [seat.id, seat]));
  const tableMap = new Map(tableRows.map((table) => [table.id, table]));

  const reservationsLoaded: LoadedReservation[] = reservationRows
    .map((reservation) => {
      const guests: LoadedGuest[] = guestRows
        .filter((guest) => guest.reservationId === reservation.id)
        .map((guest) => {
          const seat = seatMap.get(guest.seatId);
          const table = seat ? tableMap.get(seat.tableId) : undefined;
          const tableNumber = table ? getTableLabel(table.rowNumber, table.tableNumber) : 0;
          const place = table && seat ? `${tableNumber}${getSeatLabel(seat.seatNumber)}` : "";
          return {
            reservationId: reservation.id,
            tableNumber,
            place,
            firstName: guest.firstName,
            lastName: guest.lastName,
            mealChoice: guest.mealChoice,
            hasDessert: guest.hasDessert,
          };
        })
        .sort((a, b) => a.place.localeCompare(b.place, "fr", { numeric: true }));
      const extras = upsellRows
        .filter((upsell) => upsell.reservationId === reservation.id && upsell.upsellType === "repas_danseur" && upsell.mealChoice)
        .map((upsell) => ({ mealChoice: upsell.mealChoice as string, quantity: upsell.quantity }));
      return {
        id: reservation.id,
        referent: formatReferentDisplay(reservation),
        referentStudent: reservation.referentStudent,
        referentLastName: reservation.referentLastName,
        referentFirstName: reservation.referentFirstName,
        email: reservation.email,
        phone: reservation.phone,
        status: reservation.stripeStatus,
        totalAmount: reservation.totalAmount,
        createdAt: reservation.createdAt,
        guests,
        extras,
      };
    });

  return { event, reservations: sortByReferentName(reservationsLoaded) };
}

export function paidReservations(orders: LoadedEventOrders): LoadedReservation[] {
  return orders.reservations.filter((reservation) => reservation.status === "paid");
}
