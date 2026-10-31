import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareReferentNames,
  formatReferentDisplay,
  hasSplitReferent,
  referentCsvCells,
  referentMailLines,
  referentParts,
  sortByReferentName,
} from "./referent";

describe("élève référent", () => {
  it("affiche le nom puis le prénom", () => {
    const source = { referentLastName: " Dupont ", referentFirstName: "Marie" };
    assert.deepEqual(referentParts(source), { lastName: "Dupont", firstName: "Marie" });
    assert.equal(formatReferentDisplay(source), "Dupont Marie");
    assert.equal(hasSplitReferent(source), true);
    assert.deepEqual(referentCsvCells(source), ["Dupont", "Marie"]);
    assert.deepEqual(referentMailLines(source), [
      { label: "Nom de l'élève référent", value: "Dupont" },
      { label: "Prénom de l'élève référent", value: "Marie" },
    ]);
  });

  it("conserve l'ancienne saisie unique dans la colonne nom", () => {
    const source = { referentStudent: "Pere Carly", referentLastName: null, referentFirstName: null };
    assert.equal(hasSplitReferent(source), false);
    assert.deepEqual(referentParts(source), { lastName: "Pere Carly", firstName: "" });
    assert.equal(formatReferentDisplay(source), "Pere Carly");
    assert.deepEqual(referentCsvCells(source), ["Pere Carly", ""]);
    assert.deepEqual(referentMailLines(source), [{ label: "Élève référent", value: "Pere Carly" }]);
  });

  it("trie par nom puis par prénom, accents et casse ignorés, identifiant en dernier", () => {
    const rows = [
      { id: 5, referentLastName: "Martin", referentFirstName: "Lucie" },
      { id: 1, referentStudent: "Bernard Paul" },
      { id: 8, referentLastName: "Dupont", referentFirstName: "Zoé" },
      { id: 4, referentLastName: "dupont", referentFirstName: "Adam" },
      { id: 7, referentLastName: "Émile", referentFirstName: "Anne" },
      { id: 2, referentLastName: "emile", referentFirstName: "Anne" },
    ];
    assert.deepEqual(
      sortByReferentName(rows).map((row) => row.id),
      [1, 4, 8, 2, 7, 5]
    );
    assert.equal(
      compareReferentNames(
        { referentLastName: "Émile", referentFirstName: "Anne" },
        { referentLastName: "emile", referentFirstName: "Anne" }
      ),
      0
    );
  });
});
