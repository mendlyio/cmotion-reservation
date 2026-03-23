import { db } from "@/lib/db";
import {
  reservations,
  reservationSeats,
  reservationUpsells,
  seats,
  tables,
  events,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MEAL_OPTIONS, UPSELL_OPTIONS } from "@/types";
import { ReservationEditor } from "./ReservationEditor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminReservationPage({ params }: Props) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect("/admin");

  const { id: idStr } = await params;
  const reservationId = parseInt(idStr);
  if (isNaN(reservationId)) notFound();

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId));

  if (!reservation) notFound();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, reservation.eventId));

  const resSeats = await db
    .select()
    .from(reservationSeats)
    .where(eq(reservationSeats.reservationId, reservationId));

  const seatIds = resSeats.map((rs) => rs.seatId);
  let seatDetails: { id: number; tableId: number; seatNumber: number }[] = [];
  let tableDetail: {
    id: number;
    rowNumber: number;
    tableNumber: number;
    isVip: boolean;
  } | null = null;

  if (seatIds.length > 0) {
    seatDetails = await db
      .select({
        id: seats.id,
        tableId: seats.tableId,
        seatNumber: seats.seatNumber,
      })
      .from(seats)
      .where(inArray(seats.id, seatIds));

    const tableId = seatDetails[0]?.tableId;
    if (tableId) {
      const [t] = await db
        .select({
          id: tables.id,
          rowNumber: tables.rowNumber,
          tableNumber: tables.tableNumber,
          isVip: tables.isVip,
        })
        .from(tables)
        .where(eq(tables.id, tableId));
      tableDetail = t || null;
    }
  }

  const upsells = await db
    .select()
    .from(reservationUpsells)
    .where(eq(reservationUpsells.reservationId, reservationId));

  const date = new Date(event.eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/admin/dashboard"
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-block"
      >
        ← Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Réservation #{reservation.id}
          </h1>
          <p className="text-slate-500 text-sm">
            {event.name} — {date} à {event.timeInfo}
          </p>
        </div>
        <StatusBadge status={reservation.stripeStatus || "pending"} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Élève référent</dt>
              <dd className="font-medium">{reservation.referentStudent}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{reservation.email}</dd>
            </div>
            {reservation.phone && (
              <div>
                <dt className="text-slate-500">Téléphone</dt>
                <dd>{reservation.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Paiement</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Montant</dt>
              <dd className="text-2xl font-bold">
                {(reservation.totalAmount / 100).toFixed(2)}€
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Stripe ID</dt>
              <dd className="font-mono text-xs">
                {reservation.stripePaymentId || "—"}
              </dd>
            </div>
            {tableDetail && (
              <div>
                <dt className="text-slate-500">Table</dt>
                <dd>
                  {tableDetail.rowNumber}-{tableDetail.tableNumber}
                  {tableDetail.isVip ? " (VIP)" : ""}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Notes admin */}
      {reservation.adminNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-1">Notes admin</h3>
          <p className="text-sm text-amber-700">{reservation.adminNotes}</p>
        </div>
      )}

      {/* Editable guest list */}
      <ReservationEditor
        reservationId={reservation.id}
        email={reservation.email}
        eventName={event.name}
        adminNotes={reservation.adminNotes || ""}
        guests={resSeats.map((rs) => {
          const seat = seatDetails.find((s) => s.id === rs.seatId);
          return {
            id: rs.id,
            seatId: rs.seatId,
            seatNumber: seat?.seatNumber || 0,
            firstName: rs.firstName,
            lastName: rs.lastName,
            mealChoice: rs.mealChoice,
            hasDessert: rs.hasDessert,
            adminNotes: rs.adminNotes || "",
          };
        })}
      />

      {upsells.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mt-6">
          <h2 className="font-semibold mb-3">Extras</h2>
          {upsells.map((u) => {
            const option = UPSELL_OPTIONS.find(
              (o) => o.type === u.upsellType
            );
            return (
              <div key={u.id} className="flex justify-between text-sm py-1">
                <span>
                  {option?.label || u.upsellType} ×{u.quantity}
                </span>
                <span>{((u.unitPrice * u.quantity) / 100).toFixed(2)}€</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    refunded: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const labels: Record<string, string> = {
    paid: "Payé",
    pending: "En attente",
    failed: "Échoué",
    refunded: "Remboursé",
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${styles[status] || styles.pending}`}
    >
      {labels[status] || status}
    </span>
  );
}
