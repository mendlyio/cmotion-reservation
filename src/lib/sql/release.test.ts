import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { FAIL_PENDING_SQL, RELEASE_SESSION_SQL } from "./booking";

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE TYPE seat_status AS ENUM ('available', 'held', 'reserved');
    CREATE TYPE stripe_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
    CREATE TABLE seats (id serial PRIMARY KEY, status seat_status NOT NULL DEFAULT 'available');
    CREATE TABLE holds (
      id serial PRIMARY KEY, session_id text NOT NULL, event_id integer NOT NULL,
      seat_id integer UNIQUE REFERENCES seats(id), expires_at timestamptz NOT NULL
    );
    CREATE TABLE reservations (
      id serial PRIMARY KEY, session_id text,
      stripe_status stripe_status NOT NULL DEFAULT 'pending', total_amount integer NOT NULL
    );
    CREATE TABLE reservation_seats (
      id serial PRIMARY KEY, reservation_id integer NOT NULL REFERENCES reservations(id),
      seat_id integer NOT NULL UNIQUE REFERENCES seats(id)
    );
    INSERT INTO seats (status) VALUES ('held'), ('held');
    INSERT INTO reservations (session_id, total_amount) VALUES ('s1', 6000);
    INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (1, 1), (1, 2);
    INSERT INTO holds (session_id, event_id, seat_id, expires_at)
      VALUES ('s1', 1, 1, now() + interval '30 minutes'), ('s1', 1, 2, now() + interval '30 minutes');
  `);
  return db;
}

async function state(db: PGlite) {
  const seats = await db.query<{ status: string }>("SELECT status FROM seats ORDER BY id");
  const res = await db.query<{ stripe_status: string }>("SELECT stripe_status FROM reservations");
  const holds = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM holds");
  return { seats: seats.rows.map((r) => r.status), status: res.rows[0].stripe_status, holds: holds.rows[0].n };
}

describe("libération des places", () => {
  it("un checkout expiré rend les sièges disponibles tout de suite", async () => {
    const db = await database();
    await db.query(FAIL_PENDING_SQL, [1]);
    assert.deepEqual(await state(db), { seats: ["available", "available"], status: "failed", holds: 0 });
  });

  it("une nouvelle sélection de la même session rend les sièges disponibles tout de suite", async () => {
    const db = await database();
    await db.query(RELEASE_SESSION_SQL, ["s1"]);
    assert.deepEqual(await state(db), { seats: ["available", "available"], status: "failed", holds: 0 });
  });

  it("ne libère pas un siège payé", async () => {
    const db = await database();
    await db.exec("UPDATE reservations SET stripe_status = 'paid'; UPDATE seats SET status = 'reserved';");
    await db.query(FAIL_PENDING_SQL, [1]);
    assert.deepEqual((await state(db)).seats, ["reserved", "reserved"]);
  });
});
