import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { events, tables, seats, reservations, reservationSeats } from "./schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─── Configuration ────────────────────────────────────────────────────────────
const REFERENT   = "Pere Carly";
const EMAIL      = "carlynemagis@hotmail.com";
const PHONE      = "+32000000000";
const VIP_PRICE  = 28000; // 280€ en centimes

// T15 = rangée 3, table 4 (voir SEATING_PLAN dans types/index.ts)
const ROW_NUMBER   = 3;
const TABLE_NUMBER = 4;

const GUESTS = [
  { firstName: "Marie",      lastName: "Dupont"   },
  { firstName: "Jean-Pierre", lastName: "Martin"  },
  { firstName: "Sophie",     lastName: "Bernard"  },
  { firstName: "Lucas",      lastName: "Leroy"    },
  { firstName: "Emma",       lastName: "Moreau"   },
  { firstName: "Thomas",     lastName: "Petit"    },
  { firstName: "Camille",    lastName: "Simon"    },
  { firstName: "Antoine",    lastName: "Laurent"  },
];
// ─────────────────────────────────────────────────────────────────────────────

async function seedVipCarly() {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql);

  // 1 — Trouver les 2 spectacles +12 ans du 17 mai 2026
  const targetEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.ageGroup, "+12"), eq(events.eventDate, "2026-05-17")));

  if (targetEvents.length === 0) {
    console.error("❌ Aucun spectacle +12 ans trouvé le 17/05/2026");
    process.exit(1);
  }

  console.log(`\n✅ ${targetEvents.length} spectacle(s) trouvé(s) :`);
  for (const ev of targetEvents) {
    console.log(`   → #${ev.id} ${ev.name} ${ev.timeInfo}`);
  }

  for (const event of targetEvents) {
    console.log(`\n🎟  Traitement : ${event.name} ${event.timeInfo} (ID: ${event.id})`);

    // 2 — Trouver la table T15 (rangée 3, table 4) pour cet événement
    const [table] = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.eventId,     event.id),
          eq(tables.rowNumber,   ROW_NUMBER),
          eq(tables.tableNumber, TABLE_NUMBER)
        )
      );

    if (!table) {
      console.error(`❌ Table T15 introuvable pour l'événement #${event.id}`);
      continue;
    }

    if (!table.isVip) {
      console.warn(`⚠️  La table trouvée n'est pas VIP (vérifie ROW/TABLE number)`);
    }

    console.log(`   Table DB : ID ${table.id}, VIP=${table.isVip}`);

    // 3 — Récupérer les 8 sièges
    const tableSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.tableId, table.id));

    if (tableSeats.length !== 8) {
      console.error(`❌ ${tableSeats.length} siège(s) trouvé(s) au lieu de 8`);
      continue;
    }

    // Vérifier qu'aucun siège n'est déjà réservé
    const alreadyReserved = tableSeats.filter(s => s.status === "reserved");
    if (alreadyReserved.length > 0) {
      console.error(`❌ ${alreadyReserved.length} siège(s) déjà réservé(s) sur cette table — annulation`);
      continue;
    }

    // 4 — Créer la réservation
    const [reservation] = await db
      .insert(reservations)
      .values({
        eventId:          event.id,
        referentStudent:  REFERENT,
        email:            EMAIL,
        phone:            PHONE,
        totalAmount:      VIP_PRICE,
        stripeStatus:     "paid",
        stripePaymentId:  `manual_vip_${event.id}`,
        adminNotes:       "Réservation manuelle — table VIP Pere Carly",
      })
      .returning();

    console.log(`   ✓ Réservation créée : #${reservation.id}`);

    // 5 — Marquer les sièges comme réservés
    for (const seat of tableSeats) {
      await db
        .update(seats)
        .set({ status: "reserved" })
        .where(eq(seats.id, seat.id));
    }

    console.log(`   ✓ 8 sièges marqués "reserved"`);

    // 6 — Créer les 8 lignes reservationSeats
    const sortedSeats = [...tableSeats].sort((a, b) => a.seatNumber - b.seatNumber);

    await db.insert(reservationSeats).values(
      sortedSeats.map((seat, i) => ({
        reservationId: reservation.id,
        seatId:        seat.id,
        firstName:     GUESTS[i].firstName,
        lastName:      GUESTS[i].lastName,
        mealChoice:    "lasagne",
        hasDessert:    false,
      }))
    );

    console.log(`   ✓ 8 convives enregistrés`);
    console.log(`   ✓ Réservation #${reservation.id} complète — T15 VIP · ${REFERENT}`);
  }

  console.log("\n🎉 Done!\n");
}

seedVipCarly().catch(console.error);
