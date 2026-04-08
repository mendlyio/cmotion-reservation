"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  enabled: boolean;
}

export function HelpWidgetToggle({ enabled: initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpWidgetEnabled: !enabled }),
      });
      if (!res.ok) throw new Error();
      const { helpWidgetEnabled } = await res.json();
      setEnabled(helpWidgetEnabled);
      toast.success(helpWidgetEnabled ? "Widget d'aide activé" : "Widget d'aide désactivé");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={enabled ? "Désactiver le widget d'aide" : "Activer le widget d'aide"}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
        enabled
          ? "bg-[#c9a227]/15 border-[#c9a227]/30 text-[#c9a227] hover:bg-[#c9a227]/25"
          : "bg-[#1a1a1a] border-[#2a2a2a] text-[#555] hover:border-[#c9a227]/20 hover:text-[#888]"
      }`}
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      )}
      Aide {enabled ? "ON" : "OFF"}
    </button>
  );
}
