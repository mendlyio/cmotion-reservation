import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { claimReadyMaintenance, resetReadyMaintenance } from "./ready-maintenance";

describe("maintenance de /api/ready", () => {
  afterEach(() => {
    resetReadyMaintenance(0);
  });

  it("n'accepte qu'un passage toutes les 5 secondes", () => {
    resetReadyMaintenance(0);
    assert.equal(claimReadyMaintenance(10_000), true);
    assert.equal(claimReadyMaintenance(15_000), false);
    assert.equal(claimReadyMaintenance(15_001), true);
  });
});
