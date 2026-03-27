import { db } from "@/lib/db";
import {
  events,
  tables,
  seats,
  reservationSeats,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
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

  const reservedSeatIds = allSeats
    .filter((s) => s.status === "reserved")
    .map((s) => s.id);

  const guestBySeat: Record<
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[#555] hover:text-[#c9a227] transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{event.name}</h1>
        <p className="text-sm text-[#555] mt-0.5">
          {new Date(event.eventDate).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · {event.timeInfo}
        </p>
      </div>

      {/* Seating plan */}
      <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Plan de salle</h2>
        </div>
        <div className="p-5 sm:p-6">
          <AdminSeatingView tables={tablesWithSeats} eventId={eventId} />
        </div>
      </div>

      {/* Table-by-table list */}
      <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Détail par table</h2>
        </div>

        <div className="divide-y divide-[#141414]">
          {tableDetails.map(({ table, totalSeats, reservedCount, guests }) => (
            <div key={table.id} className="p-5 sm:px-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm">
                    Table {table.rowNumber}-{table.tableNumber}
                  </h3>
                  {table.isVip && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30 uppercase tracking-wider">
                      VIP ★
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#c9a227] to-[#e4c76b] rounded-full"
                      style={{ width: totalSeats > 0 ? `${(reservedCount / totalSeats) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs text-[#555]">
                    {reservedCount}/{totalSeats}
                  </span>
                </div>
              </div>

              {guests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {guests.map((g, i) => {
                    const meal = MEAL_OPTIONS.find((m) => m.value === g.mealChoice);
                    return (
                      <div
                        key={i}
                        className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-3"
                      >
                        <p className="font-medium text-sm text-[#ddd]">
                          {g.firstName} {g.lastName}
                        </p>
                        <p className="text-xs text-[#555] mt-0.5">{meal?.label || g.mealChoice}</p>
                        <Link
                          href={`/admin/reservations/${g.reservationId}`}
                          className="text-[10px] text-[#c9a227] hover:text-[#e4c76b] font-medium mt-1.5 inline-block transition-colors"
                        >
                          Rés. #{g.reservationId} →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#444]">Aucune réservation</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
