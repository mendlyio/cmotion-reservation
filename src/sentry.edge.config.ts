import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/sentry-options";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init(sentryInitOptions(dsn));
}
