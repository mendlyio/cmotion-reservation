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
    <main className="min-h-screen bg-[#0d0d1a] flex flex-col">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center pt-16 pb-10 px-5 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,40,200,0.25),transparent)]" />

        <div className="relative z-10 space-y-3">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-purple-400/70">
            Spectacles de danse
          </p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white">
            Cmotion
          </h1>
          <p className="text-sm text-white/30 max-w-xs mx-auto">
            Réservez vos places en quelques clics
          </p>
        </div>
      </div>

      {/* Event cards */}
      <div className="flex-1 px-4 pb-12 max-w-md mx-auto w-full space-y-3">
        {activeEvents.length === 0 ? (
          <div className="text-center py-12 text-white/20 text-sm">
            Aucun spectacle disponible.
          </div>
        ) : (
          activeEvents.map((event) => {
            const isPlus12 = event.ageGroup === "+12";

            // Parse date parts
            const d = new Date(event.eventDate);
            const day = d.toLocaleDateString("fr-FR", { weekday: "long" });
            const dayNum = d.getDate();
            const month = d.toLocaleDateString("fr-FR", { month: "long" });
            const year = d.getFullYear();

            // Parse times from timeInfo (e.g. "11h et 17h30")
            const times = event.timeInfo.split(/\s*et\s*/);

            return (
              <Link key={event.id} href={`/reservation/${event.id}`} className="block group">
                <div className={`relative overflow-hidden rounded-2xl border transition-all duration-200 active:scale-[0.98] group-hover:scale-[1.01] ${
                  isPlus12
                    ? "bg-gradient-to-br from-[#0f1629] to-[#0a0f1e] border-blue-900/40 group-hover:border-blue-700/60"
                    : "bg-gradient-to-br from-[#1a0f1a] to-[#120a12] border-rose-900/40 group-hover:border-rose-700/60"
                }`}>
                  {/* Top accent line */}
                  <div className={`absolute inset-x-0 top-0 h-px ${isPlus12 ? "bg-gradient-to-r from-transparent via-blue-500 to-transparent" : "bg-gradient-to-r from-transparent via-rose-500 to-transparent"}`} />

                  <div className="p-5 sm:p-6">
                    {/* Age badge */}
                    <div className="flex items-center justify-between mb-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${
                        isPlus12
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        <span className="text-base leading-none">{isPlus12 ? "＋" : "－"}</span>
                        12 ans
                      </span>

                      {/* CTA arrow */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isPlus12
                          ? "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white"
                          : "bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white"
                      }`}>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Date — big & visual */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white tabular-nums leading-none">{dayNum}</span>
                        <div>
                          <p className="text-white font-bold text-base capitalize leading-tight">{month} {year}</p>
                          <p className="text-white/30 text-xs capitalize">{day}</p>
                        </div>
                      </div>
                    </div>

                    {/* Times as pills */}
                    <div className="flex flex-wrap gap-2">
                      {times.map((t, i) => (
                        <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
                          isPlus12
                            ? "bg-blue-500/8 text-blue-300"
                            : "bg-rose-500/8 text-rose-300"
                        }`}>
                          <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-center backdrop-blur-sm">
            <div className="text-purple-400 font-black text-xl mb-1">VIP</div>
            <div className="text-white/30 text-xs">280€ · table de 8</div>
            <div className="text-white/15 text-[10px] mt-1">bulles · zakouski inclus</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-center backdrop-blur-sm">
            <div className="text-white/70 font-black text-xl mb-1">Normal</div>
            <div className="text-white/30 text-xs">dès 28€ · par siège</div>
            <div className="text-white/15 text-[10px] mt-1">repas inclus</div>
          </div>
        </div>
      </div>
    </main>
  );
}
