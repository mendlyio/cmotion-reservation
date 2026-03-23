"use client";

import { useState, useMemo } from "react";
import { MEAL_OPTIONS } from "@/types";
import { toast } from "sonner";

export interface ClientGuest {
  id: number;
  seatId: number;
  seatNumber: number;
  firstName: string;
  lastName: string;
  mealChoice: string;
  hasDessert: boolean;
  adminNotes: string | null;
}

export interface ClientReservation {
  id: number;
  referentStudent: string;
  email: string;
  phone: string | null;
  totalAmount: number;
  stripeStatus: string;
  createdAt: string | null;
  adminNotes: string | null;
  eventId: number;
  eventName: string;
  eventDate: string;
  timeInfo: string;
  tableInfo: string;
  isVip: boolean;
  guests: ClientGuest[];
}

interface Props {
  reservations: ClientReservation[];
  events: { id: number; name: string }[];
}

export function ClientListSection({ reservations, events }: Props) {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingGuests, setEditingGuests] = useState<Record<number, ClientGuest[]>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (eventFilter !== "all" && r.eventId !== eventFilter) return false;
      if (statusFilter !== "all" && r.stripeStatus !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchReservation =
          r.referentStudent.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          `#${r.id}`.includes(q);
        const matchGuest = r.guests.some(
          (g) =>
            g.firstName.toLowerCase().includes(q) ||
            g.lastName.toLowerCase().includes(q)
        );
        if (!matchReservation && !matchGuest) return false;
      }
      return true;
    });
  }, [reservations, eventFilter, statusFilter, search]);

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!editingGuests[id]) {
        const r = reservations.find((res) => res.id === id);
        if (r) {
          setEditingGuests((prev) => ({
            ...prev,
            [id]: r.guests.map((g) => ({ ...g })),
          }));
        }
      }
    }
  };

  const updateGuest = (
    resId: number,
    guestIdx: number,
    field: keyof ClientGuest,
    value: string | boolean
  ) => {
    setEditingGuests((prev) => {
      const guests = [...(prev[resId] || [])];
      guests[guestIdx] = { ...guests[guestIdx], [field]: value };
      return { ...prev, [resId]: guests };
    });
  };

  const handleSave = async (resId: number) => {
    setSavingId(resId);
    try {
      const guests = editingGuests[resId];
      if (!guests) return;

      const res = await fetch(`/api/admin/reservations/${resId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: guests.map((g) => ({
            id: g.id,
            firstName: g.firstName,
            lastName: g.lastName,
            mealChoice: g.mealChoice,
            hasDessert: g.hasDessert,
            adminNotes: g.adminNotes,
          })),
          sendEmail: false,
        }),
      });

      if (res.ok) {
        toast.success(`Réservation #${resId} mise à jour`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAndNotify = async (resId: number) => {
    setSavingId(resId);
    try {
      const guests = editingGuests[resId];
      if (!guests) return;

      const res = await fetch(`/api/admin/reservations/${resId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: guests.map((g) => ({
            id: g.id,
            firstName: g.firstName,
            lastName: g.lastName,
            mealChoice: g.mealChoice,
            hasDessert: g.hasDessert,
            adminNotes: g.adminNotes,
          })),
          sendEmail: true,
        }),
      });

      if (res.ok) {
        toast.success(`Réservation #${resId} mise à jour + email envoyé`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSavingId(null);
    }
  };

  const statusStyles: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-slate-100 text-slate-700",
  };
  const statusLabels: Record<string, string> = {
    paid: "Payé",
    pending: "En attente",
    failed: "Échoué",
    refunded: "Remboursé",
  };

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Liste des clients
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Rechercher par nom, email, n° résa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
          <select
            value={eventFilter === "all" ? "all" : eventFilter}
            onChange={(e) =>
              setEventFilter(
                e.target.value === "all" ? "all" : parseInt(e.target.value)
              )
            }
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="all">Tous les événements</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Payé</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
            <option value="refunded">Remboursé</option>
          </select>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          {filtered.length} réservation{filtered.length > 1 ? "s" : ""} trouvée
          {filtered.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="divide-y">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            Aucune réservation trouvée.
          </div>
        )}

        {filtered.map((r) => {
          const expanded = expandedId === r.id;
          const guests = editingGuests[r.id] || r.guests;
          const date = new Date(r.eventDate).toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });

          return (
            <div key={r.id}>
              <button
                onClick={() => toggleExpand(r.id)}
                className="w-full text-left px-6 py-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">
                        #{r.id}
                      </span>
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {r.referentStudent}
                      </span>
                      {r.isVip && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{r.email}</span>
                      <span>·</span>
                      <span>{r.eventName}</span>
                      <span>·</span>
                      <span>{date}</span>
                      <span>·</span>
                      <span>Table {r.tableInfo}</span>
                      <span>·</span>
                      <span>
                        {r.guests.length} convive
                        {r.guests.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-slate-900 text-sm">
                      {(r.totalAmount / 100).toFixed(0)}€
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[r.stripeStatus] || statusStyles.pending}`}
                    >
                      {statusLabels[r.stripeStatus] || r.stripeStatus}
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="px-6 pb-6 bg-slate-50/50">

                  {/* Contact info */}
                  <div className="flex flex-wrap gap-4 py-3 mb-2 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{r.email}</span>
                    </div>
                    {r.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{r.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(r.eventDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {r.timeInfo}</span>
                    </div>
                    {r.createdAt && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>Résa le {new Date(r.createdAt).toLocaleDateString("fr-FR")} à {new Date(r.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                  </div>

                  {/* Admin notes on reservation */}
                  {r.adminNotes && (
                    <div className="flex items-start gap-2 px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <p className="text-xs text-amber-700">{r.adminNotes}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {guests.map((g, gIdx) => {
                      return (
                        <div
                          key={g.id}
                          className="bg-white rounded-lg border p-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-slate-400">
                              Siège {g.seatNumber}
                            </span>
                            <span className="text-xs text-slate-300">—</span>
                            <span className="text-sm font-medium text-slate-700">
                              {g.firstName} {g.lastName}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Prénom
                              </label>
                              <input
                                type="text"
                                value={g.firstName}
                                onChange={(e) =>
                                  updateGuest(
                                    r.id,
                                    gIdx,
                                    "firstName",
                                    e.target.value
                                  )
                                }
                                className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Nom
                              </label>
                              <input
                                type="text"
                                value={g.lastName}
                                onChange={(e) =>
                                  updateGuest(
                                    r.id,
                                    gIdx,
                                    "lastName",
                                    e.target.value
                                  )
                                }
                                className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Repas
                              </label>
                              <select
                                value={g.mealChoice}
                                onChange={(e) =>
                                  updateGuest(
                                    r.id,
                                    gIdx,
                                    "mealChoice",
                                    e.target.value
                                  )
                                }
                                className="w-full h-9 px-2 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                              >
                                {MEAL_OPTIONS.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Dessert
                              </label>
                              <label className="flex items-center gap-2 h-9 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={g.hasDessert}
                                  onChange={(e) =>
                                    updateGuest(
                                      r.id,
                                      gIdx,
                                      "hasDessert",
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-slate-300"
                                />
                                <span className="text-sm text-slate-700">
                                  Tiramisu
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                    <a
                      href={`/admin/reservations/${r.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Voir fiche complète →
                    </a>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(r.id)}
                        disabled={savingId === r.id}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        {savingId === r.id ? "Sauvegarde..." : "Sauvegarder"}
                      </button>
                      <button
                        onClick={() => handleSaveAndNotify(r.id)}
                        disabled={savingId === r.id}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        Sauvegarder + Email
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
