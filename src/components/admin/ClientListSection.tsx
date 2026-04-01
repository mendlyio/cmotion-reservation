"use client";

import { useState, useMemo } from "react";
import { MEAL_OPTIONS, DESSERT_LABEL, getSeatLabel } from "@/types";
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

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
  refunded: "bg-[#1e1e1e] text-[#666] border-[#2a2a2a]",
};
const STATUS_LABELS: Record<string, string> = {
  paid: "Payé",
  pending: "En attente",
  failed: "Échoué",
  refunded: "Remboursé",
};

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

  return (
    <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden">
      {/* Header + filters */}
      <div className="px-5 sm:px-6 py-5 border-b border-[#1a1a1a] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Liste des clients</h2>
          <span className="text-xs text-[#555] bg-[#1a1a1a] px-2.5 py-1 rounded-full border border-[#2a2a2a]">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Nom, email, #réservation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/20 transition-all"
            />
          </div>

          <select
            value={eventFilter === "all" ? "all" : eventFilter}
            onChange={(e) =>
              setEventFilter(
                e.target.value === "all" ? "all" : parseInt(e.target.value)
              )
            }
            className="h-10 px-3 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-[#aaa] focus:outline-none focus:border-[#c9a227]/50 transition-all sm:w-48"
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
            className="h-10 px-3 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-[#aaa] focus:outline-none focus:border-[#c9a227]/50 transition-all sm:w-40"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Payé</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
            <option value="refunded">Remboursé</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-[#141414]">
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm text-[#555]">Aucune réservation trouvée</p>
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
                className="w-full text-left px-5 sm:px-6 py-4 hover:bg-[#141414] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + badges */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-[#444]">#{r.id}</span>
                      <span className="font-semibold text-white text-sm truncate">
                        {r.referentStudent}
                      </span>
                      {r.isVip && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30 uppercase tracking-wider">
                          VIP ★
                        </span>
                      )}
                    </div>
                    {/* Row 2: meta */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span className="text-xs text-[#555] truncate max-w-[160px]">{r.email}</span>
                      <span className="text-[#333]">·</span>
                      <span className="text-xs text-[#555]">{r.eventName}</span>
                      <span className="text-[#333]">·</span>
                      <span className="text-xs text-[#555]">{date}</span>
                      <span className="text-[#333] hidden sm:inline">·</span>
                      <span className="text-xs text-[#555] hidden sm:inline">Table {r.tableInfo}</span>
                      <span className="text-[#333] hidden sm:inline">·</span>
                      <span className="text-xs text-[#555] hidden sm:inline">
                        {r.guests.length} convive{r.guests.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Right: amount + status + chevron */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-bold text-white text-sm hidden xs:block">
                      {(r.totalAmount / 100).toFixed(0)}€
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${STATUS_STYLES[r.stripeStatus] || STATUS_STYLES.pending}`}>
                      {STATUS_LABELS[r.stripeStatus] || r.stripeStatus}
                    </span>
                    <svg
                      className={`w-4 h-4 text-[#444] transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="px-5 sm:px-6 pb-6 bg-[#0a0a0a] border-t border-[#141414]">
                  {/* Contact info strip */}
                  <div className="flex flex-wrap gap-3 py-4 mb-4">
                    <ContactChip icon="mail" label={r.email} />
                    {r.phone && <ContactChip icon="phone" label={r.phone} />}
                    <ContactChip
                      icon="calendar"
                      label={`${new Date(r.eventDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · ${r.timeInfo}`}
                    />
                    {r.createdAt && (
                      <span className="text-xs text-[#444] self-center">
                        Résa le {new Date(r.createdAt).toLocaleDateString("fr-FR")} à {new Date(r.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Admin notes on reservation */}
                  {r.adminNotes && (
                    <div className="flex items-start gap-2 px-3 py-2.5 mb-4 bg-[#c9a227]/5 border border-[#c9a227]/20 rounded-xl">
                      <svg className="w-3.5 h-3.5 text-[#c9a227] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <p className="text-xs text-[#c9a227]/80">{r.adminNotes}</p>
                    </div>
                  )}

                  {/* Guest list */}
                  <div className="space-y-2.5">
                    {guests.map((g, gIdx) => (
                      <div
                        key={g.id}
                        className="bg-[#111] rounded-xl border border-[#1e1e1e] p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-mono text-[#444]">
                            Siège {getSeatLabel(g.seatNumber)}
                          </span>
                          <span className="text-[#333]">—</span>
                          <span className="text-sm font-medium text-[#ccc]">
                            {g.firstName} {g.lastName}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          <GuestField label="Prénom">
                            <input
                              type="text"
                              value={g.firstName}
                              onChange={(e) => updateGuest(r.id, gIdx, "firstName", e.target.value)}
                              className="w-full h-9 px-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/15 transition-all"
                            />
                          </GuestField>
                          <GuestField label="Nom">
                            <input
                              type="text"
                              value={g.lastName}
                              onChange={(e) => updateGuest(r.id, gIdx, "lastName", e.target.value)}
                              className="w-full h-9 px-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/15 transition-all"
                            />
                          </GuestField>
                          <GuestField label="Repas">
                            <select
                              value={g.mealChoice}
                              onChange={(e) => updateGuest(r.id, gIdx, "mealChoice", e.target.value)}
                              className="w-full h-9 px-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-[#c9a227]/50 transition-all"
                            >
                              {MEAL_OPTIONS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </GuestField>
                          <GuestField label="Dessert">
                            <label className="flex items-center gap-2 h-9 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={g.hasDessert}
                                onChange={(e) => updateGuest(r.id, gIdx, "hasDessert", e.target.checked)}
                                className="w-4 h-4 rounded border-[#333] bg-[#1a1a1a] accent-[#c9a227] cursor-pointer"
                              />
                              <span className="text-sm text-[#888] group-hover:text-[#ccc] transition-colors">
                                {DESSERT_LABEL}
                              </span>
                            </label>
                          </GuestField>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1a1a1a]">
                    <a
                      href={`/admin/reservations/${r.id}`}
                      className="text-xs text-[#c9a227] hover:text-[#e4c76b] font-medium transition-colors flex items-center gap-1"
                    >
                      Voir fiche complète
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </a>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(r.id)}
                        disabled={savingId === r.id}
                        className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3a3a3a] text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                      >
                        {savingId === r.id ? "…" : "Sauvegarder"}
                      </button>
                      <button
                        onClick={() => handleSaveAndNotify(r.id)}
                        disabled={savingId === r.id}
                        className="px-4 py-2 bg-gradient-to-r from-[#c9a227] to-[#a07818] hover:opacity-90 text-black text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-md shadow-[#c9a227]/15"
                      >
                        {savingId === r.id ? "…" : "Sauvegarder + Email"}
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

function ContactChip({ icon, label }: { icon: "mail" | "phone" | "calendar"; label: string }) {
  const icons = {
    mail: <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />,
  };
  return (
    <div className="flex items-center gap-1.5 text-xs text-[#555]">
      <svg className="w-3.5 h-3.5 text-[#444] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        {icons[icon]}
      </svg>
      <span className="truncate max-w-[220px]">{label}</span>
    </div>
  );
}

function GuestField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-bold text-[#555] uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
