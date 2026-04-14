import { NextRequest, NextResponse } from "next/server";
import { performReservationMaintenance } from "@/lib/maintenance";

/** Déclenchement manuel (curl / monitoring) — le planificateur Vercel est désactivé. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const { openedEventIds } = await performReservationMaintenance();

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    ...(openedEventIds.length > 0 && { eventsOpened: openedEventIds }),
  });
}
