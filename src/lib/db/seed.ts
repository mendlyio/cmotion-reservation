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
    timeInfo: "11h",
    ageGroup: "+12",
    description: "Spectacle de danse pour les élèves de +12 ans",
  },
  {
    name: "Spectacle +12 ans",
    eventDate: "2026-05-17",
    timeInfo: "17h",
    ageGroup: "+12",
    description: "Spectacle de danse pour les élèves de +12 ans",
  },
  {
    name: "Spectacle -12 ans",
    eventDate: "2026-06-07",
    timeInfo: "11h",
    ageGroup: "-12",
    description: "Spectacle de danse pour les élèves de -12 ans",
  },
  {
    name: "Spectacle -12 ans",
    eventDate: "2026-06-07",
    timeInfo: "17h",
    ageGroup: "-12",
    description: "Spectacle de danse pour les élèves de -12 ans",
  },
];

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding database...");

  for (const eventData of EVENTS) {
    const [event] = await db.insert(events).values({ ...eventData, isActive: false }).returning();
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
      }
    }

    console.log(`  → 55 tables, 440 seats created`);
  }

  const totalTables = SEATING_PLAN.reduce((a, r) => a + r.tables, 0) * EVENTS.length;
  const totalSeats = totalTables * 8;
  console.log(`\nDone! ${EVENTS.length} events, ${totalTables} tables, ${totalSeats} seats`);
}

seed().catch(console.error);
