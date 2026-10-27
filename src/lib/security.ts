import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/** Comparaison indépendante de la longueur, sans secret de repli. */
export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return raw.slice(0, 64);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Empêche Excel d'interpréter une cellule comme une formule. */
const FORMULA_START = /^[=+\-@]/;

export function neutralizeFormula(value: string): string {
  const leading = value.match(/^[\t\r\n ]*/)?.[0] ?? "";
  const rest = value.slice(leading.length);
  if (leading.includes("\t") || leading.includes("\r") || FORMULA_START.test(rest)) {
    return `'${value}`;
  }
  return value;
}

export function escapeCsvCell(cell: string): string {
  const safe = neutralizeFormula(cell);
  return `"${safe.replace(/"/g, '""')}"`;
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const name = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = name.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function isPlausibleEmail(email: string): boolean {
  if (email.length > 160) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
