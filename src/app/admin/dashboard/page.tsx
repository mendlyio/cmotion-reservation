import { db } from "@/lib/db";
import {
  events,
  tables,
  seats,
  reservations,
  reservationSeats,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MEAL_OPTIONS } from "@/types";
import {
  ClientListSection,
  type ClientReservation,
} from "@/components/admin/ClientListSection";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect("/admin");

  const allEvents = await db.select().from(events);

  const stats = [];
  const allClientReservations: ClientReservation[] = [];

  for (const event of allEvents) {
    const eventTables = await db
      .select()
      .from(tables)
      .where(eq(tables.eventId, event.id));

    const tableIds = eventTables.map((t) => t.id);
    let allSeats: (typeof seats.$inferSelect)[] = [];
    if (tableIds.length > 0) {
      allSeats = await db
        .select()
        .from(seats)
        .where(inArray(seats.tableId, tableIds));
    }

    const totalSeats = allSeats.length;
    const reservedSeats = allSeats.filter(
      (s) => s.status === "reserved"
    ).length;
    const heldSeats = allSeats.filter((s) => s.status === "held").length;
    const occupancyRate =
      totalSeats > 0 ? Math.round((reservedSeats / totalSeats) * 100) : 0;

    const eventReservations = await db
      .select()
      .from(reservations)
      .where(eq(reservations.eventId, event.id));

    const paidReservations = eventReservations.filter(
      (r) => r.stripeStatus === "paid"
    );
    const totalRevenue = paidReservations.reduce(
      (sum, r) => sum + r.totalAmount,
      0
    );

    const resIds = paidReservations.map((r) => r.id);
    const mealCounts: Record<string, number> = {};
    let dessertCount = 0;
    let guestCount = 0;

    if (resIds.length > 0) {
      const allGuests = await db
        .select()
        .from(reservationSeats)
        .where(inArray(reservationSeats.reservationId, resIds));

      guestCount = allGuests.length;

      for (const guest of allGuests) {
        mealCounts[guest.mealChoice] =
          (mealCounts[guest.mealChoice] || 0) + 1;
        if (guest.hasDessert) dessertCount++;
      }
    }

    stats.push({
      event,
      totalSeats,
      reservedSeats,
      heldSeats,
      occupancyRate,
      totalReservations: eventReservations.length,
      paidReservations: paidReservations.length,
      pendingReservations: eventReservations.filter(
        (r) => r.stripeStatus === "pending"
      ).length,
      totalRevenue,
      mealCounts,
      dessertCount,
      guestCount,
    });

    // Build client reservation data for client list
    const allResIds = eventReservations.map((r) => r.id);
    let allResGuests: (typeof reservationSeats.$inferSelect)[] = [];
    if (allResIds.length > 0) {
      allResGuests = await db
        .select()
        .from(reservationSeats)
        .where(inArray(reservationSeats.reservationId, allResIds));
    }

    const resSeatIds = allResGuests.map((g) => g.seatId);
    const seatMap: Record<number, { seatNumber: number; tableId: number }> = {};
    const tableMap: Record<
      number,
      { rowNumber: number; tableNumber: number; isVip: boolean }
    > = {};

    if (resSeatIds.length > 0) {
      const seatDetails = await db
        .select({ id: seats.id, seatNumber: seats.seatNumber, tableId: seats.tableId })
        .from(seats)
        .where(inArray(seats.id, resSeatIds));

      for (const s of seatDetails) {
        seatMap[s.id] = { seatNumber: s.seatNumber, tableId: s.tableId };
      }

      const uniqueTableIds = [...new Set(seatDetails.map((s) => s.tableId))];
      if (uniqueTableIds.length > 0) {
        const tableDetails = await db
          .select({
            id: tables.id,
            rowNumber: tables.rowNumber,
            tableNumber: tables.tableNumber,
            isVip: tables.isVip,
          })
          .from(tables)
          .where(inArray(tables.id, uniqueTableIds));

        for (const t of tableDetails) {
          tableMap[t.id] = {
            rowNumber: t.rowNumber,
            tableNumber: t.tableNumber,
            isVip: t.isVip,
          };
        }
      }
    }

    for (const r of eventReservations) {
      const rGuests = allResGuests.filter((g) => g.reservationId === r.id);
      const firstSeat = rGuests[0] ? seatMap[rGuests[0].seatId] : null;
      const table = firstSeat ? tableMap[firstSeat.tableId] : null;

      allClientReservations.push({
        id: r.id,
        referentStudent: r.referentStudent,
        email: r.email,
        phone: r.phone,
        totalAmount: r.totalAmount,
        stripeStatus: r.stripeStatus || "pending",
        createdAt: r.createdAt ? r.createdAt.toISOString() : null,
        adminNotes: r.adminNotes,
        eventId: event.id,
        eventName: event.name,
        eventDate: event.eventDate,
        timeInfo: event.timeInfo,
        tableInfo: table
          ? `${table.rowNumber}-${table.tableNumber}`
          : "—",
        isVip: table?.isVip ?? false,
        guests: rGuests.map((g) => {
          const seat = seatMap[g.seatId];
          return {
            id: g.id,
            seatId: g.seatId,
            seatNumber: seat?.seatNumber ?? 0,
            firstName: g.firstName,
            lastName: g.lastName,
            mealChoice: g.mealChoice,
            hasDessert: g.hasDessert,
            adminNotes: g.adminNotes,
          };
        }),
      });
    }
  }

  allClientReservations.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db_ = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db_ - da;
  });

  const globalRevenue = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const globalSeats = stats.reduce((sum, s) => sum + s.totalSeats, 0);
  const globalReserved = stats.reduce((sum, s) => sum + s.reservedSeats, 0);
  const globalOccupancy =
    globalSeats > 0 ? Math.round((globalReserved / globalSeats) * 100) : 0;

  const eventList = allEvents.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard</h1>

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Chiffre d'affaires"
          value={`${(globalRevenue / 100).toFixed(0)}€`}
          sub="Total payé"
        />
        <StatCard
          label="Taux de remplissage"
          value={`${globalOccupancy}%`}
          sub={`${globalReserved} / ${globalSeats} sièges`}
        />
        <StatCard
          label="Réservations"
          value={stats
            .reduce((sum, s) => sum + s.paidReservations, 0)
            .toString()}
          sub="Payées"
        />
        <StatCard
          label="En attente"
          value={stats
            .reduce((sum, s) => sum + s.pendingReservations, 0)
            .toString()}
          sub="Paiement non finalisé"
        />
      </div>

      {/* Per-event stats */}
      {stats.map((s) => {
        const date = new Date(s.event.eventDate).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        return (
          <div key={s.event.id} className="bg-white rounded-xl border mb-6">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {s.event.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {date} — {s.event.timeInfo}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/events/${s.event.id}`}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Plan de salle
                </Link>
                <Link
                  href={`/api/admin/export/${s.event.id}`}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Export CSV
                </Link>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <MiniStat
                  label="Remplissage"
                  value={`${s.occupancyRate}%`}
                />
                <MiniStat
                  label="CA"
                  value={`${(s.totalRevenue / 100).toFixed(0)}€`}
                />
                <MiniStat
                  label="Réservations"
                  value={s.paidReservations.toString()}
                />
                <MiniStat
                  label="Convives"
                  value={s.guestCount.toString()}
                />
                <MiniStat
                  label="En cours"
                  value={s.heldSeats.toString()}
                />
              </div>

              <h3 className="font-semibold text-slate-700 mb-3">
                Liste traiteur
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {MEAL_OPTIONS.map((meal) => (
                  <div
                    key={meal.value}
                    className="bg-slate-50 rounded-lg p-3"
                  >
                    <p className="text-sm text-slate-600">{meal.label}</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {s.mealCounts[meal.value] || 0}
                    </p>
                  </div>
                ))}
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-sm text-amber-700">Tiramisu</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {s.dessertCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Full client list with inline editing */}
      <div className="mt-8">
        <ClientListSection
          reservations={allClientReservations}
          events={eventList}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
