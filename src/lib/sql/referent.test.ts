import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { INSERT_RESERVATION_SQL } from "./booking";

function migration(name: string): string {
  return readFileSync(join(process.cwd(), "migrations", name), "utf8");
}

describe("migration élève référent", () => {
  it("ajoute deux colonnes nullables et laisse l'ancienne colonne", async () => {
    const sql = migration("004_referent_student_names.sql");
    assert.equal(sql.includes("referent_student"), true);
    assert.equal(/drop\s+column[^;]*referent_student/i.test(sql), false);

    const db = new PGlite();
    await db.exec(`
      CREATE TABLE reservations (
        id serial PRIMARY KEY,
        referent_student text NOT NULL
      );
    `);
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(`
      INSERT INTO reservations (referent_student) VALUES ('Pere Carly');
      INSERT INTO reservations (referent_student, referent_last_name, referent_first_name)
      VALUES ('Dupont Marie', 'Dupont', 'Marie');
    `);
    const rows = await db.query<{
      referent_student: string;
      referent_last_name: string | null;
      referent_first_name: string | null;
    }>("SELECT referent_student, referent_last_name, referent_first_name FROM reservations ORDER BY id");
    assert.deepEqual(rows.rows, [
      { referent_student: "Pere Carly", referent_last_name: null, referent_first_name: null },
      { referent_student: "Dupont Marie", referent_last_name: "Dupont", referent_first_name: "Marie" },
    ]);

    await db.exec(migration("004_referent_student_names_rollback.sql"));
    const kept = await db.query<{ referent_student: string }>("SELECT referent_student FROM reservations ORDER BY id");
    assert.deepEqual(
      kept.rows.map((row) => row.referent_student),
      ["Pere Carly", "Dupont Marie"]
    );
    await assert.rejects(
      () => db.query("SELECT referent_last_name FROM reservations"),
      /referent_last_name/
    );
    await db.close();
  });
});

describe("création de réservation", () => {
  it("enregistre le nom, le prénom et l'ancienne colonne", async () => {
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
        seat_id integer REFERENCES seats(id),
        expires_at timestamptz NOT NULL
      );
      CREATE TABLE reservations (
        id serial PRIMARY KEY,
        event_id integer NOT NULL,
        referent_student text NOT NULL,
        referent_last_name text,
        referent_first_name text,
        email text NOT NULL,
        phone text,
        total_amount integer NOT NULL,
        stripe_status stripe_status NOT NULL DEFAULT 'pending',
        public_token text NOT NULL,
        session_id text
      );
      CREATE TABLE reservation_seats (
        id serial PRIMARY KEY,
        reservation_id integer NOT NULL REFERENCES reservations(id),
        seat_id integer NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        meal_choice text NOT NULL,
        has_dessert boolean NOT NULL
      );
      CREATE TABLE reservation_upsells (
        id serial PRIMARY KEY,
        reservation_id integer NOT NULL REFERENCES reservations(id),
        upsell_type text NOT NULL,
        quantity integer NOT NULL,
        unit_price integer NOT NULL,
        meal_choice text
      );
      INSERT INTO seats (id, status) VALUES (1, 'held');
      INSERT INTO holds (session_id, event_id, seat_id, expires_at)
      VALUES ('sess', 3, 1, now() + interval '1 hour');
    `);

    const expires = new Date(Date.now() + 60_000).toISOString();
    const created = await db.query<{ id: number }>(INSERT_RESERVATION_SQL, [
      "sess",
      3,
      [1],
      expires,
      1,
      JSON.stringify([
        {
          seat_id: 1,
          first_name: "Luc",
          last_name: "Martin",
          meal_choice: "lasagne",
          has_dessert: false,
        },
      ]),
      "Dupont Marie",
      "parent@example.com",
      "+32470123456",
      2500,
      "a".repeat(32),
      "[]",
      "Dupont",
      "Marie",
    ]);
    assert.equal(created.rows.length, 1);

    const reservation = await db.query<{
      referent_student: string;
      referent_last_name: string;
      referent_first_name: string;
    }>("SELECT referent_student, referent_last_name, referent_first_name FROM reservations");
    assert.deepEqual(reservation.rows[0], {
      referent_student: "Dupont Marie",
      referent_last_name: "Dupont",
      referent_first_name: "Marie",
    });
    const guest = await db.query<{ first_name: string; last_name: string }>(
      "SELECT first_name, last_name FROM reservation_seats"
    );
    assert.deepEqual(guest.rows[0], { first_name: "Luc", last_name: "Martin" });
    await db.close();
  });
});
