import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { clientIp, escapeHtml, isPlausibleEmail } from "@/lib/security";
import { countRecent, recordAttempt } from "@/lib/rate-limit";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 5;

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if ((await countRecent("help", ip, WINDOW_MS)) >= MAX_REQUESTS) {
    return NextResponse.json({ error: "Trop de messages. Réessayez plus tard." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ success: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  const seatOrTable = typeof body.seatOrTable === "string" ? body.seatOrTable.trim() : "";
  const eventLabel = typeof body.eventLabel === "string" ? body.eventLabel.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !whatsapp || !seatOrTable || !eventLabel) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }
  if (
    name.length > 80 ||
    whatsapp.length > 40 ||
    seatOrTable.length > 80 ||
    eventLabel.length > 200 ||
    message.length > 2000 ||
    !isPlausibleEmail(email)
  ) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  const to = process.env.ALERT_EMAIL?.trim();
  if (!to) return NextResponse.json({ success: true });
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    return NextResponse.json({ error: "Envoi indisponible" }, { status: 503 });
  }

  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#888;width:140px;">${label}</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(value)}</td></tr>`;

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Aide réservation — ${name}`.slice(0, 180),
      html: `
        <div style="font-family:sans-serif;max-width:600px;">
          <h2>Demande d'aide – Réservation Cmotion</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${row("Nom", name)}
            ${row("Email", email)}
            ${row("WhatsApp", whatsapp)}
            ${row("Spectacle", eventLabel)}
            ${row("Siège / Table", seatOrTable)}
            ${message ? row("Message", message) : ""}
          </table>
        </div>
      `,
    });
    await recordAttempt("help", ip);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Aide", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "Erreur d'envoi" }, { status: 500 });
  }
}
