import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getBaseUrl } from "./base-url";

const KEY = "NEXT_PUBLIC_BASE_URL";
const previous = process.env[KEY];

afterEach(() => {
  if (previous === undefined) delete process.env[KEY];
  else process.env[KEY] = previous;
});

describe("NEXT_PUBLIC_BASE_URL", () => {
  it("signale explicitement l'absence de la variable", () => {
    delete process.env[KEY];
    assert.throws(() => getBaseUrl(), /NEXT_PUBLIC_BASE_URL manquant/);
  });

  it("accepte une origine http ou https", () => {
    process.env[KEY] = "https://cmotion.example/chemin";
    assert.equal(getBaseUrl(), "https://cmotion.example");
  });
});
