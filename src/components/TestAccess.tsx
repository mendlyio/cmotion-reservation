"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function TestAccess() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setPassword("");
        if (res.status === 429) setError("Trop de tentatives. Réessayez plus tard.");
        else if (res.status === 503) setError("Accès test indisponible.");
        else setError("Mot de passe incorrect");
        return;
      }
      setPassword("");
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez le réseau.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-[#444] underline-offset-2 hover:text-[#888] hover:underline"
      >
        Accès test
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[220px] space-y-2 text-left">
      <label htmlFor="test-access-password" className="block text-[11px] text-[#666]">
        Accès test
      </label>
      <input
        id="test-access-password"
        type="password"
        name="password"
        autoComplete="current-password"
        autoCapitalize="off"
        spellCheck={false}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        className="w-full h-9 px-3 rounded-lg bg-[#141414] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-[#c9a227]"
      />
      {error ? (
        <p className="text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-8 rounded-lg text-[11px] font-semibold text-[#111] bg-[#c9a227] disabled:opacity-50"
      >
        {loading ? "Vérification…" : "Entrer"}
      </button>
    </form>
  );
}
