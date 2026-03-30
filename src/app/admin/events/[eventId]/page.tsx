import { db } from "@/lib/db";
import {
  events,
  tables,
  seats,
  reservations,
  reservationSeats,
  reservationUpsells,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MEAL_OPTIONS, getTableLabel } from "@/types";
import { AdminSeatingView } from "./AdminSeatingView";
import { EnveloppeView, type Enveloppe } from "@/components/admin/EnveloppeView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminEventPage({ params, searchParams }: Props) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect("/admin");

  const { eventId: eidStr } = await params;
  const { tab = "plan" } = await searchParams;
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
    allSeats = await db.select().from(seats).where(inArray(seats.tableId, tableIds));
  }

  const tablesWithSeats = eventTables.map((table) => ({
    ...table,
    seats: allSeats.filter((s) => s.tableId === table.id),
  }));

  const reservedSeatIds = allSeats.filter((s) => s.status === "reserved").map((s) => s.id);
  const guestBySeat: Record<number, { firstName: string; lastName: string; mealChoice: string; reservationId: number }> = {};

  if (reservedSeatIds.length > 0) {
    const resSeats = await db.select().from(reservationSeats).where(inArray(reservationSeats.seatId, reservedSeatIds));
    for (const rs of resSeats) {
      guestBySeat[rs.seatId] = { firstName: rs.firstName, lastName: rs.lastName, mealChoice: rs.mealChoice, reservationId: rs.reservationId };
    }
  }

  const tableDetails = eventTables.map((table) => {
    const tableSeats = allSeats.filter((s) => s.tableId === table.id);
    const reserved = tableSeats.filter((s) => s.status === "reserved");
    const guests = reserved.map((s) => guestBySeat[s.id]).filter(Boolean);
    return { table, totalSeats: tableSeats.length, reservedCount: reserved.length, guests };
  });

  // Build envelopes (paid reservations only)
  const allReservations = await db.select().from(reservations).where(eq(reservations.eventId, eventId));
  const paidOnes = allReservations.filter((r) => r.stripeStatus === "paid");
  const paidIds = paidOnes.map((r) => r.id);

  let allResSeats: (typeof reservationSeats.$inferSelect)[] = [];
  let allUpsells: (typeof reservationUpsells.$inferSelect)[] = [];

  if (paidIds.length > 0) {
    allResSeats = await db.select().from(reservationSeats).where(inArray(reservationSeats.reservationId, paidIds));
    allUpsells = await db.select().from(reservationUpsells).where(inArray(reservationUpsells.reservationId, paidIds));
  }

  // Build seat→table map for envelope table info
  const seatToTable: Record<number, { rowNumber: number; tableNumber: number; isVip: boolean }> = {};
  const seatNumberMap: Record<number, number> = {};
  const rsSeatIds = allResSeats.map((rs) => rs.seatId);
  if (rsSeatIds.length > 0) {
    const sd = await db.select({ id: seats.id, tableId: seats.tableId, seatNumber: seats.seatNumber }).from(seats).where(inArray(seats.id, rsSeatIds));
    for (const s of sd) seatNumberMap[s.id] = s.seatNumber;
    const tIds = [...new Set(sd.map((s) => s.tableId))];
    if (tIds.length > 0) {
      const td = await db
        .select({ id: tables.id, rowNumber: tables.rowNumber, tableNumber: tables.tableNumber, isVip: tables.isVip })
        .from(tables)
        .where(inArray(tables.id, tIds));
      const tMap: Record<number, { rowNumber: number; tableNumber: number; isVip: boolean }> = {};
      for (const t of td) tMap[t.id] = t;
      for (const s of sd) { if (tMap[s.tableId]) seatToTable[s.id] = tMap[s.tableId]; }
    }
  }

  const envelopes: Enveloppe[] = paidOnes.map((r) => {
    const guests = allResSeats
      .filter((rs) => rs.reservationId === r.id)
      .map((rs) => ({ firstName: rs.firstName, lastName: rs.lastName, mealChoice: rs.mealChoice, hasDessert: rs.hasDessert, seatNumber: seatNumberMap[rs.seatId] ?? 0 }));

    const dancerMeals = allUpsells
      .filter((u) => u.reservationId === r.id && u.upsellType === "repas_danseur")
      .map((u) => ({ mealChoice: u.mealChoice, quantity: u.quantity }));

    const firstSeatId = allResSeats.find((rs) => rs.reservationId === r.id)?.seatId;
    const tableData = firstSeatId ? seatToTable[firstSeatId] : null;

    return {
      reservationId: r.id,
      referentStudent: r.referentStudent,
      tableInfo: tableData ? `${getTableLabel(tableData.rowNumber, tableData.tableNumber)}` : "—",
      isVip: tableData?.isVip ?? false,
      guests,
      dancerMeals,
    };
  });

  const TABS = [
    { key: "plan", label: "Plan de salle" },
    { key: "tables", label: "Détail tables" },
    { key: "envelopes", label: `Enveloppes (${envelopes.length})` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/dashboard" className="text-sm text-[#666] hover:text-[#aaa] mb-1 inline-block">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-white">{event.name}</h1>
          <p className="text-[#555] text-sm">
            {new Date(event.eventDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} — {event.timeInfo}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#1e1e1e] mb-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/events/${eventId}?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? "bg-[#1a1a1a] border border-b-[#1a1a1a] border-[#2a2a2a] text-white -mb-px"
                : "text-[#555] hover:text-[#aaa]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "plan" && (
        <div className="bg-[#111] rounded-xl border border-[#1e1e1e] p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Plan de salle</h2>
          <AdminSeatingView tables={tablesWithSeats} eventId={eventId} />
        </div>
      )}

      {tab === "tables" && (
        <div className="bg-[#111] rounded-xl border border-[#1e1e1e]">
          <div className="p-6 border-b border-[#1e1e1e]">
            <h2 className="text-lg font-semibold text-white">Détail par table</h2>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {tableDetails.map(({ table, totalSeats, reservedCount, guests }) => (
              <div key={table.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">
                    Table {getTableLabel(table.rowNumber, table.tableNumber)}
                    {table.isVip && <span className="ml-2 text-[#c9a227] text-xs">★ VIP</span>}
                  </h3>
                  <span className="text-sm text-[#555]">{reservedCount}/{totalSeats} réservés</span>
                </div>
                {guests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {guests.map((g, i) => {
                      const meal = MEAL_OPTIONS.find((m) => m.value === g.mealChoice);
                      return (
                        <div key={i} className="bg-[#1a1a1a] rounded-lg p-2 text-sm">
                          <p className="font-medium text-white">{g.firstName} {g.lastName}</p>
                          <p className="text-[#555] text-xs">{meal?.label || g.mealChoice}</p>
                          <Link href={`/admin/reservations/${g.reservationId}`} className="text-[#c9a227] text-xs hover:underline">
                            Rés. #{g.reservationId}
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
      )}

      {tab === "envelopes" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Enveloppes</h2>
            <p className="text-sm text-[#555]">{envelopes.length} enveloppe{envelopes.length > 1 ? "s" : ""}</p>
          </div>
          <EnveloppeView envelopes={envelopes} />
        </div>
      )}
    </div>
  );
}
