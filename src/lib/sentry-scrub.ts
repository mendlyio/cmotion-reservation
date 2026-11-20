import type { Breadcrumb, ErrorEvent } from "@sentry/core";
import type { StreamedSpanJSON } from "@sentry/core";

const FILTERED = "[Filtered]";

const SECRET_KEY = /^(?:session_id|public_token|publictoken)$/i;

function scrubString(value: string): string {
  return value
    .replace(
      /\/(confirmation|modifier)\/[a-f0-9]{32}(?![a-f0-9])/gi,
      "/$1/[token]",
    )
    .replace(
      /%2F(confirmation|modifier)%2F[a-f0-9]{32}(?![a-f0-9])/gi,
      "%2F$1%2F%5Btoken%5D",
    )
    .replace(
      /([?&])session_id=[^&#\s]*/gi,
      (_match, prefix: string) => `${prefix}session_id=${encodeURIComponent(FILTERED)}`,
    )
    .replace(
      /session_id%3D.*?(?=%26|$)/gi,
      `session_id%3D${encodeURIComponent(FILTERED)}`,
    );
}

function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

function scrubInPlace(value: unknown, seen: WeakSet<object>): void {
  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    if (
      value.length === 2 &&
      typeof value[0] === "string" &&
      isSecretKey(value[0]) &&
      typeof value[1] === "string"
    ) {
      value[1] = FILTERED;
      return;
    }
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index];
      if (typeof entry === "string") value[index] = scrubString(entry);
      else scrubInPlace(entry, seen);
    }
    return;
  }

  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const entry = record[key];
    if (typeof entry === "string") {
      record[key] = isSecretKey(key) ? FILTERED : scrubString(entry);
      continue;
    }
    scrubInPlace(entry, seen);
  }
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  scrubInPlace(event, new WeakSet());
  return event;
}

export function scrubSentrySpan(span: StreamedSpanJSON): StreamedSpanJSON {
  scrubInPlace(span, new WeakSet());
  return span;
}

export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  scrubInPlace(breadcrumb, new WeakSet());
  return breadcrumb;
}
