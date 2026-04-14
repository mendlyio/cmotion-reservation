"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReservationEntryGate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ready", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Réessayez dans un instant.");
        return;
      }
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez le réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-[#0a0a0a] items-center justify-center px-5 py-16">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[280px] bg-[#c9a227]/6 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-md w-full rounded-2xl border border-[#1e1a0e] bg-[#0f0f0f]/90 backdrop-blur-sm p-8 shadow-xl shadow-black/40">
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c9a227] to-[#a07818] shadow-lg shadow-[#c9a227]/20">
            <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        </div>

        <h1 className="text-center text-xl font-bold text-white mb-2">
          Cmotion — réservation
        </h1>
        <p className="text-center text-sm text-[#888] leading-relaxed mb-6">
          Pour afficher les spectacles et ouvrir la réservation, confirmez que vous êtes bien présent.
          Au premier chargement après une pause, cela peut prendre quelques secondes.
        </p>

        {error ? (
          <p className="text-center text-sm text-red-400 mb-4" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="default"
          className="w-full h-11 text-base font-semibold bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black border-0 hover:opacity-95"
          disabled={loading}
          onClick={onContinue}
        >
          {loading ? "Connexion…" : "Voir les spectacles"}
        </Button>
      </div>
    </main>
  );
}
