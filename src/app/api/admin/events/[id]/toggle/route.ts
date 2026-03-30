import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const eventId = parseInt(id);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const [updated] = await db
    .update(events)
    .set({ isActive: !event.isActive })
    .where(eq(events.id, eventId))
    .returning({ id: events.id, isActive: events.isActive });

  return NextResponse.json({ isActive: updated.isActive });
}
