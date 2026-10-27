import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideCheckoutCompleted, decideCheckoutExpired } from "./webhook-logic";

const paid = {
  reservationFound: true,
  status: "pending" as const,
  expectedAmount: 28000,
  amountTotal: 28000,
  paymentStatus: "paid",
  currency: "eur",
  hasSeats: true,
};

describe("webhook Stripe", () => {
  it("marque payé quand le montant et la devise correspondent", () => {
    assert.deepEqual(decideCheckoutCompleted(paid), { type: "mark_paid" });
  });

  it("ignore une session qui n'est pas payée", () => {
    assert.deepEqual(decideCheckoutCompleted({ ...paid, paymentStatus: "unpaid" }), { type: "ignore_unpaid" });
  });

  it("alerte si le montant ne correspond pas", () => {
    assert.deepEqual(decideCheckoutCompleted({ ...paid, amountTotal: 100 }), {
      type: "alert",
      reason: "amount_mismatch",
    });
  });

  it("alerte si la réservation est introuvable", () => {
    assert.deepEqual(decideCheckoutCompleted({ ...paid, reservationFound: false, status: null, expectedAmount: null }), {
      type: "alert",
      reason: "missing_reservation",
    });
  });

  it("alerte un paiement tardif sur une réservation échouée", () => {
    assert.deepEqual(decideCheckoutCompleted({ ...paid, status: "failed" }), {
      type: "alert",
      reason: "late_payment",
    });
  });

  it("ne reclasse pas une réservation déjà payée qui a ses places", () => {
    assert.deepEqual(decideCheckoutCompleted({ ...paid, status: "paid" }), { type: "already_paid" });
  });

  it("signale une réservation payée sans places", () => {
    assert.deepEqual(decideCheckoutCompleted({ ...paid, status: "paid", hasSeats: false }), {
      type: "alert",
      reason: "paid_without_seats",
    });
  });

  it("n'échoue une session expirée que si elle est encore en attente", () => {
    assert.equal(decideCheckoutExpired("pending"), "fail");
    assert.equal(decideCheckoutExpired("paid"), "ignore");
    assert.equal(decideCheckoutExpired(null), "ignore");
  });
});
