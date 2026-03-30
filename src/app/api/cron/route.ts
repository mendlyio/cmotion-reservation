import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredHolds } from "@/lib/hold";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// Belgique = UTC+2 en avril (heure d'été)
// 1 avril 2026 à 21h00 Belgique = 1 avril 2026 à 19h00 UTC
const OPEN_PLUS12  = new Date("2026-04-01T19:00:00Z");
// 8 avril 2026 à 21h00 Belgique = 8 avril 2026 à 19h00 UTC
const OPEN_MOINS12 = new Date("2026-04-08T19:00:00Z");

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const activated: string[] = [];

  // Nettoyage des holds expirés
  await cleanupExpiredHolds();

  // Ouverture automatique des spectacles +12 ans le 1 avril à 21h Belgique
  if (now >= OPEN_PLUS12) {
    const result = await db
      .update(events)
      .set({ isActive: true })
      .where(and(eq(events.ageGroup, "+12"), eq(events.isActive, false)))
      .returning({ id: events.id, name: events.name });
    if (result.length > 0) activated.push(...result.map((e) => `+12 #${e.id}`));
  }

  // Ouverture automatique des spectacles -12 ans le 8 avril à 21h Belgique
  if (now >= OPEN_MOINS12) {
    const result = await db
      .update(events)
      .set({ isActive: true })
      .where(and(eq(events.ageGroup, "-12"), eq(events.isActive, false)))
      .returning({ id: events.id, name: events.name });
    if (result.length > 0) activated.push(...result.map((e) => `-12 #${e.id}`));
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    activated: activated.length > 0 ? activated : undefined,
  });
}
