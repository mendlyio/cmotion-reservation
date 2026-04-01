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
import { notFound } from "next/navigation";
import Link from "next/link";
import { MEAL_OPTIONS, UPSELL_OPTIONS, DESSERT_LABEL, getTableLabel, getSeatLabel } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ reservationId: string }>;
}

export default async function ConfirmationPage({ params }: Props) {
  const { reservationId: ridStr } = await params;
  const reservationId = parseInt(ridStr);
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
  if (seatIds.length > 0) {
    seatDetails = await db
      .select({ id: seats.id, tableId: seats.tableId, seatNumber: seats.seatNumber })
      .from(seats)
      .where(inArray(seats.id, seatIds));
  }

  const tableIds = [...new Set(seatDetails.map((s) => s.tableId))];
  let tableDetail: { id: number; rowNumber: number; tableNumber: number; isVip: boolean } | null = null;
  if (tableIds.length > 0) {
    const [t] = await db
      .select({ id: tables.id, rowNumber: tables.rowNumber, tableNumber: tables.tableNumber, isVip: tables.isVip })
      .from(tables)
      .where(inArray(tables.id, tableIds));
    tableDetail = t || null;
  }

  const upsells = await db
    .select()
    .from(reservationUpsells)
    .where(eq(reservationUpsells.reservationId, reservationId));

  const isPaid = reservation.stripeStatus === "paid";
  const date = new Date(event.eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-[#0a0a0a]">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full blur-3xl opacity-60 ${
          isPaid ? "bg-[#c9a227]/10" : "bg-amber-500/8"
        }`} />
      </div>

      {/* Status header */}
      <div className="relative pt-12 pb-10 px-5 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-xl ${
          isPaid
            ? "bg-gradient-to-br from-[#c9a227] to-[#a07818] shadow-[#c9a227]/30"
            : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20"
        }`}>
          {isPaid ? (
            <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-1">
          {isPaid ? "Réservation confirmée" : "Paiement en attente"}
        </h1>
        <p className="text-sm text-[#555]">
          Réservation <span className="text-[#c9a227] font-mono">#{reservation.id}</span>
        </p>
      </div>

      {/* Content */}
      <div className="relative flex-1 -mt-2">
        <div className="max-w-lg mx-auto px-4 pb-12 space-y-3">

          {/* Main card */}
          <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden">
            {/* Event info */}
            <div className="p-5 space-y-4 border-b border-[#141414]">
              <InfoBlock label="Événement">
                <p className="text-base font-bold text-white">{event.name}</p>
                <p className="text-sm text-[#666] capitalize">{date}</p>
                <p className="text-sm text-[#555]">{event.timeInfo}</p>
              </InfoBlock>

              {tableDetail && (
                <InfoBlock label="Emplacement">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    Table {getTableLabel(tableDetail.rowNumber, tableDetail.tableNumber)}
                    {tableDetail.isVip && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30 uppercase tracking-wider">
                        VIP ★
                      </span>
                    )}
                  </p>
                </InfoBlock>
              )}

              <InfoBlock label="Contact">
                <p className="text-sm text-white">{reservation.referentStudent}</p>
                <p className="text-sm text-[#666]">{reservation.email}</p>
              </InfoBlock>
            </div>

            {/* Guests */}
            <div>
              <div className="px-5 py-3 bg-[#141414] border-b border-[#1a1a1a]">
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Convives</p>
              </div>
              <div className="divide-y divide-[#0f0f0f]">
                {resSeats.map((guest) => {
                  const seat = seatDetails.find((s) => s.id === guest.seatId);
                  const meal = MEAL_OPTIONS.find((m) => m.value === guest.mealChoice);
                  return (
                    <div key={guest.id} className="px-5 py-3 flex items-center justify-between bg-[#0a0a0a]">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {guest.firstName} {guest.lastName}
                          {seat && (
                            <span className="text-[#444] ml-1.5 text-xs font-mono">
                              {getSeatLabel(seat.seatNumber)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#555]">
                          {meal?.label || guest.mealChoice}
                          {guest.hasDessert && (
                            <span className="text-[#c9a227]/70"> + {DESSERT_LABEL}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upsells */}
            {upsells.length > 0 && (
              <div className="border-t border-[#141414] px-5 py-3 space-y-1.5 bg-[#0a0a0a]">
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Extras</p>
                {upsells.map((u) => {
                  const option = UPSELL_OPTIONS.find((o) => o.type === u.upsellType);
                  return (
                    <div key={u.id} className="flex justify-between text-sm">
                      <span className="text-[#888]">
                        {option?.label || u.upsellType} ×{u.quantity}
                      </span>
                      <span className="text-white font-medium tabular-nums">
                        {((u.unitPrice * u.quantity) / 100).toFixed(2)}€
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#1a1400] to-[#141000] border-t border-[#c9a227]/15 flex justify-between items-center">
              <span className="text-sm text-[#666]">Total payé</span>
              <span className="text-2xl font-extrabold text-[#c9a227] tabular-nums">
                {(reservation.totalAmount / 100).toFixed(2)}€
              </span>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-[#555] hover:text-[#c9a227] transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-1.5">{label}</p>
      {children}
    </div>
  );
}
