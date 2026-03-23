import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin";

export async function POST() {
  await clearAdminCookie();
  return NextResponse.redirect(
    new URL("/admin", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
    303
  );
}
