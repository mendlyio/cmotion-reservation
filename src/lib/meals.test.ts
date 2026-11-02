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
    assert.match(MEAL_EDIT_MESSAGE, /Lasagne au poulet, salade de saison et 2 boulettes \(30 €\) s'échangent entre eux/);
    assert.match(MEAL_EDIT_MESSAGE, /1 boulette \(28 €\) ne peut passer qu'à un autre plat à 28 €/);
    assert.match(MEAL_EDIT_MESSAGE, /sans autre plat à ce prix, elle reste figée/);
    assert.match(MEAL_EDIT_MESSAGE, /Le dessert reste figé/);
    assert.match(MEAL_EDIT_MESSAGE, /Le montant déjà payé ne change pas/);
    assert.doesNotMatch(MEAL_EDIT_MESSAGE, /salade de saison et 1 boulette/);
  });

  it("échange lasagne, salade de saison et 2 boulettes à 30 €", () => {
    const current = [guest(1, "lasagne"), guest(2, "salade_saison"), guest(3, "2_boulettes_frites")];
    const next = [guest(1, "2_boulettes_frites"), guest(2, "lasagne"), guest(3, "salade_saison")];
    assert.deepEqual(edit(current, next), { ok: true });
    assert.deepEqual(
      editableGuestMeals(guest(1, "lasagne")).map((meal) => meal.value).sort(),
      ["2_boulettes_frites", "lasagne", "salade_saison"]
    );
  });

  it("refuse le passage de 1 boulette à 2 boulettes", () => {
    const current = [guest(1, "1_boulette_frites")];
    const result = edit(current, [guest(1, "2_boulettes_frites")]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, MEAL_EDIT_MESSAGE);
    assert.deepEqual(
      editableGuestMeals(guest(1, "1_boulette_frites")).map((meal) => meal.value),
      ["1_boulette_frites"]
    );
    assert.deepEqual(
      editableGuestMeals(guest(1, "2_boulettes_frites")).map((meal) => meal.value).sort(),
      ["2_boulettes_frites", "lasagne", "salade_saison"]
    );
  });

  it("refuse d'ajouter ou de retirer le dessert", () => {
    assert.equal(edit([guest(1, "lasagne", false)], [guest(1, "lasagne", true)]).ok, false);
    assert.equal(edit([guest(1, "lasagne", true)], [guest(1, "lasagne", false)]).ok, false);
    assert.equal(edit([guest(1, "lasagne", true)], [guest(1, "salade_saison", true)]).ok, true);
  });

  it("échange les repas élève à 14 € et refuse le passage depuis 12 €", () => {
    const current = [{ id: 4, mealChoice: "lasagne_danseur" }];
    assert.equal(edit([], [], current, [{ id: 4, mealChoice: "salade_saison_danseur" }]).ok, true);
    assert.equal(edit([], [], current, [{ id: 4, mealChoice: "deux_boulettes" }]).ok, true);
    const refused = edit([], [], [{ id: 4, mealChoice: "une_boulette" }], [{ id: 4, mealChoice: "lasagne_danseur" }]);
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.equal(refused.error, MEAL_EDIT_MESSAGE);
    assert.deepEqual(
      editableDancerMeals("lasagne_danseur").map((meal) => meal.value).sort(),
      ["deux_boulettes", "lasagne_danseur", "salade_saison_danseur"]
    );
    assert.deepEqual(
      editableDancerMeals("une_boulette").map((meal) => meal.value),
      ["une_boulette"]
    );
  });

  it("laisse choisir le plat VIP inclus, dessert compris", () => {
    assert.equal(
      validateMealEdit({
        isVip: true,
        currentGuests: [guest(1, "vip_inclus", true)],
        currentUpsells: [],
        guests: [guest(1, "lasagne", true)],
        upsells: [],
      }).ok,
      true
    );
    assert.equal(
      validateMealEdit({
        isVip: true,
        currentGuests: [guest(1, "lasagne", true)],
        currentUpsells: [],
        guests: [guest(1, "2_boulettes_frites", true)],
        upsells: [],
      }).ok,
      true
    );
    assert.equal(
      validateMealEdit({
        isVip: true,
        currentGuests: [guest(1, "lasagne", true)],
        currentUpsells: [],
        guests: [guest(1, "lasagne", false)],
        upsells: [],
      }).ok,
      false
    );
    assert.equal(
      validateMealEdit({
        isVip: true,
        currentGuests: [guest(1, "vip_inclus", true)],
        currentUpsells: [],
        guests: [guest(1, "vip_inclus", true)],
        upsells: [],
      }).ok,
      false
    );
    assert.deepEqual(
      editableGuestMeals(guest(1, "vip_inclus", true), { isVip: true }).map((meal) => meal.value).sort(),
      ["1_boulette_frites", "2_boulettes_frites", "lasagne", "salade_saison"]
    );
  });

  it("refuse un convive qui n'est pas sur la réservation", () => {
    const result = edit([guest(1, "lasagne")], [guest(2, "lasagne")]);
    assert.equal(result.ok, false);
  });
});
