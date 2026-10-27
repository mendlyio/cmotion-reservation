import { resend } from "@/lib/resend";
import { escapeHtml } from "@/lib/security";

export interface PaymentAlert {
  reason: string;
  reservationId?: number | null;
  stripeSessionId?: string | null;
  amountTotal?: number | null;
  expectedAmount?: number | null;
  customerEmail?: string | null;
}

/** Prévient l'organisateur. Retourne false si l'envoi est impossible. */
export async function alertPaymentAnomaly(alert: PaymentAlert): Promise<boolean> {
  const to = process.env.ALERT_EMAIL?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!to || !from) {
    console.error(
      "Alerte paiement non envoyée : ALERT_EMAIL ou RESEND_FROM_EMAIL manquant",
      alert.reason,
      alert.reservationId ?? "",
      alert.stripeSessionId ?? ""
    );
    return false;
  }

  const lines = [
    ["Motif", alert.reason],
    ["Réservation", alert.reservationId ? String(alert.reservationId) : "introuvable"],
    ["Session Stripe", alert.stripeSessionId || ""],
    ["Montant Stripe (centimes)", alert.amountTotal === null || alert.amountTotal === undefined ? "" : String(alert.amountTotal)],
    ["Montant attendu (centimes)", alert.expectedAmount === null || alert.expectedAmount === undefined ? "" : String(alert.expectedAmount)],
    ["Email client", alert.customerEmail || ""],
  ];

  const rows = lines
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 10px;color:#555;">${escapeHtml(label)}</td><td style="padding:6px 10px;font-weight:600;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Alerte paiement C-Motion — ${alert.reason}`,
      html: `<div style="font-family:sans-serif;max-width:560px;"><h2>Paiement à vérifier</h2><table>${rows}</table><p>Aucune place n'a été inventée. La réservation n'a pas été supprimée.</p></div>`,
    });
    return true;
  } catch (err) {
    console.error("Échec de l'alerte paiement", alert.reason, err instanceof Error ? err.name : "error");
    return false;
  }
}
