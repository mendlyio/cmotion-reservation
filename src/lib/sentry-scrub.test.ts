import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ErrorEvent } from "@sentry/core";
import type { StreamedSpanJSON } from "@sentry/core";
import { scrubSentryBreadcrumb, scrubSentryEvent, scrubSentrySpan } from "./sentry-scrub";

const TOKEN = "ab".repeat(16);

describe("masquage Sentry", () => {
  it("retire le jeton des pages confirmation et modifier", () => {
    const event = {
      type: undefined,
      request: {
        url: `https://cmotion.example/confirmation/${TOKEN}?session_id=cs_test_secret&from=stripe`,
      },
      contexts: {
        nextjs: {
          request_path: `/modifier/${TOKEN.toUpperCase()}?session_id=cs_live_secret`,
          router_path: "/modifier/[token]",
        },
      },
      tags: { url: `http://127.0.0.1:3000/confirmation/${TOKEN}` },
    } as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    assert.equal(
      scrubbed.request?.url,
      "https://cmotion.example/confirmation/[token]?session_id=%5BFiltered%5D&from=stripe",
    );
    assert.equal(
      scrubbed.contexts?.nextjs &&
        (scrubbed.contexts.nextjs as { request_path: string }).request_path,
      "/modifier/[token]?session_id=%5BFiltered%5D",
    );
    assert.equal(
      (scrubbed.contexts?.nextjs as { router_path: string }).router_path,
      "/modifier/[token]",
    );
    assert.equal(scrubbed.tags?.url, "http://127.0.0.1:3000/confirmation/[token]");
    assert.equal(JSON.stringify(scrubbed).includes(TOKEN), false);
    assert.equal(JSON.stringify(scrubbed).includes("cs_test_secret"), false);
    assert.equal(JSON.stringify(scrubbed).includes("cs_live_secret"), false);
  });

  it("retire le cookie admin même s'il voyage dans un en-tête", () => {
    const event = {
      type: undefined,
      request: {
        headers: {
          cookie: "cmotion_admin=secret-admin; cmotion_session=secret-session; cmotion_db_ready=1",
          "user-agent": "test",
        },
      },
      extra: {
        "http.request.header.cookie": ["cmotion_admin=secret-admin"],
        authorization: "Bearer secret",
        note: "vu cmotion_admin=secret-admin dans le journal",
      },
    } as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    assert.equal(scrubbed.request?.headers?.cookie, "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["user-agent"], "test");
    assert.equal(scrubbed.extra?.["http.request.header.cookie"], "[Filtered]");
    assert.equal(scrubbed.extra?.authorization, "[Filtered]");
    assert.equal(scrubbed.extra?.note, "vu cmotion_admin=[Filtered] dans le journal");
    assert.equal(JSON.stringify(scrubbed).includes("secret-admin"), false);
    assert.equal(JSON.stringify(scrubbed).includes("secret-session"), false);
  });

  it("retire l'adresse IP et les en-têtes qui la portent", () => {
    const event = {
      type: undefined,
      user: { ip_address: "203.0.113.8" },
      request: {
        headers: {
          "x-forwarded-for": "203.0.113.8",
          "x-real-ip": "203.0.113.8",
          forwarded: "for=203.0.113.8",
          "x-vercel-ip-city": "Spa",
          "x-vercel-ip-country": "BE",
          "x-vercel-ip-latitude": "50.49",
          "user-agent": "test",
        },
      },
    } as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    assert.equal(scrubbed.user?.ip_address, "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["x-forwarded-for"], "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["x-real-ip"], "[Filtered]");
    assert.equal(scrubbed.request?.headers?.forwarded, "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["x-vercel-ip-city"], "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["x-vercel-ip-country"], "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["x-vercel-ip-latitude"], "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["user-agent"], "test");
    assert.equal(JSON.stringify(scrubbed).includes("203.0.113.8"), false);
    assert.equal(JSON.stringify(scrubbed).includes("Spa"), false);
  });

  it("retire le jeton encodé dans l'arbre de navigation", () => {
    const tree = `[["token","${TOKEN}","d"]]`;
    const encoded = encodeURIComponent(tree);
    const event = {
      type: undefined,
      request: {
        headers: {
          "next-router-state-tree": encoded,
          "user-agent": "test",
        },
      },
      extra: {
        parsed: ["token", TOKEN, "d"],
        note: tree,
        encoded,
      },
    } as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);
    const serialized = JSON.stringify(scrubbed);

    assert.equal(scrubbed.request?.headers?.["next-router-state-tree"], "[Filtered]");
    assert.equal(scrubbed.request?.headers?.["user-agent"], "test");
    assert.deepEqual(scrubbed.extra?.parsed, ["token", "[Filtered]", "d"]);
    assert.equal(
      scrubbed.extra?.encoded,
      encoded.replace(TOKEN, encodeURIComponent("[Filtered]")),
    );
    assert.equal(serialized.includes(TOKEN), false);
    assert.equal(
      scrubSentryEvent({
        type: undefined,
        extra: { trace: "a".repeat(32) },
      } as ErrorEvent).extra?.trace,
      "a".repeat(32),
    );
  });

  it("retire session_id et public_token même hors d'une URL", () => {
    const event = {
      type: undefined,
      request: {
        query_string: "session_id=cs_test_secret&from=stripe",
      },
      extra: {
        public_token: TOKEN,
        publicToken: TOKEN,
        pairs: [
          ["session_id", "cs_test_secret"],
          ["from", "stripe"],
        ],
        note: "other_session_id=keep-me",
      },
    } as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    assert.equal(
      scrubbed.request?.query_string,
      "session_id=%5BFiltered%5D&from=stripe",
    );
    assert.deepEqual(scrubbed.extra, {
      public_token: "[Filtered]",
      publicToken: "[Filtered]",
      pairs: [
        ["session_id", "[Filtered]"],
        ["from", "stripe"],
      ],
      note: "other_session_id=keep-me",
    });
  });

  it("masque les traces et le fil d'Ariane", () => {
    const span = {
      trace_id: "a".repeat(32),
      span_id: "b".repeat(16),
      name: `GET /confirmation/${TOKEN}`,
      start_timestamp: 1,
      status: "ok",
      is_segment: true,
      attributes: {
        "url.full": {
          value: `https://cmotion.example/confirmation/${TOKEN}?session_id=cs_test_secret`,
          type: "string",
        },
        "http.target": `/confirmation/${TOKEN}?session_id=cs_test_secret`,
      },
    } as StreamedSpanJSON;

    const scrubbedSpan = scrubSentrySpan(span);
    assert.equal(scrubbedSpan.name, "GET /confirmation/[token]");
    assert.equal(
      (scrubbedSpan.attributes["url.full"] as { value: string }).value,
      "https://cmotion.example/confirmation/[token]?session_id=%5BFiltered%5D",
    );
    assert.equal(
      scrubbedSpan.attributes["http.target"],
      "/confirmation/[token]?session_id=%5BFiltered%5D",
    );
    assert.equal(JSON.stringify(scrubbedSpan).includes(TOKEN), false);

    const crumb = scrubSentryBreadcrumb({
      category: "navigation",
      data: {
        to: `%2Fmodifier%2F${TOKEN}%3Fsession_id%3Dcs_test_secret`,
      },
    });
    assert.equal(
      crumb.data?.to,
      "%2Fmodifier%2F%5Btoken%5D%3Fsession_id%3D%5BFiltered%5D",
    );
    assert.equal(JSON.stringify(crumb).includes("cs_test_secret"), false);
    assert.equal(
      scrubSentryBreadcrumb({
        data: { from: `%2Fconfirmation%2F${TOKEN}%3Fsession_id%3Dcs_live_secret%26from%3Dstripe` },
      }).data?.from,
      "%2Fconfirmation%2F%5Btoken%5D%3Fsession_id%3D%5BFiltered%5D%26from%3Dstripe",
    );
  });

  it("laisse intact un identifiant qui n'est pas un jeton de réservation", () => {
    const event = {
      type: undefined,
      transaction: "GET /api/events",
      request: { url: "https://cmotion.example/reservation/12?cancelled=true" },
    } as ErrorEvent;

    assert.deepEqual(scrubSentryEvent(event), event);
  });
});
