import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/admin";
import { eventsVisibleTo } from "@/lib/event-access";
import { isAwaitingOpen } from "@/lib/open";

export const dynamic = "force-dynamic";

export async function GET() {
  const allEvents = await db.select().from(events);
  const awaiting = allEvents.some((event) => isAwaitingOpen(event));
  const preview = awaiting ? await verifyAdmin() : false;
  const visible = eventsVisibleTo(allEvents, preview);
  const response = NextResponse.json(visible);
  if (awaiting) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
