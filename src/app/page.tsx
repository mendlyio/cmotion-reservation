import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const activeEvents = await db
    .select()
    .from(events)
    .where(eq(events.isActive, true));

  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(148,163,184,0.15),transparent_70%)]" />
        <div className="relative max-w-lg mx-auto px-5 pt-14 pb-10 sm:pt-20 sm:pb-14 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-400 mb-3">
            Spectacles de danse
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Cmotion
          </h1>
          <p className="text-base text-slate-400 max-w-xs mx-auto">
            Réservez vos places en quelques clics
          </p>
        </div>
      </section>

      {/* Events */}
      <section className="flex-1 -mt-4 relative z-10">
        <div className="max-w-lg mx-auto px-4 pb-10">
          {activeEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border">
              <p className="text-slate-400 text-sm">
                Aucun spectacle disponible pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeEvents.map((event) => {
                const date = new Date(event.eventDate).toLocaleDateString(
                  "fr-FR",
                  { weekday: "long", day: "numeric", month: "long" }
                );
                const isPlus12 = event.ageGroup === "+12";

                return (
                  <Link
                    key={event.id}
                    href={`/reservation/${event.id}`}
                    className="block group"
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all duration-200 active:scale-[0.98] hover:shadow-md hover:border-slate-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-3 ${
                              isPlus12
                                ? "bg-blue-50 text-blue-600"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {isPlus12 ? "+12 ans" : "-12 ans"}
                          </div>

                          <h2 className="text-lg font-bold text-slate-900 mb-1">
                            {event.name}
                          </h2>

                          <p className="text-sm text-slate-500 capitalize">
                            {date}
                          </p>
                          <p className="text-sm text-slate-400">
                            {event.timeInfo}
                          </p>
                        </div>

                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isPlus12
                              ? "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                              : "bg-rose-50 text-rose-600 group-hover:bg-rose-100"
                          }`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pricing hint */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-amber-500 text-lg font-bold mb-0.5">
                VIP
              </div>
              <div className="text-xs text-slate-400">
                280€ / table de 8
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-slate-800 text-lg font-bold mb-0.5">
                Normal
              </div>
              <div className="text-xs text-slate-400">
                dès 28€ / siège
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
