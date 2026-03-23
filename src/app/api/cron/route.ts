import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredHolds } from "@/lib/hold";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in dev mode without auth
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await cleanupExpiredHolds();

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
}
