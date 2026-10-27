import { NextRequest, NextResponse } from "next/server";
import { performScheduledMaintenance } from "@/lib/maintenance";
import { safeEqual } from "@/lib/security";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { openedEventIds } = await performScheduledMaintenance();

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    ...(openedEventIds.length > 0 && { eventsOpened: openedEventIds }),
  });
}
