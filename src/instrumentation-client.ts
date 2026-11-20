import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init(sentryInitOptions(dsn));
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
