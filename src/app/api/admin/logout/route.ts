import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin";
import { getBaseUrl } from "@/lib/base-url";

export async function POST() {
  await clearAdminCookie();
  try {
    return NextResponse.redirect(new URL("/admin", getBaseUrl()), 303);
  } catch {
    return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL manquant" }, { status: 500 });
  }
}
