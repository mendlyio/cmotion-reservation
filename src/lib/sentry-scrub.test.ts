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

  it("retire session_id et public_token même hors d'une URL", () => {
    const event = {
      type: undefined,
      request: {
        query_string: [
          ["session_id", "cs_test_secret"],
          ["from", "stripe"],
        ],
      },
      extra: { public_token: TOKEN, publicToken: TOKEN },
    } as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    assert.deepEqual(scrubbed.request?.query_string, [
      ["session_id", "[Filtered]"],
      ["from", "stripe"],
    ]);
    assert.deepEqual(scrubbed.extra, {
      public_token: "[Filtered]",
      publicToken: "[Filtered]",
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
