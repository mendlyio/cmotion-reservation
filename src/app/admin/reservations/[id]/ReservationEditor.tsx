"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MEAL_OPTIONS, DESSERT_LABEL, getSeatLabel } from "@/types";

interface GuestData {
  id: number;
  seatId: number;
  seatNumber: number;
  firstName: string;
  lastName: string;
  mealChoice: string;
  hasDessert: boolean;
  adminNotes: string;
}

interface ReservationEditorProps {
  reservationId: number;
  adminNotes: string;
  guests: GuestData[];
}

export function ReservationEditor({
  reservationId,
  adminNotes: initialNotes,
  guests: initialGuests,
}: ReservationEditorProps) {
  const router = useRouter();
  const [guests, setGuests] = useState<GuestData[]>(initialGuests);
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);

  const handleGuestChange = (index: number, field: string, value: string | boolean | null) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setGuests(newGuests);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes,
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
        toast.success("Réservation mise à jour et email envoyé");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f0f0f] rounded-2xl border border-[#1e1a0e] overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-5 border-b border-[#1a1a1a]">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Convives</h2>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c9a227] to-[#a07818] hover:opacity-90 text-black text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-md shadow-[#c9a227]/15"
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Sauvegarde…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Sauvegarder et notifier
            </>
          )}
        </button>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-3">
        {guests.map((guest, i) => (
          <div
            key={guest.id}
            className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-[#c9a227]/15 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#c9a227]">{getSeatLabel(guest.seatNumber)}</span>
              </div>
              <span className="text-sm font-medium text-[#888]">Siège {getSeatLabel(guest.seatNumber)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <EditorField label="Prénom">
                <input
                  type="text"
                  value={guest.firstName}
                  onChange={(e) => handleGuestChange(i, "firstName", e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/15 transition-all"
                />
              </EditorField>
              <EditorField label="Nom">
                <input
                  type="text"
                  value={guest.lastName}
                  onChange={(e) => handleGuestChange(i, "lastName", e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/15 transition-all"
                />
              </EditorField>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <EditorField label="Repas">
                <select
                  value={guest.mealChoice}
                  onChange={(e) => handleGuestChange(i, "mealChoice", e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-[#c9a227]/50 transition-all"
                >
                  {MEAL_OPTIONS.map((meal) => (
                    <option key={meal.value} value={meal.value}>{meal.label}</option>
                  ))}
                </select>
              </EditorField>

              <EditorField label="Dessert">
                <label className="flex items-center gap-2.5 h-10 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={guest.hasDessert}
                    onChange={(e) => handleGuestChange(i, "hasDessert", e.target.checked)}
                    className="w-4 h-4 rounded border-[#333] bg-[#1a1a1a] accent-[#c9a227] cursor-pointer"
                  />
                  <span className="text-sm text-[#888] group-hover:text-[#ccc] transition-colors">
                    {DESSERT_LABEL}
                  </span>
                </label>
              </EditorField>
            </div>

            <div className="mt-3">
              <EditorField label="Note admin (convive)">
                <input
                  type="text"
                  value={guest.adminNotes}
                  onChange={(e) => handleGuestChange(i, "adminNotes", e.target.value)}
                  placeholder="Note interne…"
                  className="w-full h-10 px-3 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/15 transition-all"
                />
              </EditorField>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 sm:px-6 pb-5 pt-0 border-t border-[#141414]">
        <div className="pt-5">
          <label className="block text-[9px] font-bold text-[#555] uppercase tracking-widest mb-2">
            Notes admin (réservation)
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Notes internes sur cette réservation…"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/15 transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-bold text-[#555] uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
