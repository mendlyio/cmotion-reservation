import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin";
import { getBaseUrl } from "@/lib/base-url";
import { logoutRedirectPath } from "@/lib/event-access";

export async function POST(request: NextRequest) {
  const type = request.headers.get("content-type") ?? "";
  let returnTo: unknown = null;
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await request.formData();
    returnTo = form.get("returnTo");
  }
  await clearAdminCookie();
  return NextResponse.redirect(new URL(logoutRedirectPath(returnTo), getBaseUrl()), 303);
}
