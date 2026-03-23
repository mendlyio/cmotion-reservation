import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { events, tables, seats } from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SEATING_PLAN = [
  { row: 1, tables: 5, isVip: true },
  { row: 2, tables: 6, isVip: true },
  { row: 3, tables: 7, isVip: true },
  { row: 4, tables: 7, isVip: false },
  { row: 5, tables: 7, isVip: false },
  { row: 6, tables: 6, isVip: false },
  { row: 7, tables: 7, isVip: false },
  { row: 8, tables: 5, isVip: false },
  { row: 9, tables: 5, isVip: false },
];

const EVENTS = [
  {
    name: "Spectacle +12 ans",
    eventDate: "2026-05-17",
    timeInfo: "11h et 17h30",
    ageGroup: "+12",
    description: "Spectacle de danse pour les élèves de +12 ans",
  },
  {
    name: "Spectacle -12 ans",
    eventDate: "2026-06-07",
    timeInfo: "11h et 17h",
    ageGroup: "-12",
    description: "Spectacle de danse pour les élèves de -12 ans",
  },
];

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding database...");

  for (const eventData of EVENTS) {
    const [event] = await db.insert(events).values(eventData).returning();
    console.log(`Created event: ${event.name} (ID: ${event.id})`);

    for (const rowConfig of SEATING_PLAN) {
      for (let t = 1; t <= rowConfig.tables; t++) {
        const [table] = await db
          .insert(tables)
          .values({
            eventId: event.id,
            rowNumber: rowConfig.row,
            tableNumber: t,
            seatCount: 8,
            isVip: rowConfig.isVip,
          })
          .returning();

        const seatValues = Array.from({ length: 8 }, (_, i) => ({
          tableId: table.id,
          seatNumber: i + 1,
          status: "available" as const,
        }));

        await db.insert(seats).values(seatValues);
        console.log(
          `  Row ${rowConfig.row}, Table ${t} (${rowConfig.isVip ? "VIP" : "Normal"}) - 8 seats`
        );
      }
    }
  }

  console.log("\nSeeding complete!");
  console.log(
    `Total: ${EVENTS.length} events, ${SEATING_PLAN.reduce((acc, r) => acc + r.tables, 0) * EVENTS.length} tables, ${SEATING_PLAN.reduce((acc, r) => acc + r.tables * 8, 0) * EVENTS.length} seats`
  );
}

seed().catch(console.error);
