import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEAL_EDIT_MESSAGE,
  MEAL_EDIT_POLICY,
  dessertEditable,
  editableDancerMeals,
  editableGuestMeals,
  validateMealEdit,
  type CurrentMealGuest,
  type CurrentMealUpsell,
} from "./meals";

const guest = (id: number, mealChoice: string, hasDessert = false): CurrentMealGuest => ({
  id,
  mealChoice,
  hasDessert,
});

function edit(currentGuests: CurrentMealGuest[], next: CurrentMealGuest[], upsells: CurrentMealUpsell[] = [], nextUpsells = upsells) {
  return validateMealEdit({
    isVip: false,
    currentGuests,
    currentUpsells: upsells,
    guests: next,
    upsells: nextUpsells.map((row) => ({ id: row.id, mealChoice: row.mealChoice ?? "" })),
  });
}

describe("modification des plats au même prix", () => {
  it("centralise la règle sur l'échange au même prix", () => {
    assert.equal(MEAL_EDIT_POLICY.mode, "same-line-price");
    assert.equal(dessertEditable(), false);
    assert.match(MEAL_EDIT_MESSAGE, /28 €/);
    assert.match(MEAL_EDIT_MESSAGE, /dessert/i);
  });

  it("échange lasagne, salade de saison et 1 boulette", () => {
    const current = [guest(1, "lasagne"), guest(2, "salade_saison"), guest(3, "1_boulette_frites")];
    const next = [guest(1, "1_boulette_frites"), guest(2, "lasagne"), guest(3, "salade_saison")];
    assert.deepEqual(edit(current, next), { ok: true });
    assert.deepEqual(
      editableGuestMeals(guest(1, "lasagne")).map((meal) => meal.value).sort(),
      ["1_boulette_frites", "lasagne", "salade_saison"]
    );
  });

  it("refuse le passage de 1 boulette à 2 boulettes", () => {
    const current = [guest(1, "1_boulette_frites")];
    const result = edit(current, [guest(1, "2_boulettes_frites")]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, MEAL_EDIT_MESSAGE);
    assert.deepEqual(
      editableGuestMeals(guest(1, "2_boulettes_frites")).map((meal) => meal.value),
      ["2_boulettes_frites"]
    );
  });

  it("refuse d'ajouter ou de retirer le dessert", () => {
    assert.equal(edit([guest(1, "lasagne", false)], [guest(1, "lasagne", true)]).ok, false);
    assert.equal(edit([guest(1, "lasagne", true)], [guest(1, "lasagne", false)]).ok, false);
    assert.equal(edit([guest(1, "lasagne", true)], [guest(1, "salade_saison", true)]).ok, true);
  });

  it("échange les repas danseur à 10 € et refuse le passage à 12 €", () => {
    const current = [{ id: 4, mealChoice: "une_boulette" }];
    assert.equal(edit([], [], current, [{ id: 4, mealChoice: "lasagne_danseur" }]).ok, true);
    const refused = edit([], [], current, [{ id: 4, mealChoice: "deux_boulettes" }]);
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.equal(refused.error, MEAL_EDIT_MESSAGE);
    assert.deepEqual(
      editableDancerMeals("une_boulette").map((meal) => meal.value).sort(),
      ["lasagne_danseur", "une_boulette"]
    );
    assert.deepEqual(
      editableDancerMeals("deux_boulettes").map((meal) => meal.value),
      ["deux_boulettes"]
    );
  });

  it("laisse la formule VIP sans plat", () => {
    const result = validateMealEdit({
      isVip: true,
      currentGuests: [guest(1, "vip_inclus", true)],
      currentUpsells: [],
      guests: [guest(1, "lasagne", true)],
      upsells: [],
    });
    assert.equal(result.ok, false);
    assert.equal(
      validateMealEdit({
        isVip: true,
        currentGuests: [guest(1, "vip_inclus", true)],
        currentUpsells: [{ id: 9, mealChoice: "une_boulette" }],
        guests: [guest(1, "vip_inclus", true)],
        upsells: [{ id: 9, mealChoice: "lasagne_danseur" }],
      }).ok,
      true
    );
  });

  it("refuse un convive qui n'est pas sur la réservation", () => {
    const result = edit([guest(1, "lasagne")], [guest(2, "lasagne")]);
    assert.equal(result.ok, false);
  });
});
