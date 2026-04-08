"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface EventOption {
  id: number;
  name: string;
  timeInfo: string;
  eventDate: string;
}

interface Props {
  events: EventOption[];
}

export function HelpWidget({ events }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [seatOrTable, setSeatOrTable] = useState("");
  const [eventId, setEventId] = useState<string>("");
  const [message, setMessage] = useState("");

  // Ne pas afficher sur les pages admin
  if (pathname.startsWith("/admin")) return null;

  const selectedEvent = events.find((e) => e.id.toString() === eventId);
  const eventLabel = selectedEvent
    ? `${selectedEvent.name} – ${selectedEvent.timeInfo} (${new Date(selectedEvent.eventDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })})`
    : "";

  const canSubmit = name.trim() && email.trim() && whatsapp.trim() && seatOrTable.trim() && eventId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, whatsapp, seatOrTable, eventLabel, message }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      toast.success("Message envoyé ! Nous vous recontacterons rapidement.");
    } catch {
      toast.error("Erreur lors de l'envoi. Réessayez ou contactez-nous directement.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (sent) {
      setTimeout(() => {
        setSent(false);
        setName(""); setEmail(""); setWhatsapp(""); setSeatOrTable(""); setEventId(""); setMessage("");
      }, 400);
    }
  };

  return (
    <>
      {/* Sticky button */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50" style={{ paddingLeft: "env(safe-area-inset-left)" }}>
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 w-10 py-4 bg-[#c9a227] hover:bg-[#e4c76b] text-black rounded-r-xl shadow-xl shadow-[#c9a227]/30 transition-all active:scale-95 group"
          title="Aide à la réservation"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 leading-none">
            Aide
          </span>
        </button>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Drawer / Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[#0f0f0f] border-r border-[#1e1a0e] shadow-2xl flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1a0e] bg-gradient-to-r from-[#141000] to-[#0f0f0f]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#c9a227]/15 border border-[#c9a227]/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Besoin d&apos;aide ?</p>
                  <p className="text-[11px] text-[#555]">Nous vous recontacterons rapidement</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-[#555] hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center gap-4 py-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white mb-1">Message envoyé !</p>
                    <p className="text-sm text-[#666]">Nous vous recontacterons au plus vite par email ou WhatsApp.</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#aaa] hover:text-white transition-all"
                  >
                    Fermer
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-xs text-[#555] bg-[#141414] border border-[#1e1e1e] px-3 py-2.5 rounded-xl leading-relaxed">
                    Remplissez ce formulaire et nous vous recontactons par email ou WhatsApp.
                  </p>

                  <HelpField label="Nom complet" value={name} onChange={setName} placeholder="Prénom Nom" required />
                  <HelpField label="Email" value={email} onChange={setEmail} placeholder="votre@email.com" type="email" required />
                  <HelpField label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+32 470 12 34 56" type="tel" required />

                  {/* Event selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-widest mb-1.5">
                      Spectacle <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      required
                      className="w-full h-12 px-4 rounded-xl border border-[#2a2a2a] bg-[#141414] text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30 focus:border-[#c9a227]/50 transition-all"
                    >
                      <option value="">Choisir un spectacle…</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name} – {ev.timeInfo} ({new Date(ev.eventDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })})
                        </option>
                      ))}
                    </select>
                  </div>

                  <HelpField label="Siège ou table" value={seatOrTable} onChange={setSeatOrTable} placeholder="Ex: Table A3 – Siège 2" required />

                  {/* Message optionnel */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-widest mb-1.5">
                      Message <span className="text-[#444]">(optionnel)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez votre problème…"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-[#2a2a2a] bg-[#141414] text-sm text-white placeholder-[#333] focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30 focus:border-[#c9a227]/50 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || loading}
                    className="w-full h-12 bg-gradient-to-r from-[#c9a227] to-[#a07818] text-black text-sm font-bold rounded-xl disabled:opacity-30 active:scale-[0.98] transition-all shadow-lg shadow-[#c9a227]/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Envoi…
                      </>
                    ) : "Envoyer le message"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HelpField({
  label, value, onChange, placeholder, type = "text", required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#555] uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-12 px-4 rounded-xl border border-[#2a2a2a] bg-[#141414] text-sm text-white placeholder-[#333] focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30 focus:border-[#c9a227]/50 transition-all"
      />
    </div>
  );
}
