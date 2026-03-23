import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  reservationUpsells,
  reservationSeats,
  reservations,
  holds,
  seats,
  tables,
  events,
} from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function reset() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Resetting database...");

  await db.delete(reservationUpsells);
  console.log("  ✓ reservation_upsells");
  await db.delete(reservationSeats);
  console.log("  ✓ reservation_seats");
  await db.delete(reservations);
  console.log("  ✓ reservations");
  await db.delete(holds);
  console.log("  ✓ holds");
  await db.delete(seats);
  console.log("  ✓ seats");
  await db.delete(tables);
  console.log("  ✓ tables");
  await db.delete(events);
  console.log("  ✓ events");

  console.log("\nDatabase reset complete!");
}

reset().catch(console.error);
