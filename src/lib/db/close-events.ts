import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { events } from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function closeEvents() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const result = await db
    .update(events)
    .set({ isActive: false })
    .returning({ id: events.id, name: events.name, ageGroup: events.ageGroup });

  console.log(`${result.length} spectacle(s) fermé(s) :`);
  for (const e of result) {
    console.log(`  → #${e.id} ${e.name} (${e.ageGroup})`);
  }
}

closeEvents().catch(console.error);
