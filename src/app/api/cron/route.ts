import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredHolds } from "@/lib/hold";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Nettoyage des holds expirés
  await cleanupExpiredHolds();

  // Ouverture automatique des événements dont openAt est atteint
  const toOpen = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(
      and(
        eq(events.isActive, false),
        isNotNull(events.openAt),
        lte(events.openAt, now)
      )
    );

  let opened: number[] = [];
  if (toOpen.length > 0) {
    const ids = toOpen.map((e) => e.id);
    for (const id of ids) {
      await db
        .update(events)
        .set({ isActive: true })
        .where(eq(events.id, id));
    }
    opened = ids;
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    ...(opened.length > 0 && { eventsOpened: opened }),
  });
}
