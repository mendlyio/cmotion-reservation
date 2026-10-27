import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { CLAIM_SEATS_SQL } from "./booking";

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE TYPE seat_status AS ENUM ('available', 'held', 'reserved');
    CREATE TYPE stripe_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
    CREATE TABLE tables (
      id serial PRIMARY KEY,
      event_id integer NOT NULL
    );
    CREATE TABLE seats (
      id serial PRIMARY KEY,
      table_id integer NOT NULL REFERENCES tables(id),
      status seat_status NOT NULL DEFAULT 'available'
    );
    CREATE TABLE holds (
      id serial PRIMARY KEY,
      session_id text NOT NULL,
      event_id integer NOT NULL,
      table_id integer,
      seat_id integer UNIQUE REFERENCES seats(id),
      expires_at timestamptz NOT NULL
    );
    CREATE TABLE reservations (
      id serial PRIMARY KEY,
      stripe_status stripe_status NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE reservation_seats (
      id serial PRIMARY KEY,
      reservation_id integer NOT NULL REFERENCES reservations(id),
      seat_id integer NOT NULL UNIQUE REFERENCES seats(id)
    );
    INSERT INTO tables (event_id) VALUES (7);
    INSERT INTO seats (table_id, status) VALUES (1, 'available'), (1, 'available');
  `);
  return db;
}

describe("claim de sièges", () => {
  it("refuse un second claim sur le même siège", async () => {
    const db = await database();
    const expires = new Date(Date.now() + 60_000).toISOString();
    const first = await db.query(CLAIM_SEATS_SQL, [[1], 7, 1, "session-a", expires]);
    const second = await db.query(CLAIM_SEATS_SQL, [[1], 7, 1, "session-b", expires]);
    assert.equal(first.rows.length, 1);
    assert.equal(second.rows.length, 0);
    const held = await db.query<{ status: string }>("SELECT status FROM seats WHERE id = 1");
    assert.equal(held.rows[0].status, "held");
    await db.close();
  });

  it("ne reprend pas un siège déjà vendu, et la contrainte unique bloque une seconde place", async () => {
    const db = await database();
    await db.exec(`
      INSERT INTO reservations (stripe_status) VALUES ('paid');
      INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (1, 2);
    `);
    const expires = new Date(Date.now() + 60_000).toISOString();
    const claimed = await db.query(CLAIM_SEATS_SQL, [[2], 7, 1, "session-c", expires]);
    assert.equal(claimed.rows.length, 0);
    const seat = await db.query<{ status: string }>("SELECT status FROM seats WHERE id = 2");
    assert.equal(seat.rows[0].status, "available");
    await assert.rejects(
      () => db.exec("INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (1, 2)"),
      /unique|duplicate/i
    );
    await db.close();
  });
});
