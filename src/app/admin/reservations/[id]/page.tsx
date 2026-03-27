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
import { UPSELL_OPTIONS } from "@/types";
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Réservation <span className="text-[#c9a227]">#{reservation.id}</span>
          </h1>
          <p className="text-sm text-[#555] mt-0.5">
            {event.name} · {date} à {event.timeInfo}
          </p>
        </div>
        <StatusBadge status={reservation.stripeStatus || "pending"} />
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] p-5">
          <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-4">Contact</h2>
          <dl className="space-y-3">
            <InfoRow label="Élève référent" value={reservation.referentStudent} />
            <InfoRow label="Email" value={reservation.email} />
            {reservation.phone && <InfoRow label="Téléphone" value={reservation.phone} />}
          </dl>
        </div>

        <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] p-5">
          <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-4">Paiement</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-[#555]">Montant</dt>
              <dd className="text-3xl font-bold text-[#c9a227] mt-0.5">
                {(reservation.totalAmount / 100).toFixed(2)}€
              </dd>
            </div>
            <InfoRow
              label="Stripe ID"
              value={<span className="font-mono text-xs text-[#666]">{reservation.stripePaymentId || "—"}</span>}
            />
            {tableDetail && (
              <InfoRow
                label="Table"
                value={`${tableDetail.rowNumber}-${tableDetail.tableNumber}${tableDetail.isVip ? " · VIP ★" : ""}`}
                gold={tableDetail.isVip}
              />
            )}
          </dl>
        </div>
      </div>

      {/* Admin notes */}
      {reservation.adminNotes && (
        <div className="bg-[#c9a227]/5 border border-[#c9a227]/20 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-[#c9a227] uppercase tracking-widest mb-2">Notes admin</h3>
          <p className="text-sm text-[#c9a227]/80">{reservation.adminNotes}</p>
        </div>
      )}

      {/* Editable guest list */}
      <ReservationEditor
        reservationId={reservation.id}
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
        <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] p-5">
          <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-4">Extras</h2>
          <div className="space-y-2">
            {upsells.map((u) => {
              const option = UPSELL_OPTIONS.find((o) => o.type === u.upsellType);
              return (
                <div key={u.id} className="flex justify-between items-center text-sm py-2 border-b border-[#141414] last:border-0">
                  <span className="text-[#aaa]">
                    {option?.label || u.upsellType} ×{u.quantity}
                  </span>
                  <span className="font-semibold text-[#c9a227]">
                    {((u.unitPrice * u.quantity) / 100).toFixed(2)}€
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, gold }: { label: string; value: React.ReactNode; gold?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[#555]">{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 ${gold ? "text-[#c9a227]" : "text-[#ccc]"}`}>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/15 text-red-400 border-red-500/20",
    refunded: "bg-[#1e1e1e] text-[#666] border-[#2a2a2a]",
  };
  const labels: Record<string, string> = {
    paid: "Payé",
    pending: "En attente",
    failed: "Échoué",
    refunded: "Remboursé",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}
