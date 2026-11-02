import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DANCER_MEAL_OPTIONS, MEAL_OPTIONS, mealLabel, quoteBooking } from "./pricing";

describe("quoteBooking", () => {
  it("aligne les tarifs plats et repas élève", () => {
    const guest = (value: string) => MEAL_OPTIONS.find((meal) => meal.value === value)?.price;
    assert.equal(guest("1_boulette_frites"), 2800);
    assert.equal(guest("2_boulettes_frites"), 3000);
    assert.equal(guest("lasagne"), 3000);
    assert.equal(guest("salade_saison"), 3000);
    const dancer = (value: string) => DANCER_MEAL_OPTIONS.find((meal) => meal.value === value)?.price;
    assert.equal(dancer("une_boulette"), 1200);
    assert.equal(dancer("lasagne_danseur"), 1400);
    assert.equal(dancer("salade_saison_danseur"), 1400);
    assert.equal(dancer("deux_boulettes"), 1400);
    assert.equal(mealLabel("vip_inclus"), "Formule VIP (plat non renseigné)");
  });

  it("facture 280 € la table VIP, plats inclus sans supplément", () => {
    const quoted = quoteBooking({
      isVip: true,
      guests: [
        { mealChoice: "lasagne", hasDessert: true },
        { mealChoice: "salade_saison", hasDessert: true },
        { mealChoice: "1_boulette_frites", hasDessert: false },
        { mealChoice: "2_boulettes_frites", hasDessert: true },
      ],
      upsells: [{ type: "repas_danseur", quantity: 1, mealChoice: "une_boulette" }],
    });
    assert.deepEqual(quoted, { ok: true, total: 28000 + 1200 });
  });

  it("refuse un plat inconnu ou l'ancien code VIP sans choix", () => {
    const unknown = quoteBooking({
      isVip: true,
      guests: [{ mealChoice: "menu_surprise", hasDessert: true }],
      upsells: [],
    });
    const legacy = quoteBooking({
      isVip: true,
      guests: [{ mealChoice: "vip_inclus", hasDessert: true }],
      upsells: [],
    });
    assert.equal(unknown.ok, false);
    assert.equal(legacy.ok, false);
  });

  it("additionne les plats, le dessert et le repas élève", () => {
    const quoted = quoteBooking({
      isVip: false,
      guests: [
        { mealChoice: "lasagne", hasDessert: false },
        { mealChoice: "2_boulettes_frites", hasDessert: true },
        { mealChoice: "salade_saison", hasDessert: false },
      ],
      upsells: [{ type: "repas_danseur", quantity: 2, mealChoice: "lasagne_danseur" }],
    });
    assert.deepEqual(quoted, { ok: true, total: 3000 + 3000 + 450 + 3000 + 1400 * 2 });
  });

  it("facture la salade élève à 14 €", () => {
    const quoted = quoteBooking({
      isVip: false,
      guests: [{ mealChoice: "1_boulette_frites", hasDessert: false }],
      upsells: [
        { type: "repas_danseur", quantity: 1, mealChoice: "une_boulette" },
        { type: "repas_danseur", quantity: 1, mealChoice: "salade_saison_danseur" },
      ],
    });
    assert.deepEqual(quoted, { ok: true, total: 2800 + 1200 + 1400 });
  });

  it("refuse un plat inconnu, y compris l'ancienne salade grecque", () => {
    const unknown = quoteBooking({
      isVip: false,
      guests: [{ mealChoice: "menu_surprise", hasDessert: false }],
      upsells: [],
    });
    const legacy = quoteBooking({
      isVip: false,
      guests: [{ mealChoice: "salade_grecque", hasDessert: false }],
      upsells: [],
    });
    assert.equal(unknown.ok, false);
    assert.equal(legacy.ok, false);
  });

  it("refuse une quantité de repas élève hors limites", () => {
    const quoted = quoteBooking({
      isVip: false,
      guests: [{ mealChoice: "1_boulette_frites", hasDessert: false }],
      upsells: [{ type: "repas_danseur", quantity: 9, mealChoice: "une_boulette" }],
    });
    assert.equal(quoted.ok, false);
  });
});
