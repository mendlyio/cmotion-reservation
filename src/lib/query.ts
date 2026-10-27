import { sql } from "@/lib/db";

export async function queryRows<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const rows = await sql.query(text, params);
  return rows as T[];
}

export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  const message = "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
  return code === "23505" || /duplicate key|unique constraint/i.test(message);
}
