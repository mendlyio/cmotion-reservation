import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";

export async function GET() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  return NextResponse.json({ helpWidgetEnabled: row?.helpWidgetEnabled ?? false });
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { helpWidgetEnabled } = await request.json();

  await db
    .update(appSettings)
    .set({ helpWidgetEnabled: !!helpWidgetEnabled })
    .where(eq(appSettings.id, 1));

  return NextResponse.json({ helpWidgetEnabled: !!helpWidgetEnabled });
}
