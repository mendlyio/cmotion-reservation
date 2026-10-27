import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { releaseHoldsBySession } from "@/lib/hold";

export async function POST() {
  const sessionId = await getOrCreateSession();
  await releaseHoldsBySession(sessionId);
  return NextResponse.json({ success: true });
}
