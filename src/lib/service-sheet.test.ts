import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";
import { formatReferentDisplay } from "./referent";
import { buildFiche, buildRecaps } from "./service-sheet";
import { renderFichesPdf } from "./pdf/documents";

function pdfPlainText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const chunks = [raw];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      chunks.push(inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"));
    } catch {
      chunks.push(match[1]);
    }
  }
  return chunks.join("\n").replace(/<([0-9A-Fa-f]+)>/g, (full, hex: string) => {
    if (hex.length % 2 !== 0) return full;
    return Buffer.from(hex, "hex").toString("latin1");
  });
}

describe("fiche imprimable", () => {
  it("titre le feuillet par le nom puis le prénom", () => {
    const fiche = buildFiche({
      timeInfo: "18h00",
      referent: formatReferentDisplay({ referentLastName: "Dupont", referentFirstName: "Marie" }),
      referentLastName: "Dupont",
      referentFirstName: "Marie",
      guests: [{ tableNumber: 4, place: "4A", mealChoice: "lasagne", hasDessert: false }],
      extras: [],
    });
    assert.equal(fiche.title, "18h00 Dupont Marie");
    assert.equal(fiche.referentLastName, "Dupont");
    assert.equal(fiche.referentFirstName, "Marie");
    assert.equal(fiche.rows[0].place, "4A");
  });

  it("compte la salade élève avec les salades, à part des convives", () => {
    const [recap] = buildRecaps({
      timeInfo: "18h00",
      reservations: [
        {
          guests: [{ tableNumber: 4, place: "4A", mealChoice: "salade_saison", hasDessert: true }],
          extras: [{ mealChoice: "salade_saison_danseur", quantity: 2 }],
        },
      ],
    });
    const salade = recap.lines.find((line) => line.key === "salade");
    assert.equal(salade?.parents, 1);
    assert.equal(salade?.eleves, 2);
  });

  it("écrit les deux parties sur le PDF", async () => {
    const bytes = await renderFichesPdf({
      timeInfo: "18h00",
      reservations: [
        {
          referentLastName: "Dupont",
          referentFirstName: "Marie",
          guests: [{ tableNumber: 4, place: "4A", mealChoice: "lasagne", hasDessert: true }],
          extras: [],
        },
      ],
    });
    const raw = pdfPlainText(bytes);
    assert.match(raw, /Dupont/);
    assert.match(raw, /Marie/);
    assert.match(raw, /Nom :/);
    assert.match(raw, /Prénom :/);
  });
});
