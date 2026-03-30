import { MEAL_OPTIONS, DANCER_MEAL_OPTIONS, DESSERT_LABEL } from "@/types";

interface Guest {
  firstName: string;
  lastName: string;
  mealChoice: string;
  hasDessert: boolean;
  placement: string;
}

interface DancerMeal {
  mealChoice: string | null;
  quantity: number;
}

export interface Enveloppe {
  reservationId: number;
  referentStudent: string;
  tableInfo: string;
  isVip: boolean;
  guests: Guest[];
  dancerMeals: DancerMeal[];
}

interface Props {
  envelopes: Enveloppe[];
}

export function EnveloppeView({ envelopes }: Props) {
  if (envelopes.length === 0) {
    return <p className="text-[#555] text-sm py-8 text-center">Aucune réservation payée.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {envelopes.map((env) => {
        const mealTotals: Record<string, number> = {};
        let dessertTotal = 0;
        for (const g of env.guests) {
          mealTotals[g.mealChoice] = (mealTotals[g.mealChoice] || 0) + 1;
          if (g.hasDessert) dessertTotal++;
        }

        const dancerTotals: Record<string, number> = {};
        for (const dm of env.dancerMeals) {
          if (dm.mealChoice) {
            dancerTotals[dm.mealChoice] = (dancerTotals[dm.mealChoice] || 0) + dm.quantity;
          }
        }

        return (
          <div key={env.reservationId} className="border border-[#1e1a0e] rounded-2xl overflow-hidden bg-[#0f0f0f]">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1c1600] to-[#111000] px-5 py-4 flex items-start justify-between border-b border-[#c9a227]/20">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-bold text-base">{env.referentStudent}</span>
                  {env.isVip && (
                    <span className="text-[9px] bg-[#c9a227]/15 text-[#c9a227] px-2 py-0.5 rounded-full font-bold border border-[#c9a227]/30">VIP</span>
                  )}
                </div>
                <p className="text-[#666] text-[11px]">Table {env.tableInfo} · Rés. #{env.reservationId}</p>
              </div>
              <div className="text-[#555] text-xs">{env.guests.length} convive{env.guests.length > 1 ? "s" : ""}</div>
            </div>

            <div className="p-4 space-y-4">
              {/* Liste des convives */}
              <div>
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Tickets Repas</p>
                <div className="space-y-1.5">
                  {env.guests.map((g, i) => {
                    const meal = MEAL_OPTIONS.find((m) => m.value === g.mealChoice);
                    return (
                      <div key={i} className="flex items-center justify-between bg-[#141414] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 h-5 px-1.5 rounded bg-[#1c1600] border border-[#c9a227]/30 text-[#c9a227] text-[10px] font-bold flex items-center justify-center tracking-wide">
                            {g.placement}
                          </span>
                          <span className="text-sm font-medium text-white">{g.firstName} {g.lastName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#666]">{meal?.label || g.mealChoice}</span>
                          {g.hasDessert && (
                            <span className="text-[10px] bg-[#c9a227]/15 text-[#c9a227] px-1.5 py-0.5 rounded font-semibold">+ {DESSERT_LABEL}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Récap places */}
              <div>
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Récap Places</p>
                <div className="space-y-1">
                  {env.guests.map((g, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg px-3 py-1.5">
                      <span className="text-sm text-white font-medium">{g.firstName} {g.lastName}</span>
                      <span className="shrink-0 h-5 px-2 rounded bg-[#1c1600] border border-[#c9a227]/30 text-[#c9a227] text-[10px] font-bold flex items-center justify-center tracking-wide ml-2">
                        {g.placement}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Récapitulatif tickets */}
              <div>
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Récap Tickets</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(mealTotals).map(([mc, count]) => {
                    const meal = MEAL_OPTIONS.find((m) => m.value === mc);
                    return (
                      <div key={mc} className="flex items-center justify-between bg-[#0a0a14] border border-blue-500/15 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-blue-300/70 font-medium truncate">{meal?.label || mc}</span>
                        <span className="text-sm font-bold text-blue-200 ml-1">×{count}</span>
                      </div>
                    );
                  })}
                  {dessertTotal > 0 && (
                    <div className="flex items-center justify-between bg-[#1a1500] border border-[#c9a227]/20 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-[#c9a227]/70 font-medium">{DESSERT_LABEL}</span>
                      <span className="text-sm font-bold text-[#c9a227]">×{dessertTotal}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Repas danseur */}
              {Object.keys(dancerTotals).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Repas Danseur</p>
                  <div className="space-y-1">
                    {Object.entries(dancerTotals).map(([mc, count]) => {
                      const opt = DANCER_MEAL_OPTIONS.find((o) => o.value === mc);
                      return (
                        <div key={mc} className="flex items-center justify-between bg-[#100e1a] border border-purple-500/20 rounded-lg px-3 py-1.5">
                          <span className="text-xs text-purple-300/70 font-medium">{opt?.label || mc}</span>
                          <span className="text-sm font-bold text-purple-200">×{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
