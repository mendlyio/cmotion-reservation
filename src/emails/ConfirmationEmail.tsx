import { MEAL_OPTIONS, UPSELL_OPTIONS } from "@/types";

interface ConfirmationEmailProps {
  reservationId: number;
  eventName: string;
  eventDate: string;
  timeInfo: string;
  referentStudent: string;
  totalAmount: number;
  tableInfo?: string;
  isVip?: boolean;
  guests: {
    firstName: string;
    lastName: string;
    mealChoice: string;
    hasDessert: boolean;
  }[];
  upsells?: { type: string; quantity: number; unitPrice: number }[];
}

export function renderConfirmationEmail(props: ConfirmationEmailProps): string {
  const {
    reservationId,
    eventName,
    eventDate,
    timeInfo,
    referentStudent,
    totalAmount,
    tableInfo,
    isVip,
    guests,
    upsells = [],
  } = props;

  const formattedDate = new Date(eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const guestRows = guests
    .map((g) => {
      const meal =
        MEAL_OPTIONS.find((m) => m.value === g.mealChoice)?.label ||
        g.mealChoice;
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${g.firstName} ${g.lastName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${meal}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${g.hasDessert ? "Tiramisu" : "—"}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #1e293b, #334155); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Cmotion Réservation</h1>
            <p style="color: #94a3b8; margin: 8px 0 0;">Confirmation de votre réservation</p>
          </div>

          <div style="padding: 32px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
              <p style="margin: 0; color: #15803d; font-weight: 600; font-size: 16px;">✓ Paiement confirmé</p>
              <p style="margin: 4px 0 0; color: #166534; font-size: 14px;">Réservation #${reservationId}</p>
            </div>

            <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 16px;">Détails de l'événement</h2>
            <table style="width: 100%; margin-bottom: 24px;">
              <tr><td style="padding: 4px 0; color: #64748b;">Spectacle</td><td style="padding: 4px 0; font-weight: 600;">${eventName}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Date</td><td style="padding: 4px 0; font-weight: 600;">${formattedDate}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Heure</td><td style="padding: 4px 0; font-weight: 600;">${timeInfo}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Élève référent</td><td style="padding: 4px 0; font-weight: 600;">${referentStudent}</td></tr>
              ${tableInfo ? `<tr><td style="padding: 4px 0; color: #64748b;">Table</td><td style="padding: 4px 0; font-weight: 600;">${tableInfo}${isVip ? " ★ VIP" : ""}</td></tr>` : ""}
            </table>

            <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px;">Convives</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Nom</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Repas</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Dessert</th>
                </tr>
              </thead>
              <tbody>
                ${guestRows}
              </tbody>
            </table>

            ${upsells.length > 0 ? `
            <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px;">Extras</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              ${upsells.map((u) => {
                const opt = UPSELL_OPTIONS.find((o) => o.type === u.type);
                return `<tr>
                  <td style="padding: 6px 0; color: #475569;">${opt?.label || u.type} ×${u.quantity}</td>
                  <td style="padding: 6px 0; font-weight: 600; text-align: right;">${((u.unitPrice * u.quantity) / 100).toFixed(2)} €</td>
                </tr>`;
              }).join("")}
            </table>` : ""}

            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Total payé</p>
              <p style="margin: 4px 0 0; color: #1e293b; font-size: 28px; font-weight: 700;">${(totalAmount / 100).toFixed(2)} €</p>
            </div>
          </div>

          <div style="padding: 24px 32px; background: #f8fafc; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 13px;">
              Cmotion Réservation — Ce mail a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
