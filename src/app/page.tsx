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

  // Group events by date
  const byDate = new Map<string, typeof activeEvents>();
  for (const ev of activeEvents) {
    const key = ev.eventDate;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(ev);
  }

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
            <div className="space-y-5">
              {[...byDate.entries()].map(([dateStr, dateEvents]) => {
                const d = new Date(dateStr);
                const dayName = d.toLocaleDateString("fr-FR", { weekday: "long" });
                const dayNum = d.toLocaleDateString("fr-FR", { day: "numeric" });
                const month = d.toLocaleDateString("fr-FR", { month: "long" });
                const year = d.getFullYear();
                const isPlus12 = dateEvents[0]?.ageGroup === "+12";
                const color = isPlus12
                  ? { bg: "bg-[#eef4ff]", accent: "#3b82f6", badge: "bg-blue-500 text-white", ring: "ring-blue-200/50" }
                  : { bg: "bg-[#fff0f3]", accent: "#f43f5e", badge: "bg-rose-500 text-white", ring: "ring-rose-200/50" };

                return (
                  <div key={dateStr} className={`rounded-2xl ${color.bg} ring-1 ${color.ring} overflow-hidden`}>
                    {/* Date header */}
                    <div className="flex items-center gap-4 p-4 pb-3">
                      {/* Calendar block */}
                      <div className="flex-shrink-0 w-14 text-center">
                        <div className="rounded-xl overflow-hidden shadow-sm">
                          <div
                            className="py-0.5 text-white text-[10px] font-bold uppercase tracking-wider"
                            style={{ background: color.accent }}
                          >
                            {month}
                          </div>
                          <div className="bg-white py-1.5">
                            <div
                              className="text-2xl font-extrabold leading-none"
                              style={{ color: color.accent }}
                            >
                              {dayNum}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {year}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Date info */}
                      <div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${color.badge}`}
                        >
                          {isPlus12 ? "+12 ans" : "−12 ans"}
                        </span>
                        <p className="text-[13px] font-semibold text-slate-700 capitalize">
                          {dayName} {dayNum} {month}
                        </p>
                      </div>
                    </div>

                    {/* Time slots */}
                    <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                      {dateEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={`/reservation/${event.id}`}
                          className="block group"
                        >
                          <div className="bg-white rounded-xl p-3.5 shadow-sm ring-1 ring-black/5 hover:ring-2 hover:shadow-md transition-all duration-150 active:scale-[0.97]"
                            style={{ ["--tw-ring-color" as string]: color.accent + "40" }}
                          >
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center"
                                style={{ background: color.accent + "12" }}
                              >
                                <svg
                                  className="w-4.5 h-4.5"
                                  style={{ color: color.accent }}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <span
                                className="text-xl font-extrabold tabular-nums"
                                style={{ color: color.accent }}
                              >
                                {event.timeInfo}
                              </span>
                            </div>
                            <div
                              className="w-full py-2 rounded-lg text-white text-[12px] font-bold text-center shadow-sm transition-all group-hover:shadow-md group-hover:scale-[1.02]"
                              style={{ background: color.accent }}
                            >
                              Réserver
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
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
