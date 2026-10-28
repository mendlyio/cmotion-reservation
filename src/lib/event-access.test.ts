import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { isAwaitingOpen, isEventOpen } from "./open";
import {
  adminTokenDigest,
  bookingAllowed,
  canAccessEvent,
  eventsVisibleTo,
  logoutRedirectPath,
  previewSessionActive,
  publicFlowAllows,
} from "./event-access";
import { sha256Hex } from "./security";

const OPEN = "2026-11-04T19:00:00.000Z";
const before = new Date("2026-11-04T18:59:59.000Z");
const atOpen = new Date("2026-11-04T19:00:00.000Z");
const token = "ab".repeat(32);

const awaitingInactive = { id: "disney-off", isActive: false, openAt: OPEN };
const awaitingActive = { id: "disney-on", isActive: true, openAt: OPEN };
const alreadyOpen = { id: "ouvert", isActive: true, openAt: null as string | null };
const retired = { id: "ancien", isActive: false, openAt: null as string | null };
const openedBySchedule = { id: "horaire-passe", isActive: false, openAt: OPEN };

function session(expiresAt: Date | string, hash = sha256Hex(token)) {
  return { tokenHash: hash, expiresAt };
}

describe("règle publique d'ouverture", () => {
  it("ferme un spectacle actif dont l'heure est encore devant", () => {
    assert.equal(isEventOpen(awaitingActive, before), false);
    assert.equal(isAwaitingOpen(awaitingActive, before), true);
  });

  it("ferme un spectacle inactif dont l'heure est encore devant", () => {
    assert.equal(isEventOpen(awaitingInactive, before), false);
    assert.equal(isAwaitingOpen(awaitingInactive, before), true);
  });

  it("ouvre à l'heure prévue même si le spectacle est encore inactif", () => {
    assert.equal(isEventOpen(openedBySchedule, atOpen), true);
    assert.equal(isAwaitingOpen(openedBySchedule, atOpen), false);
  });

  it("laisse fermé un spectacle inactif sans heure d'ouverture", () => {
    assert.equal(isEventOpen(retired, before), false);
    assert.equal(isAwaitingOpen(retired, before), false);
  });
});

