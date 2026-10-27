import { and, eq, gt, sql as dsql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requestLimits } from "@/lib/db/schema";

export async function countRecent(bucket: string, ip: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ n: dsql<number>`count(*)::int` })
    .from(requestLimits)
    .where(
      and(eq(requestLimits.bucket, bucket), eq(requestLimits.ip, ip), gt(requestLimits.createdAt, since))
    );
  return row?.n ?? 0;
}

export async function recordAttempt(bucket: string, ip: string): Promise<void> {
  await db.insert(requestLimits).values({ bucket, ip });
}
