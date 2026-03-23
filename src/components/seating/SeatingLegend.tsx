"use client";

const LEGEND_ITEMS = [
  { color: "#22c55e", label: "Disponible" },
  { color: "#3b82f6", label: "Sélectionné" },
  { color: "#a855f7", label: "En cours de réservation" },
  { color: "#ef4444", label: "Réservé" },
  { color: "#d97706", label: "VIP", isStroke: true },
];

export function SeatingLegend() {
  return (
    <div className="flex flex-wrap gap-4 justify-center mb-4 p-3 bg-slate-50 rounded-lg">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          {item.isStroke ? (
            <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-white" />
          ) : (
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="text-slate-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
