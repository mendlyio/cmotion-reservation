import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentDisposition } from "./content-disposition";

const SHOW = "Disney Show — moins de 12 ans";

describe("Content-Disposition", () => {
  it("met le tiret cadratin, les accents et l'apostrophe hors du nom ASCII", () => {
    const value = contentDisposition(`cmotion-${SHOW}-2026-12-05-complet.csv`);
    const ascii = value.match(/filename="([^"]*)"/)?.[1] ?? "";
    assert.equal(ascii, "cmotion-disney-show-moins-de-12-ans-2026-12-05-complet.csv");
    assert.match(ascii, /^[\u0020-\u007e]+$/);
    assert.match(value, /filename\*=UTF-8''/);
    assert.match(value, /%E2%80%94/);
    new Headers({ "Content-Disposition": value });
  });

  it("garde un nom lisible pour les fiches, le récap et l'Excel", () => {
    for (const filename of [
      `fiches-${SHOW} d'hiver.pdf`,
      `recap-Noël — l'élève.pdf`,
      `commandes-${SHOW}.xlsx`,
    ]) {
      const value = contentDisposition(filename);
      const ascii = value.match(/filename="([^"]+)"/)?.[1] ?? "";
      assert.match(ascii, /^[a-z0-9.-]+$/);
      assert.match(value, /filename\*=UTF-8''/);
      new Headers({ "Content-Disposition": value });
    }
  });
});
