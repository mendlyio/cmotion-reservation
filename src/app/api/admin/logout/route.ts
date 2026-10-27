import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin";
import { getBaseUrl } from "@/lib/base-url";

export async function POST() {
  await clearAdminCookie();
  return NextResponse.redirect(new URL("/admin", getBaseUrl()), 303);
}
