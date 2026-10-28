import { cache } from "react";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminSessions } from "@/lib/db/schema";
import { adminTokenDigest, previewSessionActive } from "@/lib/event-access";
import { safeEqual, sha256Hex } from "@/lib/security";

const ADMIN_COOKIE = "cmotion_admin";
const SESSION_MS = 8 * 60 * 60 * 1000;

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function passwordMatches(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  return safeEqual(password, expected);
}

export const verifyAdmin = cache(async (): Promise<boolean> => {
  if (!adminPasswordConfigured()) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const digest = adminTokenDigest(token);
  if (!digest) return false;

  const [row] = await db
    .select({ tokenHash: adminSessions.tokenHash, expiresAt: adminSessions.expiresAt })
    .from(adminSessions)
    .where(eq(adminSessions.tokenHash, digest));
  return previewSessionActive(row, token);
});

export async function setAdminCookie(): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await db.insert(adminSessions).values({
    tokenHash: sha256Hex(token),
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MS / 1000,
    path: "/",
  });
}

export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/i.test(token)) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha256Hex(token)));
  }
  cookieStore.delete(ADMIN_COOKIE);
}
