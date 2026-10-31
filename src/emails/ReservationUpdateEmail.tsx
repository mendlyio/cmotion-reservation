import { mealLabel } from "@/lib/pricing";
import { POLICY_TEXT } from "@/lib/deadline";
import { escapeHtml } from "@/lib/security";
import { referentMailLines, type ReferentSource } from "@/lib/referent";

interface UpdateEmailProps {
  reservationId: number;
  eventName: string;
  eventDate: string;
  timeInfo: string;
  changes: string[];
  referentStudent?: string | null;
  referentLastName?: string | null;
  referentFirstName?: string | null;
  guests: {
    firstName: string;
    lastName: string;
    mealChoice: string;
    hasDessert: boolean;
  }[];
}

export function renderUpdateEmail(props: UpdateEmailProps): string {
  const { reservationId, eventName, eventDate, timeInfo, changes, guests } = props;
  const referentRows = referentMailLines(props satisfies ReferentSource)
    .map(
      (line) =>
        `<tr><td style="padding: 4px 0; color: #64748b;">${escapeHtml(line.label)}</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(line.value)}</td></tr>`
    )
    .join("");

  const formattedDate = new Date(eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const changesList = changes
    .map((change) => `<li style="padding: 4px 0; color: #1e293b;">${escapeHtml(change)}</li>`)
    .join("");

  const guestRows = guests
    .map((guest) => {
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(guest.firstName)} ${escapeHtml(guest.lastName)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(mealLabel(guest.mealChoice))}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${guest.hasDessert ? "Oui" : "—"}</td>
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
          <div style="background: linear-gradient(135deg, #1a1208, #3a2a12); padding: 32px; text-align: center;">
            <p style="color: #e4c76b; margin: 0 0 6px; letter-spacing: 2px; font-size: 12px;">CMOTION STUDIO</p>
            <h1 style="color: white; margin: 0; font-size: 24px;">Disney Show</h1>
            <p style="color: #f5e6b8; margin: 8px 0 0;">Modification des plats</p>
          </div>

          <div style="padding: 32px;">
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #1d4ed8; font-weight: 600;">Réservation #${reservationId} — ${escapeHtml(eventName)}</p>
              <p style="margin: 4px 0 0; color: #3b82f6; font-size: 13px;">${escapeHtml(formattedDate)} à ${escapeHtml(timeInfo)}</p>
              <p style="margin: 8px 0 0; color: #1e40af; font-size: 14px;">Les plats ont été mis à jour. Le montant déjà payé ne change pas.</p>
            </div>

            <table style="width: 100%; margin-bottom: 24px;">
              ${referentRows}
            </table>

            <ul style="padding-left: 20px; margin-bottom: 24px;">
              ${changesList}
            </ul>

            <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px;">Convives</h2>
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

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-top: 24px;">
              <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 700;">${escapeHtml(POLICY_TEXT)}</p>
            </div>
          </div>

          <div style="padding: 24px 32px; background: #f8fafc; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 13px;">
              Cmotion — Disney Show. Ce mail a été envoyé automatiquement.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
