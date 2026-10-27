import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { FAST_CLEANUP_SQL, FULFILL_PAID_SQL } from "./booking";

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE TYPE seat_status AS ENUM ('available', 'held', 'reserved');
    CREATE TYPE stripe_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
    CREATE TABLE seats (
      id serial PRIMARY KEY,
      status seat_status NOT NULL DEFAULT 'available'
    );
    CREATE TABLE holds (
      id serial PRIMARY KEY,
      session_id text NOT NULL,
      event_id integer NOT NULL,
      seat_id integer UNIQUE REFERENCES seats(id),
      expires_at timestamptz NOT NULL
    );
    CREATE TABLE reservations (
      id serial PRIMARY KEY,
      stripe_status stripe_status NOT NULL DEFAULT 'pending',
      stripe_payment_id text,
      total_amount integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE reservation_seats (
      id serial PRIMARY KEY,
      reservation_id integer NOT NULL REFERENCES reservations(id),
      seat_id integer NOT NULL UNIQUE REFERENCES seats(id)
    );
  `);
  return db;
}

describe("paiement et sièges", () => {
  it("marque payé et réserve le siège dans la même requête", async () => {
    const db = await database();
    await db.exec(`
      INSERT INTO seats (status) VALUES ('held'), ('held');
      INSERT INTO holds (session_id, event_id, seat_id, expires_at)
        VALUES ('session-a', 7, 1, now() + interval '20 minutes');
      INSERT INTO reservations (stripe_status, total_amount) VALUES ('pending', 5600);
      INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (1, 1), (1, 2);
    `);

    const wrong = await db.query<{ id: number | null; seats: number }>(FULFILL_PAID_SQL, [1, "cs_test", 3000]);
    assert.equal(wrong.rows[0].id, null);
    assert.equal(wrong.rows[0].seats, 0);

    const paid = await db.query<{ id: number | null; seats: number }>(FULFILL_PAID_SQL, [1, "cs_test", 5600]);
    assert.equal(Number(paid.rows[0].id), 1);
    assert.equal(Number(paid.rows[0].seats), 2);

    const again = await db.query<{ id: number | null }>(FULFILL_PAID_SQL, [1, "cs_test", 5600]);
    assert.equal(again.rows[0].id, null);

    const seat = await db.query<{ status: string }>("SELECT status FROM seats ORDER BY id");
    const hold = await db.query("SELECT id FROM holds");
    const reservation = await db.query<{ stripe_status: string; stripe_payment_id: string }>(
      "SELECT stripe_status, stripe_payment_id FROM reservations WHERE id = 1"
    );
    assert.deepEqual(seat.rows.map((row) => row.status), ["reserved", "reserved"]);
    assert.equal(hold.rows.length, 0);
    assert.equal(reservation.rows[0].stripe_status, "paid");
    assert.equal(reservation.rows[0].stripe_payment_id, "cs_test");
    await db.close();
  });

  it("répare un siège resté held après un paiement déjà enregistré", async () => {
    const db = await database();
    await db.exec(`
      INSERT INTO seats (status) VALUES ('held'), ('held'), ('held');
      INSERT INTO holds (session_id, event_id, seat_id, expires_at) VALUES
        ('session-paid', 7, 1, now() + interval '20 minutes'),
        ('session-live', 7, 3, now() + interval '20 minutes');
      INSERT INTO reservations (stripe_status, stripe_payment_id, total_amount, created_at) VALUES
        ('paid', 'cs_paid', 2800, now()),
        ('pending', 'cs_live', 2800, now());
      INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (1, 1), (2, 3);
    `);

    await db.query(FAST_CLEANUP_SQL);

    const seats = await db.query<{ id: number; status: string }>("SELECT id, status FROM seats ORDER BY id");
    const holds = await db.query<{ seat_id: number }>("SELECT seat_id FROM holds ORDER BY seat_id");
    assert.deepEqual(
      seats.rows.map((row) => row.status),
      ["reserved", "available", "held"]
    );
    assert.deepEqual(
      holds.rows.map((row) => row.seat_id),
      [3]
    );
    const pending = await db.query<{ stripe_status: string }>("SELECT stripe_status FROM reservations WHERE id = 2");
    assert.equal(pending.rows[0].stripe_status, "pending");
    await db.close();
  });
});
