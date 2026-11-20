import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Import dynamique exigé par Next.js : Node et Edge ne doivent pas
  // partager le même module d'initialisation.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
