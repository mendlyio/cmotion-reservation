import type { DataCollection } from "@sentry/core";

/**
 * 10 % en production, 100 % en développement.
 * Le DSN n'est jamais écrit ici : il vient de l'environnement.
 */
export const tracesSampleRate = process.env.NODE_ENV === "development" ? 1.0 : 0.1;

/**
 * Le cookie d'admin (`cmotion_admin`) n'est pas couvert par la liste
 * de filtrage du SDK. On n'envoie ni cookies, ni corps HTTP, ni
 * paramètres de requêtes SQL, ni variables locales.
 */
export const sentryDataCollection = {
  cookies: false,
  httpBodies: [],
  databaseQueryData: false,
  stackFrameVariables: false,
} satisfies DataCollection;
