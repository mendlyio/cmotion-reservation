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
import { redirect } from "next/navigation";
import Link from "next/link";
import { MEAL_OPTIONS, DANCER_MEAL_OPTIONS, DESSERT_LABEL } from "@/types";
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
    const dancerMealCounts: Record<string, number> = {};
    let dessertCount = 0;
    let guestCount = 0;

    if (resIds.length > 0) {
      const allGuests = await db
        .select()
        .from(reservationSeats)
        .where(inArray(reservationSeats.reservationId, resIds));

      guestCount = allGuests.length;

      for (const guest of allGuests) {
        mealCounts[guest.mealChoice] = (mealCounts[guest.mealChoice] || 0) + 1;
        if (guest.hasDessert) dessertCount++;
      }

      const allUpsells = await db
        .select()
        .from(reservationUpsells)
        .where(inArray(reservationUpsells.reservationId, resIds));

      for (const u of allUpsells) {
        if (u.upsellType === "repas_danseur" && u.mealChoice) {
          dancerMealCounts[u.mealChoice] = (dancerMealCounts[u.mealChoice] || 0) + u.quantity;
        }
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
      dancerMealCounts,
    });

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
  const globalPaid = stats.reduce((sum, s) => sum + s.paidReservations, 0);
  const globalPending = stats.reduce((sum, s) => sum + s.pendingReservations, 0);

  const eventList = allEvents.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[#666] mt-0.5">Vue d&apos;ensemble des réservations</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#c9a227] animate-pulse" />
          <span className="text-xs text-[#666]">Temps réel</span>
        </div>
      </div>

      {/* Global KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Chiffre d'affaires"
          value={`${(globalRevenue / 100).toFixed(0)}€`}
          sub="Total encaissé"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
          }
          accent
        />
        <StatCard
          label="Taux de remplissage"
          value={`${globalOccupancy}%`}
          sub={`${globalReserved} / ${globalSeats} sièges`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
        <StatCard
          label="Réservations payées"
          value={globalPaid.toString()}
          sub="Paiements confirmés"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="En attente"
          value={globalPending.toString()}
          sub="Paiement non finalisé"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          warn={globalPending > 0}
        />
      </div>

      {/* Per-event sections */}
      {stats.map((s) => {
        const date = new Date(s.event.eventDate).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        return (
          <div key={s.event.id} className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden">
            {/* Event header */}
            <div className="px-5 sm:px-6 py-5 border-b border-[#1e1a0e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c9a227]" />
                  <h2 className="text-lg font-bold text-white">{s.event.name}</h2>
                </div>
                <p className="text-sm text-[#666] pl-3.5">
                  {date} · {s.event.timeInfo}
                </p>
              </div>
              <div className="flex gap-2 pl-3.5 sm:pl-0">
                <Link
                  href={`/admin/events/${s.event.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#c9a227]/30 rounded-xl text-xs font-medium text-[#aaa] hover:text-[#c9a227] transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20.25H5.25A2.25 2.25 0 013 18V6.75A2.25 2.25 0 015.25 4.5H9m6 15.75h3.75A2.25 2.25 0 0021 18V6.75A2.25 2.25 0 0018.75 4.5H15M12 3v18" />
                  </svg>
                  Plan de salle
                </Link>
                <Link
                  href={`/api/admin/export/${s.event.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#c9a227]/30 rounded-xl text-xs font-medium text-[#aaa] hover:text-[#c9a227] transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export CSV
                </Link>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-5">
              {/* Mini KPIs */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <MiniStat label="Remplissage" value={`${s.occupancyRate}%`} />
                <MiniStat label="CA" value={`${(s.totalRevenue / 100).toFixed(0)}€`} gold />
                <MiniStat label="Réservations" value={s.paidReservations.toString()} />
                <MiniStat label="Convives" value={s.guestCount.toString()} />
                <MiniStat label="En cours" value={s.heldSeats.toString()} dim />
              </div>

              {/* Occupancy bar */}
              <div>
                <div className="flex justify-between text-xs text-[#666] mb-1.5">
                  <span>Occupation salle</span>
                  <span className="text-[#c9a227]">{s.occupancyRate}%</span>
                </div>
                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c9a227] to-[#e4c76b] rounded-full transition-all"
                    style={{ width: `${s.occupancyRate}%` }}
                  />
                </div>
              </div>

              {/* Meal counts */}
              <div>
                <h3 className="text-xs font-semibold text-[#666] uppercase tracking-widest mb-3">
                  Liste traiteur — Convives
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                  {MEAL_OPTIONS.map((meal) => (
                    <div key={meal.value} className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-3">
                      <p className="text-xs text-[#666] mb-1 truncate">{meal.label}</p>
                      <p className="text-2xl font-bold text-white">{s.mealCounts[meal.value] || 0}</p>
                    </div>
                  ))}
                  <div className="bg-[#1a1500] border border-[#c9a227]/20 rounded-xl p-3">
                    <p className="text-xs text-[#c9a227]/70 mb-1">{DESSERT_LABEL}</p>
                    <p className="text-2xl font-bold text-[#c9a227]">{s.dessertCount}</p>
                  </div>
                </div>
                {Object.values(s.dancerMealCounts).some((c) => c > 0) && (
                  <>
                    <h3 className="text-xs font-semibold text-[#666] uppercase tracking-widest mb-3 mt-2">
                      Repas Danseur
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DANCER_MEAL_OPTIONS.map((opt) => (
                        <div key={opt.value} className="bg-[#100e1a] border border-purple-500/20 rounded-xl p-3">
                          <p className="text-xs text-purple-400/70 mb-1 truncate">{opt.label}</p>
                          <p className="text-2xl font-bold text-purple-300">{s.dancerMealCounts[opt.value] || 0}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Full client list */}
      <div>
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
  icon,
  accent,
  warn,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl border p-4 sm:p-5 overflow-hidden ${
      accent
        ? "bg-gradient-to-br from-[#1a1400] to-[#0f0c00] border-[#c9a227]/30"
        : warn
        ? "bg-[#0f0f0f] border-[#2a1a0e]"
        : "bg-[#0f0f0f] border-[#1a1a1a]"
    }`}>
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a227]/5 rounded-full -translate-y-8 translate-x-8 blur-xl" />
      )}
      <div className={`flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${
        accent
          ? "bg-[#c9a227]/15 text-[#c9a227]"
          : warn
          ? "bg-amber-500/10 text-amber-500"
          : "bg-[#1a1a1a] text-[#666]"
      }`}>
        {icon}
      </div>
      <p className="text-xs text-[#555] mb-1">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${
        accent ? "text-[#c9a227]" : warn && value !== "0" ? "text-amber-400" : "text-white"
      }`}>
        {value}
      </p>
      <p className="text-xs text-[#444] mt-1">{sub}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  gold,
  dim,
}: {
  label: string;
  value: string;
  gold?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="text-center py-3 px-2 bg-[#141414] rounded-xl border border-[#1e1e1e]">
      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${gold ? "text-[#c9a227]" : dim ? "text-[#555]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
