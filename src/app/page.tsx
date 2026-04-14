import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ReservationEntryGate } from "@/components/ReservationEntryGate";
import { RESERVATION_ENTRY_COOKIE } from "@/lib/reservation-entry";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  if (cookieStore.get(RESERVATION_ENTRY_COOKIE)?.value !== "1") {
    return <ReservationEntryGate />;
  }

  const activeEvents = await db
    .select()
    .from(events)
    .where(eq(events.isActive, true));

  const byDate = new Map<string, typeof activeEvents>();
  for (const ev of activeEvents) {
    const key = ev.eventDate;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(ev);
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-[#0a0a0a]">

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#c9a227]/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-lg mx-auto px-5 pt-14 pb-12 text-center">
          {/* Logo icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c9a227] to-[#a07818] mb-5 shadow-xl shadow-[#c9a227]/25">
            <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#c9a227]/70 mb-2">
            Spectacles de danse
          </p>
          <h1 className="text-5xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-[#e4c76b] via-[#c9a227] to-[#a07818] bg-clip-text text-transparent">
              Cmotion
            </span>
          </h1>
          <p className="text-sm text-[#666] max-w-xs mx-auto">
            Réservez vos places en quelques clics
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#c9a227]/20 to-transparent mx-4" />

      {/* Events */}
      <section className="flex-1">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
          {activeEvents.length === 0 ? (
            <div className="text-center py-16 bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e]">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              </div>
              <p className="text-[#555] text-sm">
                Aucun spectacle disponible pour le moment.
              </p>
            </div>
          ) : (
            <>
              {[...byDate.entries()].map(([dateStr, dateEvents]) => {
                const d = new Date(dateStr);
                const dayName = d.toLocaleDateString("fr-FR", { weekday: "long" });
                const dayNum = d.toLocaleDateString("fr-FR", { day: "numeric" });
                const month = d.toLocaleDateString("fr-FR", { month: "long" });
                const year = d.getFullYear();
                const isPlus12 = dateEvents[0]?.ageGroup === "+12";

                return (
                  <div key={dateStr} className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden">
                    {/* Date header */}
                    <div className="flex items-center gap-4 px-4 pt-4 pb-3">
                      {/* Calendar block */}
                      <div className="shrink-0 w-14 text-center rounded-xl overflow-hidden shadow-md shadow-black/40">
                        <div className="py-0.5 text-[9px] font-black uppercase tracking-widest text-black bg-gradient-to-r from-[#c9a227] to-[#e4c76b]">
                          {month}
                        </div>
                        <div className="bg-[#1a1500] py-1.5 border-x border-b border-[#c9a227]/20">
                          <div className="text-2xl font-extrabold leading-none text-[#c9a227]">
                            {dayNum}
                          </div>
                          <div className="text-[9px] text-[#666] font-medium mt-0.5">
                            {year}
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30">
                          {isPlus12 ? "+12 ans" : "−12 ans"}
                        </span>
                        <p className="text-sm font-semibold text-white capitalize">
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
                          <div className="bg-[#141414] hover:bg-[#1a1500] border border-[#2a2a2a] hover:border-[#c9a227]/30 rounded-xl p-3.5 transition-all duration-150 active:scale-[0.97]">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-9 h-9 rounded-lg bg-[#c9a227]/10 flex items-center justify-center">
                                <svg className="w-4.5 h-4.5 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className="text-xl font-extrabold tabular-nums text-[#c9a227]">
                                {event.timeInfo}
                              </span>
                            </div>
                            <div className="w-full py-2 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black text-[12px] font-bold text-center shadow-md shadow-[#c9a227]/20 group-hover:shadow-[#c9a227]/30 transition-all">
                              Réserver
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* VIP */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1500] to-[#0f0c00] border border-[#c9a227]/25 p-4">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a227]/8 rounded-full -translate-y-8 translate-x-8 blur-xl pointer-events-none" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-3">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      VIP
                    </div>
                    <div className="text-2xl font-extrabold text-[#c9a227] leading-none mb-0.5">280€</div>
                    <div className="text-[11px] text-[#c9a227]/50 font-medium">table de 8 pers.</div>
                    <div className="mt-3 space-y-1.5">
                      {["Rangs 1 – 3", "Une bouteille de bulle par table", "Repas et Dessert inclus", "Zakouski"].map((f) => (
                        <div key={f} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c9a227] shrink-0" />
                          <span className="text-[11px] text-[#888]">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Normal */}
                <div className="relative overflow-hidden rounded-2xl bg-[#0f0f0f] border border-[#1e1e1e] p-4">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full -translate-y-8 translate-x-8 blur-xl pointer-events-none" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-1.5 bg-[#1e1e1e] text-[#aaa] text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-3 border border-[#2a2a2a]">
                      Normal
                    </div>
                    <div className="flex items-baseline gap-0.5 mb-0.5">
                      <span className="text-[13px] text-[#555] font-medium">dès</span>
                      <span className="text-2xl font-extrabold text-white leading-none ml-1">28€</span>
                    </div>
                    <div className="text-[11px] text-[#555] font-medium">par siège</div>
                    <div className="mt-3 space-y-1.5">
                      {["Rangs 4 – 9", "1 à 8 sièges", "Repas au choix"].map((f) => (
                        <div key={f} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#444] shrink-0" />
                          <span className="text-[11px] text-[#666]">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
