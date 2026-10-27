import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { isEventOpen } from "@/lib/open";

export async function GET() {
  const allEvents = (await db.select().from(events)).filter((event) => isEventOpen(event));
  return NextResponse.json(allEvents);
}
