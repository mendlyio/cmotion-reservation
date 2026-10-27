import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteBooking } from "./pricing";

describe("quoteBooking", () => {
  it("facture 280 € la table VIP, sans plat", () => {
    const quoted = quoteBooking({
      isVip: true,
      guests: Array.from({ length: 8 }, () => ({ mealChoice: "vip_inclus", hasDessert: true })),
      upsells: [],
    });
    assert.deepEqual(quoted, { ok: true, total: 28000 });
  });

  it("refuse un plat sur une table VIP", () => {
    const quoted = quoteBooking({
      isVip: true,
      guests: [{ mealChoice: "lasagne", hasDessert: true }],
      upsells: [],
    });
    assert.equal(quoted.ok, false);
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
    assert.deepEqual(quoted, { ok: true, total: 2800 + 3000 + 450 + 2800 + 1000 * 2 });
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
