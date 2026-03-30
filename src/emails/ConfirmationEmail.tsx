import { MEAL_OPTIONS, DANCER_MEAL_OPTIONS, DESSERT_LABEL } from "@/types";

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
    placement?: string;
  }[];
  upsells?: { type: string; quantity: number; unitPrice: number; mealChoice?: string | null }[];
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
      const meal = MEAL_OPTIONS.find((m) => m.value === g.mealChoice)?.label || g.mealChoice;
      const placementBadge = g.placement
        ? `<span style="display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700;color:#e2e8f0;margin-right:7px;letter-spacing:0.5px;">${g.placement}</span>`
        : "";
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${placementBadge}${g.firstName} ${g.lastName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${meal}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${g.hasDessert ? DESSERT_LABEL : "—"}</td>
        </tr>
      `;
    })
    .join("");

  const dancerRows = upsells
    .filter((u) => u.type === "repas_danseur")
    .map((u, i) => {
      const opt = u.mealChoice ? DANCER_MEAL_OPTIONS.find((o) => o.value === u.mealChoice) : null;
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${i + 1}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${opt?.label || u.type}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-align: right;">${((u.unitPrice * u.quantity) / 100).toFixed(2)} €</td>
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
          <div style="background: linear-gradient(135deg, #0f0c00, #1c1600); padding: 36px 32px 28px; text-align: center;">
            <p style="color: #c9a227; margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">Cmotion</p>
            <h1 style="color: #e4c76b; margin: 0 0 6px; font-size: 30px; font-weight: 800; letter-spacing: 1px;">Sans filtre</h1>
            <p style="color: #94a3b8; margin: 0 0 16px; font-size: 13px; font-style: italic;">Et si ce spectacle cachait bien plus que ce que vous imaginez…</p>
            <div style="display:inline-block;background:#c9a227;color:#0f0c00;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:1px;">✓ Réservation confirmée</div>
          </div>

          <div style="padding: 32px;">
            <p style="margin: 0 0 24px; color: #64748b; font-size: 13px; text-align: center;">Réservation <strong style="color:#1e293b;">#${reservationId}</strong></p>

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
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Nom · Place</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Repas</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Dessert</th>
                </tr>
              </thead>
              <tbody>${guestRows}</tbody>
            </table>

            ${dancerRows ? `
            <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px;">Repas Danseur</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">#</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #64748b;">Plat</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #64748b;">Prix</th>
                </tr>
              </thead>
              <tbody>${dancerRows}</tbody>
            </table>` : ""}

            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 16px;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Total payé</p>
              <p style="margin: 4px 0 0; color: #1e293b; font-size: 28px; font-weight: 700;">${(totalAmount / 100).toFixed(2)} €</p>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; text-align: center;">
              <p style="margin: 0; color: #92400e; font-size: 12px; font-weight: 600;">
                🔒 Cette réservation est non remboursable, non annulable et non modifiable.
              </p>
            </div>
          </div>

          <div style="padding: 20px 32px; background: #f8fafc; text-align: center;">
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
