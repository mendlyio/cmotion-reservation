"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  eventId: number;
  isActive: boolean;
}

export function EventToggleButton({ eventId, isActive: initialActive }: Props) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { isActive: newState } = await res.json();
      setActive(newState);
      toast.success(newState ? "Spectacle ouvert aux réservations" : "Spectacle fermé");
      router.refresh();
    } catch {
      toast.error("Erreur lors du changement de statut");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={active ? "Fermer les réservations" : "Ouvrir les réservations"}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
        active
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
          : "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
      }`}
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
      )}
      {active ? "Ouvert" : "Fermé"}
    </button>
  );
}
