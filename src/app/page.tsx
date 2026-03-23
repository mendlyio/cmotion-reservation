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
            <div className="space-y-3">
              {activeEvents.map((event) => {
                const d = new Date(event.eventDate);
                const dayName = d.toLocaleDateString("fr-FR", { weekday: "long" });
                const dayNum = d.toLocaleDateString("fr-FR", { day: "numeric" });
                const month = d.toLocaleDateString("fr-FR", { month: "long" });
                const year = d.getFullYear();
                const isPlus12 = event.ageGroup === "+12";
                const color = isPlus12
                  ? { bg: "bg-[#eef4ff]", accent: "#3b82f6", badge: "bg-blue-500 text-white", ring: "hover:ring-blue-300" }
                  : { bg: "bg-[#fff0f3]", accent: "#f43f5e", badge: "bg-rose-500 text-white", ring: "hover:ring-rose-300" };

                // Split "11h et 17h30" into individual time pills
                const slots = event.timeInfo.split(/\s+et\s+/i).map((s) => s.trim());

                return (
                  <Link key={event.id} href={`/reservation/${event.id}`} className="block group">
                    <div className={`relative overflow-hidden rounded-2xl ${color.bg} ring-1 ring-black/5 hover:ring-2 ${color.ring} transition-all duration-200 active:scale-[0.98] p-5`}>

                      <div className="flex items-center gap-4">
                        {/* Calendar block */}
                        <div className="flex-shrink-0 w-14 text-center">
                          <div className="rounded-xl overflow-hidden shadow-sm">
                            <div className="py-0.5 text-white text-[10px] font-bold uppercase tracking-wider" style={{ background: color.accent }}>
                              {month}
                            </div>
                            <div className="bg-white py-1.5">
                              <div className="text-2xl font-extrabold leading-none" style={{ color: color.accent }}>
                                {dayNum}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">{year}</div>
                            </div>
                          </div>
                        </div>

                        {/* Info — fills available space */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.badge}`}>
                              {isPlus12 ? "+12 ans" : "−12 ans"}
                            </span>
                            <span className="text-[12px] font-semibold text-slate-600 capitalize">{dayName}</span>
                          </div>

                          {/* Time slots as pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {slots.map((slot) => (
                              <span
                                key={slot}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/80 text-[12px] font-bold tabular-nums shadow-sm"
                                style={{ color: color.accent }}
                              >
                                <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {slot}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* CTA button */}
                        <div
                          className="flex-shrink-0 px-4 py-2 rounded-xl text-white text-[12px] font-bold shadow-md transition-all group-hover:shadow-lg group-hover:scale-[1.03] active:scale-[0.97]"
                          style={{ background: color.accent }}
                        >
                          Réserver
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
