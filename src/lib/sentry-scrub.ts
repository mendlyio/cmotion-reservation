import type { Breadcrumb, ErrorEvent } from "@sentry/core";
import type { StreamedSpanJSON } from "@sentry/core";

const FILTERED = "[Filtered]";

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
    )
    .replace(/\b(cmotion_admin|cmotion_session)=[^;\s,]*/gi, `$1=${FILTERED}`);
}

function isSensitiveField(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower === "session_id" ||
    lower === "public_token" ||
    lower === "publictoken" ||
    lower.includes("cookie") ||
    lower.includes("authorization")
  );
}

function scrubInPlace(value: unknown, seen: WeakSet<object>): void {
  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    if (
      value.length === 2 &&
      typeof value[0] === "string" &&
      isSensitiveField(value[0]) &&
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
    if (isSensitiveField(key)) {
      record[key] = FILTERED;
      continue;
    }
    if (typeof entry === "string") {
      record[key] = scrubString(entry);
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
