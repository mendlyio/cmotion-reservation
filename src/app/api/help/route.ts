import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";

export async function POST(request: NextRequest) {
  const { name, email, whatsapp, seatOrTable, eventLabel, message } = await request.json();

  if (!name || !email || !whatsapp || !seatOrTable || !eventLabel) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@cmotionstudio.be",
      to: "info@bronfortvalentin.com",
      replyTo: email,
      subject: `🆘 Aide réservation — ${name} (${eventLabel})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #e0e0e0; padding: 32px; border-radius: 12px;">
          <h2 style="color: #c9a227; margin-top: 0;">Demande d'aide – Réservation Cmotion</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #888; width: 140px;">Nom</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #c9a227;">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #888;">WhatsApp</td><td style="padding: 8px 0;">${whatsapp}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Spectacle</td><td style="padding: 8px 0;">${eventLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Siège / Table</td><td style="padding: 8px 0;">${seatOrTable}</td></tr>
            ${message ? `<tr><td style="padding: 8px 0; color: #888; vertical-align: top;">Message</td><td style="padding: 8px 0;">${message.replace(/\n/g, "<br>")}</td></tr>` : ""}
          </table>
          <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 24px 0;" />
          <p style="color: #555; font-size: 12px; margin: 0;">Envoyé depuis le widget d'aide – Cmotion Réservation</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Help email error:", err);
    return NextResponse.json({ error: "Erreur d'envoi" }, { status: 500 });
  }
}
