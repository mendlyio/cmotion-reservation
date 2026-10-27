import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getBaseUrl } from "./base-url";

const KEYS = [
  "NEXT_PUBLIC_BASE_URL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function clearEnv() {
  for (const key of KEYS) delete process.env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("origine publique", () => {
  it("retombe sur localhost sans variable", () => {
    clearEnv();
    assert.equal(getBaseUrl(), "http://localhost:3000");
  });

  it("prend NEXT_PUBLIC_BASE_URL sans chemin ni slash final", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_BASE_URL = "https://cmotion.example/chemin/";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "cmotion-reservation.vercel.app";
    assert.equal(getBaseUrl(), "https://cmotion.example");
  });

  it("en production utilise l'URL stable, pas l'URL du déploiement", () => {
    clearEnv();
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "cmotion-reservation.vercel.app/";
    process.env.VERCEL_URL = "cmotion-reservation-abc123.vercel.app";
    assert.equal(getBaseUrl(), "https://cmotion-reservation.vercel.app");
  });

  it("en preview utilise l'URL du déploiement", () => {
    clearEnv();
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "cmotion-reservation.vercel.app";
    process.env.VERCEL_URL = "cmotion-reservation-git-branche.vercel.app";
    assert.equal(getBaseUrl(), "https://cmotion-reservation-git-branche.vercel.app");
  });
});
