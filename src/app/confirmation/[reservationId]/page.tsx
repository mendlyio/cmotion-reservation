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
import { MEAL_OPTIONS, UPSELL_OPTIONS } from "@/types";

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
      .select({
        id: seats.id,
        tableId: seats.tableId,
        seatNumber: seats.seatNumber,
      })
      .from(seats)
      .where(inArray(seats.id, seatIds));
  }

  const tableIds = [...new Set(seatDetails.map((s) => s.tableId))];
  let tableDetail: {
    id: number;
    rowNumber: number;
    tableNumber: number;
    isVip: boolean;
  } | null = null;
  if (tableIds.length > 0) {
    const [t] = await db
      .select({
        id: tables.id,
        rowNumber: tables.rowNumber,
        tableNumber: tables.tableNumber,
        isVip: tables.isVip,
      })
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
    <main className="flex-1 flex flex-col">
      {/* Status header */}
      <div
        className={`pt-12 pb-8 px-5 text-center ${
          isPaid
            ? "bg-gradient-to-b from-emerald-500 to-emerald-600"
            : "bg-gradient-to-b from-amber-400 to-amber-500"
        }`}
      >
        <div
          className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
            isPaid ? "bg-white/20" : "bg-white/20"
          }`}
        >
          {isPaid ? (
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        <h1 className="text-xl font-extrabold text-white mb-1">
          {isPaid ? "Réservation confirmée" : "Paiement en attente"}
        </h1>
        <p className="text-sm text-white/70">
          #{reservation.id}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 -mt-3 relative z-10">
        <div className="max-w-lg mx-auto px-4 pb-10">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Event info */}
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Événement
                </p>
                <p className="text-base font-bold text-slate-900">
                  {event.name}
                </p>
                <p className="text-sm text-slate-500 capitalize">{date}</p>
                <p className="text-sm text-slate-400">{event.timeInfo}</p>
              </div>

              {tableDetail && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                    Emplacement
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    Table {tableDetail.rowNumber}-{tableDetail.tableNumber}
                    {tableDetail.isVip && (
                      <span className="ml-1.5 text-amber-500">★ VIP</span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Contact
                </p>
                <p className="text-sm text-slate-700">
                  {reservation.referentStudent}
                </p>
                <p className="text-sm text-slate-500">{reservation.email}</p>
              </div>
            </div>

            {/* Guests */}
            <div className="border-t">
              <div className="px-5 py-2.5 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Convives
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {resSeats.map((guest) => {
                  const seat = seatDetails.find(
                    (s) => s.id === guest.seatId
                  );
                  const meal = MEAL_OPTIONS.find(
                    (m) => m.value === guest.mealChoice
                  );
                  return (
                    <div
                      key={guest.id}
                      className="px-5 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {guest.firstName} {guest.lastName}
                          {seat && (
                            <span className="text-slate-300 ml-1.5 text-xs">
                              S{seat.seatNumber}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          {meal?.label || guest.mealChoice}
                          {guest.hasDessert && " + Tiramisu"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upsells */}
            {upsells.length > 0 && (
              <div className="border-t px-5 py-3 space-y-1">
                {upsells.map((u) => {
                  const option = UPSELL_OPTIONS.find(
                    (o) => o.type === u.upsellType
                  );
                  return (
                    <div
                      key={u.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600">
                        {option?.label || u.upsellType} ×{u.quantity}
                      </span>
                      <span className="text-slate-800 font-medium">
                        {((u.unitPrice * u.quantity) / 100).toFixed(2)}€
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <div className="px-5 py-4 bg-slate-900 flex justify-between items-center">
              <span className="text-sm text-slate-400">Total</span>
              <span className="text-2xl font-extrabold text-white">
                {(reservation.totalAmount / 100).toFixed(2)}€
              </span>
            </div>
          </div>

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
