import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection, tracesSampleRate } from "@/lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate,
    dataCollection: sentryDataCollection,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
