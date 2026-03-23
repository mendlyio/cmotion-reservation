import { db } from "@/lib/db";
import {
  events,
  tables,
  seats,
  reservationSeats,
  reservations,
} from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MEAL_OPTIONS } from "@/types";
import { AdminSeatingView } from "./AdminSeatingView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ eventId: string }>;
}

export default async function AdminEventPage({ params }: Props) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect("/admin");

  const { eventId: eidStr } = await params;
  const eventId = parseInt(eidStr);
  if (isNaN(eventId)) notFound();

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) notFound();

  // Get all tables with seats
  const eventTables = await db
    .select()
    .from(tables)
    .where(eq(tables.eventId, eventId))
    .orderBy(tables.rowNumber, tables.tableNumber);

  const tableIds = eventTables.map((t) => t.id);
  let allSeats: (typeof seats.$inferSelect)[] = [];
  if (tableIds.length > 0) {
    allSeats = await db
      .select()
      .from(seats)
      .where(inArray(seats.tableId, tableIds));
  }

  const tablesWithSeats = eventTables.map((table) => ({
    ...table,
    seats: allSeats.filter((s) => s.tableId === table.id),
  }));

  // Get reserved seat details with guest info
  const reservedSeatIds = allSeats
    .filter((s) => s.status === "reserved")
    .map((s) => s.id);

  let guestBySeat: Record<
    number,
    { firstName: string; lastName: string; mealChoice: string; reservationId: number }
  > = {};

  if (reservedSeatIds.length > 0) {
    const resSeats = await db
      .select()
      .from(reservationSeats)
      .where(inArray(reservationSeats.seatId, reservedSeatIds));

    for (const rs of resSeats) {
      guestBySeat[rs.seatId] = {
        firstName: rs.firstName,
        lastName: rs.lastName,
        mealChoice: rs.mealChoice,
        reservationId: rs.reservationId,
      };
    }
  }

  // Table-by-table details
  const tableDetails = eventTables.map((table) => {
    const tableSeats = allSeats.filter((s) => s.tableId === table.id);
    const reserved = tableSeats.filter((s) => s.status === "reserved");
    const guests = reserved
      .map((s) => guestBySeat[s.id])
      .filter(Boolean);

    return {
      table,
      totalSeats: tableSeats.length,
      reservedCount: reserved.length,
      guests,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
          <p className="text-slate-500 text-sm">
            {new Date(event.eventDate).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            — {event.timeInfo}
          </p>
        </div>
      </div>

      {/* Seating plan */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Plan de salle</h2>
        <AdminSeatingView tables={tablesWithSeats} eventId={eventId} />
      </div>

      {/* Table-by-table list */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Détail par table</h2>
        </div>

        <div className="divide-y">
          {tableDetails.map(({ table, totalSeats, reservedCount, guests }) => (
            <div key={table.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  Table {table.rowNumber}-{table.tableNumber}
                  {table.isVip && (
                    <span className="ml-2 text-amber-600 text-xs">★ VIP</span>
                  )}
                </h3>
                <span className="text-sm text-slate-500">
                  {reservedCount}/{totalSeats} réservés
                </span>
              </div>

              {guests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {guests.map((g, i) => {
                    const meal = MEAL_OPTIONS.find(
                      (m) => m.value === g.mealChoice
                    );
                    return (
                      <div
                        key={i}
                        className="bg-slate-50 rounded p-2 text-sm"
                      >
                        <p className="font-medium">
                          {g.firstName} {g.lastName}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {meal?.label || g.mealChoice}
                        </p>
                        <Link
                          href={`/admin/reservations/${g.reservationId}`}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Rés. #{g.reservationId}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aucune réservation</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
