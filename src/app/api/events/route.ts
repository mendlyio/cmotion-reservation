import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allEvents = await db
    .select()
    .from(events)
    .where(eq(events.isActive, true));

  return NextResponse.json(allEvents);
}
