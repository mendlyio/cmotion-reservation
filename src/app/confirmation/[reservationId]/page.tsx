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
      .select({ id: seats.id, tableId: seats.tableId, seatNumber: seats.seatNumber })
      .from(seats)
      .where(inArray(seats.id, seatIds));
  }

  const tableIds = [...new Set(seatDetails.map((s) => s.tableId))];
  let tableDetails: { id: number; rowNumber: number; tableNumber: number; isVip: boolean }[] = [];
  if (tableIds.length > 0) {
    tableDetails = await db
      .select({
        id: tables.id,
        rowNumber: tables.rowNumber,
        tableNumber: tables.tableNumber,
        isVip: tables.isVip,
      })
      .from(tables)
      .where(inArray(tables.id, tableIds));
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

  const table = tableDetails[0];

  return (
    <main className="flex-1">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div
            className={`p-8 text-center ${
              isPaid
                ? "bg-gradient-to-br from-green-50 to-emerald-50"
                : "bg-gradient-to-br from-amber-50 to-yellow-50"
            }`}
          >
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                isPaid ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              {isPaid ? (
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {isPaid ? "Réservation confirmée !" : "Paiement en attente"}
            </h1>
            <p className="text-slate-600">
              Réservation #{reservation.id}
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <h2 className="font-semibold text-slate-800 mb-2">Événement</h2>
              <p className="text-slate-700">{event.name}</p>
              <p className="text-slate-500 text-sm capitalize">{date}</p>
              <p className="text-slate-500 text-sm">
                Horaires : {event.timeInfo}
              </p>
            </div>

            {table && (
              <div>
                <h2 className="font-semibold text-slate-800 mb-2">
                  Emplacement
                </h2>
                <p className="text-slate-700">
                  Table {table.rowNumber}-{table.tableNumber}
                  {table.isVip && (
                    <span className="ml-2 text-amber-600 text-sm font-semibold">
                      ★ VIP
                    </span>
                  )}
                </p>
              </div>
            )}

            <div>
              <h2 className="font-semibold text-slate-800 mb-2">Convives</h2>
              <div className="space-y-2">
                {resSeats.map((guest) => {
                  const seat = seatDetails.find((s) => s.id === guest.seatId);
                  const meal = MEAL_OPTIONS.find(
                    (m) => m.value === guest.mealChoice
                  );
                  return (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                    >
                      <div>
                        <span className="font-medium">
                          {guest.firstName} {guest.lastName}
                        </span>
                        {seat && (
                          <span className="text-slate-400 ml-2">
                            (Siège {seat.seatNumber})
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500">
                        {meal?.label || guest.mealChoice}
                        {guest.hasDessert && " + Tiramisu"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {upsells.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-800 mb-2">Extras</h2>
                {upsells.map((u) => {
                  const option = UPSELL_OPTIONS.find(
                    (o) => o.type === u.upsellType
                  );
                  return (
                    <div
                      key={u.id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {option?.label || u.upsellType} ×{u.quantity}
                      </span>
                      <span>
                        {((u.unitPrice * u.quantity) / 100).toFixed(2)}€
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <h2 className="font-semibold text-slate-800 mb-2">Contact</h2>
              <p className="text-sm text-slate-600">
                Élève référent : {reservation.referentStudent}
              </p>
              <p className="text-sm text-slate-600">
                Email : {reservation.email}
              </p>
              {reservation.phone && (
                <p className="text-sm text-slate-600">
                  Tél : {reservation.phone}
                </p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-slate-500 text-sm">Total</p>
              <p className="text-3xl font-bold text-slate-900">
                {(reservation.totalAmount / 100).toFixed(2)}€
              </p>
            </div>
          </div>

          <div className="p-8 pt-0 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
