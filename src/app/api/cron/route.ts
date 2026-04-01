import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredHolds } from "@/lib/hold";

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

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
  });
}
