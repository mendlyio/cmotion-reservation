import { MEAL_OPTIONS } from "@/types";

interface UpdateEmailProps {
  reservationId: number;
  eventName: string;
  eventDate: string;
  timeInfo: string;
  changes: string[];
  guests: {
    firstName: string;
    lastName: string;
    mealChoice: string;
    hasDessert: boolean;
  }[];
}

export function renderUpdateEmail(props: UpdateEmailProps): string {
  const { reservationId, eventName, eventDate, timeInfo, changes, guests } = props;

  const formattedDate = new Date(eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const changesList = changes
    .map((c) => `<li style="padding: 4px 0; color: #1e293b;">${c}</li>`)
    .join("");

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
            <p style="color: #94a3b8; margin: 8px 0 0;">Modification de votre réservation</p>
          </div>

          <div style="padding: 32px;">
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #1d4ed8; font-weight: 600;">Réservation #${reservationId} — ${eventName}</p>
              <p style="margin: 4px 0 0; color: #3b82f6; font-size: 13px;">${formattedDate} à ${timeInfo}</p>
              <p style="margin: 8px 0 0; color: #1e40af; font-size: 14px;">Des modifications ont été apportées à votre réservation :</p>
            </div>

            <ul style="padding-left: 20px; margin-bottom: 24px;">
              ${changesList}
            </ul>

            <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px;">Détails actualisés des convives</h2>
            <table style="width: 100%; border-collapse: collapse;">
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
