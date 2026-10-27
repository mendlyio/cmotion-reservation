import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPdfText } from "./text";

describe("texte PDF", () => {
  it("traduit œ, l'euro et l'apostrophe typographique sans perdre les accents Latin-1", () => {
    assert.equal(toPdfText("cœur 28 € l’élève"), "coeur 28 EUR l'élève");
  });

  it("ne remplace pas un signe inconnu par une espace", () => {
    assert.equal(toPdfText("Œuvre — 10 €"), "OEuvre - 10 EUR");
    assert.equal(toPdfText("naïve\u2605"), "naïve");
  });
});
