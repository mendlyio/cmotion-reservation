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
    <main className="flex-1">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Cmotion
          </h1>
          <p className="text-xl text-slate-500">
            Réservez vos places pour nos spectacles de danse
          </p>
        </div>

        {activeEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <p className="text-slate-500">
              Aucun spectacle disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeEvents.map((event) => {
              const date = new Date(event.eventDate).toLocaleDateString(
                "fr-FR",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              );
              const isPlus12 = event.ageGroup === "+12";

              return (
                <Link
                  key={event.id}
                  href={`/reservation/${event.id}`}
                  className="group"
                >
                  <div
                    className={`relative overflow-hidden rounded-2xl border-2 p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                      isPlus12
                        ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:border-blue-400"
                        : "border-pink-200 bg-gradient-to-br from-pink-50 to-white hover:border-pink-400"
                    }`}
                  >
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                        isPlus12
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {event.ageGroup === "+12"
                        ? "Élèves +12 ans"
                        : "Élèves -12 ans"}
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                      {event.name}
                    </h2>

                    <p className="text-slate-600 mb-1 capitalize">{date}</p>
                    <p className="text-slate-500 text-sm mb-4">
                      Horaires : {event.timeInfo}
                    </p>

                    {event.description && (
                      <p className="text-slate-500 text-sm mb-6">
                        {event.description}
                      </p>
                    )}

                    <div
                      className={`inline-flex items-center gap-2 font-semibold text-sm transition-colors ${
                        isPlus12
                          ? "text-blue-600 group-hover:text-blue-800"
                          : "text-pink-600 group-hover:text-pink-800"
                      }`}
                    >
                      Réserver mes places
                      <svg
                        className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <div className="inline-flex gap-6 text-sm text-slate-400">
            <div>
              <span className="font-semibold text-slate-600">VIP</span> — 280€
              / table de 8
            </div>
            <div>
              <span className="font-semibold text-slate-600">Normal</span> — à
              partir de 28€ / siège
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
