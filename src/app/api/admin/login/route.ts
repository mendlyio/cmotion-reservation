import { NextRequest, NextResponse } from "next/server";
import { adminPasswordConfigured, passwordMatches, setAdminCookie } from "@/lib/admin";
import { clientIp } from "@/lib/security";
import { countRecent, recordAttempt } from "@/lib/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json({ error: "Administration indisponible" }, { status: 503 });
  }

  const ip = clientIp(request);
  const recent = await countRecent("admin_login", ip, WINDOW_MS);
  if (recent >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    password = "";
  }

  if (!passwordMatches(password)) {
    await recordAttempt("admin_login", ip);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ success: true });
}