describe("mode test avant et après l'ouverture", () => {
  it("sans session, un spectacle pas encore ouvert reste invisible et non réservable", () => {
    assert.equal(previewSessionActive(null, null, before), false);
    assert.equal(canAccessEvent(awaitingInactive, false, before), false);
    assert.equal(canAccessEvent(awaitingActive, false, before), false);
    assert.equal(bookingAllowed(awaitingInactive, false, before), false);
    assert.deepEqual(
      eventsVisibleTo([alreadyOpen, awaitingInactive, awaitingActive, retired], false, before).map((event) => event.id),
      ["ouvert"]
    );
  });

  it("avec session, les spectacles pas encore ouverts sont visibles, actifs ou non", () => {
    const preview = previewSessionActive(session(new Date("2026-11-05T00:00:00.000Z")), token, before);
    assert.equal(preview, true);
    assert.equal(canAccessEvent(awaitingInactive, preview, before), true);
    assert.equal(canAccessEvent(awaitingActive, preview, before), true);
    assert.equal(bookingAllowed(awaitingInactive, preview, before), true);
    assert.deepEqual(
      eventsVisibleTo([alreadyOpen, awaitingInactive, awaitingActive, retired], preview, before).map((event) => event.id),
      ["ouvert", "disney-off", "disney-on"]
    );
  });

  it("une session n'ouvre pas un spectacle inactif sans horaire", () => {
    const preview = previewSessionActive(session(new Date("2026-11-05T00:00:00.000Z")), token, before);
    assert.equal(canAccessEvent(retired, preview, before), false);
    assert.equal(bookingAllowed(retired, preview, before), false);
  });

  it("sans session, le spectacle est réservable dès l'heure d'ouverture", () => {
    assert.equal(canAccessEvent(awaitingInactive, false, atOpen), true);
    assert.equal(bookingAllowed(openedBySchedule, false, atOpen), true);
    assert.deepEqual(
      eventsVisibleTo([openedBySchedule, retired], false, atOpen).map((event) => event.id),
      ["horaire-passe"]
    );
  });

  it("avec session, le spectacle reste accessible après l'ouverture", () => {
    const preview = previewSessionActive(session(new Date("2026-11-05T00:00:00.000Z")), token, atOpen);
    assert.equal(preview, true);
    assert.equal(canAccessEvent(openedBySchedule, preview, atOpen), true);
    assert.equal(canAccessEvent(alreadyOpen, preview, atOpen), true);
  });

  it("une session expirée ou un mauvais jeton ne débloquent rien", () => {
    const expired = previewSessionActive(session(new Date("2026-11-04T18:00:00.000Z")), token, before);
    const wrong = previewSessionActive(session(new Date("2026-11-05T00:00:00.000Z"), sha256Hex("cd".repeat(32))), token, before);
    const malformed = previewSessionActive(session(new Date("2026-11-05T00:00:00.000Z")), "pas-un-jeton", before);
    assert.equal(expired, false);
    assert.equal(wrong, false);
    assert.equal(malformed, false);
    assert.equal(adminTokenDigest(undefined), null);
    assert.equal(adminTokenDigest("abc"), null);
    assert.equal(canAccessEvent(awaitingInactive, expired, before), false);
    assert.equal(bookingAllowed(awaitingActive, wrong, before), false);
  });

  it("le plan et le paiement restent inchangés sans session, et s'ouvrent seulement pour un horaire futur", () => {
    assert.equal(publicFlowAllows(null, false, before), true);
    assert.equal(publicFlowAllows(retired, false, before), true);
    assert.equal(publicFlowAllows(alreadyOpen, false, before), true);
    assert.equal(publicFlowAllows(awaitingInactive, false, before), false);
    assert.equal(publicFlowAllows(awaitingActive, false, before), false);
    assert.equal(publicFlowAllows(awaitingInactive, true, before), true);
    assert.equal(publicFlowAllows(awaitingInactive, false, atOpen), true);
    assert.equal(publicFlowAllows(awaitingActive, true, atOpen), true);
  });

  it("quitter le mode test ne redirige vers l'accueil que pour ce chemin", () => {
    assert.equal(logoutRedirectPath("/"), "/");
    assert.equal(logoutRedirectPath(null), "/admin");
    assert.equal(logoutRedirectPath("/admin"), "/admin");
    assert.equal(logoutRedirectPath("//evil.example"), "/admin");
    assert.equal(logoutRedirectPath(" /"), "/admin");
  });
});

describe("session admin en base locale", () => {
  it("retrouve une session non expirée et ignore une session échue", async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE TABLE admin_sessions (
        id serial PRIMARY KEY,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL
      );
    `);
    const hash = sha256Hex(token);
    await db.query("INSERT INTO admin_sessions (token_hash, expires_at) VALUES ($1, $2), ($3, $4)", [
      hash,
      "2026-11-05T00:00:00.000Z",
      sha256Hex("cd".repeat(32)),
      "2026-10-01T00:00:00.000Z",
    ]);

    const current = await db.query<{ token_hash: string; expires_at: string }>(
      "SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash = $1",
      [hash]
    );
    const row = current.rows[0];
    assert.ok(row);
    assert.equal(
      previewSessionActive({ tokenHash: row.token_hash, expiresAt: row.expires_at }, token, before),
      true
    );
    assert.equal(
      canAccessEvent(awaitingInactive, previewSessionActive({ tokenHash: row.token_hash, expiresAt: row.expires_at }, token, before), before),
      true
    );

    await db.query("UPDATE admin_sessions SET expires_at = $2 WHERE token_hash = $1", [
      hash,
      "2026-10-01T00:00:00.000Z",
    ]);
    const expired = await db.query<{ token_hash: string; expires_at: string }>(
      "SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash = $1",
      [hash]
    );
    const expiredRow = expired.rows[0];
    assert.equal(
      previewSessionActive(
        { tokenHash: expiredRow.token_hash, expiresAt: expiredRow.expires_at },
        token,
        before
      ),
      false
    );
    assert.equal(bookingAllowed(awaitingInactive, false, before), false);
    await db.close();
  });
});
