import { db } from "@/lib/db";
import { events, reservationSeats, reservationUpsells, reservations, seats, tables } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { canEditMeals, formatDeadlineFr, mealEditDeadline } from "@/lib/deadline";
import { getSeatLabel, getTableLabel } from "@/types";
import { MealEditor } from "./MealEditor";
import { DisneyBanner } from "@/components/DisneyBanner";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function MealEditPage({ params }: Props) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/i.test(token)) notFound();

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.publicToken, token.toLowerCase()));
  if (!reservation) notFound();

  const [event] = await db.select().from(events).where(eq(events.id, reservation.eventId));
  if (!event) notFound();

  const guestRows = await db.select().from(reservationSeats).where(eq(reservationSeats.reservationId, reservation.id));
  const upsellRows = await db.select().from(reservationUpsells).where(eq(reservationUpsells.reservationId, reservation.id));
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
        .select({ id: tables.id, rowNumber: tables.rowNumber, tableNumber: tables.tableNumber, isVip: tables.isVip })
        .from(tables)
        .where(inArray(tables.id, tableIds))
    : [];
  const seatMap = new Map(seatRows.map((seat) => [seat.id, seat]));
  const tableMap = new Map(tableRows.map((table) => [table.id, table]));
  const isVip = tableRows.some((table) => table.isVip);
  const deadline = mealEditDeadline(event.eventDate);
  const deadlineLabel = formatDeadlineFr(deadline);
  const editable = reservation.stripeStatus === "paid" && canEditMeals(event.eventDate);
  const closedReason =
    reservation.stripeStatus !== "paid"
      ? "Le paiement n'est pas confirmé. Les plats ne peuvent pas encore être modifiés."
      : editable
        ? undefined
        : `La date limite est passée (${deadlineLabel}). Les plats ne sont plus modifiables.`;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <DisneyBanner compact />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#c9a227]">Disney Show</p>
          <h1 className="text-2xl font-extrabold text-white mt-1">Modifier les plats</h1>
          <p className="text-sm text-[#888] mt-1">
            {event.name} · {event.timeInfo}
          </p>
        </div>
        <MealEditor
          token={token.toLowerCase()}
          isVip={isVip}
          deadlineLabel={deadlineLabel}
          editable={editable}
          closedReason={closedReason}
          totalAmount={reservation.totalAmount}
          guests={guestRows.map((guest) => {
            const seat = seatMap.get(guest.seatId);
            const table = seat ? tableMap.get(seat.tableId) : undefined;
            const place = table && seat ? `${getTableLabel(table.rowNumber, table.tableNumber)}${getSeatLabel(seat.seatNumber)}` : "";
            return {
              id: guest.id,
              name: `${guest.firstName} ${guest.lastName}`,
              place,
              mealChoice: guest.mealChoice,
              hasDessert: guest.hasDessert,
            };
          })}
          upsells={upsellRows
            .filter((upsell) => upsell.upsellType === "repas_danseur" && upsell.mealChoice)
            .map((upsell) => ({
              id: upsell.id,
              mealChoice: upsell.mealChoice as string,
              quantity: upsell.quantity,
            }))}
        />
        <Link href={`/confirmation/${token.toLowerCase()}`} className="inline-block text-sm text-[#888] hover:text-[#c9a227]">
          Retour à la confirmation
        </Link>
      </div>
    </main>
  );
}
