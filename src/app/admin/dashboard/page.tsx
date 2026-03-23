import { db } from "@/lib/db";
import {
  events,
  tables,
  seats,
  reservations,
  reservationSeats,
  reservationUpsells,
} from "@/lib/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MEAL_OPTIONS } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect("/admin");

  const allEvents = await db.select().from(events);

  const stats = [];

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

    // Meal counts
    const resIds = paidReservations.map((r) => r.id);
    let mealCounts: Record<string, number> = {};
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
  }

  const globalRevenue = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const globalSeats = stats.reduce((sum, s) => sum + s.totalSeats, 0);
  const globalReserved = stats.reduce((sum, s) => sum + s.reservedSeats, 0);
  const globalOccupancy =
    globalSeats > 0 ? Math.round((globalReserved / globalSeats) * 100) : 0;

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

              {/* Caterer / meal summary */}
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

              {/* Recent reservations */}
              <h3 className="font-semibold text-slate-700 mb-3">
                Dernières réservations
              </h3>
              <ReservationList eventId={s.event.id} />
            </div>
          </div>
        );
      })}
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

async function ReservationList({ eventId }: { eventId: number }) {
  const resList = await db
    .select()
    .from(reservations)
    .where(eq(reservations.eventId, eventId))
    .orderBy(sql`${reservations.createdAt} DESC`)
    .limit(10);

  if (resList.length === 0) {
    return (
      <p className="text-sm text-slate-400">Aucune réservation pour le moment.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="pb-2 font-medium">ID</th>
            <th className="pb-2 font-medium">Référent</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Montant</th>
            <th className="pb-2 font-medium">Statut</th>
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {resList.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 font-mono text-xs">#{r.id}</td>
              <td className="py-2">{r.referentStudent}</td>
              <td className="py-2 text-slate-500">{r.email}</td>
              <td className="py-2 font-medium">
                {(r.totalAmount / 100).toFixed(2)}€
              </td>
              <td className="py-2">
                <StatusBadge status={r.stripeStatus || "pending"} />
              </td>
              <td className="py-2 text-slate-500">
                {r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString("fr-FR")
                  : "—"}
              </td>
              <td className="py-2">
                <Link
                  href={`/admin/reservations/${r.id}`}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                >
                  Détails →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-slate-100 text-slate-700",
  };

  const labels: Record<string, string> = {
    paid: "Payé",
    pending: "En attente",
    failed: "Échoué",
    refunded: "Remboursé",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}
    >
      {labels[status] || status}
    </span>
  );
}
