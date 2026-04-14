import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { performReservationMaintenance } from "@/lib/maintenance";
import {
  RESERVATION_ENTRY_COOKIE,
  RESERVATION_ENTRY_MAX_AGE_SEC,
} from "@/lib/reservation-entry";

/** Réveil minimal de la base + cookie + maintenance (ex-cron) après clic sur l’accueil. */
export async function POST() {
  try {
    await db
      .select({ id: appSettings.id })
      .from(appSettings)
      .where(eq(appSettings.id, 1))
      .limit(1);

    await performReservationMaintenance();

    const res = NextResponse.json({ ok: true });
    res.cookies.set(RESERVATION_ENTRY_COOKIE, "1", {
      path: "/",
      maxAge: RESERVATION_ENTRY_MAX_AGE_SEC,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Impossible de joindre le service." },
      { status: 503 }
    );
  }
}
