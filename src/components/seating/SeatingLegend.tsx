"use client";

const LEGEND_ITEMS = [
  { color: "#22c55e", label: "Libre" },
  { color: "#3b82f6", label: "Votre sélection" },
  { color: "#a855f7", label: "En cours" },
  { color: "#ef4444", label: "Réservé" },
];

export function SeatingLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-3">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[11px] text-slate-500">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-amber-500 bg-white" />
        <span className="text-[11px] text-slate-500">VIP</span>
      </div>
    </div>
  );
}
