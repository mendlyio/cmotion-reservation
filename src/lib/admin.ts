import { cookies } from "next/headers";

const ADMIN_COOKIE = "cmotion_admin";

export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  const expected = Buffer.from(process.env.ADMIN_PASSWORD || "").toString(
    "base64"
  );
  return token === expected;
}

export async function setAdminCookie() {
  const cookieStore = await cookies();
  const token = Buffer.from(process.env.ADMIN_PASSWORD || "").toString(
    "base64"
  );
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
