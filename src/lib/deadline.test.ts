import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canEditMeals, mealEditDeadline } from "./deadline";

describe("date limite J-7", () => {
  it("ferme le 5 décembre à la fin du 28 novembre, heure de Belgique", () => {
    const deadline = mealEditDeadline("2026-12-05");
    assert.equal(deadline.toISOString(), "2026-11-28T22:59:59.999Z");
    assert.equal(canEditMeals("2026-12-05", new Date("2026-11-28T22:59:59.999Z")), true);
    assert.equal(canEditMeals("2026-12-05", new Date("2026-11-28T23:00:00.000Z")), false);
  });

  it("ferme le 6 décembre à la fin du 29 novembre, heure de Belgique", () => {
    const deadline = mealEditDeadline("2026-12-06");
    assert.equal(deadline.toISOString(), "2026-11-29T22:59:59.999Z");
    assert.equal(canEditMeals("2026-12-06", new Date("2026-11-29T22:59:59.999Z")), true);
    assert.equal(canEditMeals("2026-12-06", new Date("2026-11-29T23:00:00.000Z")), false);
  });
});
