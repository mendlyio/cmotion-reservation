import type { DataCollection } from "@sentry/core";
import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentrySpan,
} from "@/lib/sentry-scrub";

/**
 * 10 % en production, 100 % en développement.
 * Le DSN n'est jamais écrit ici : il vient de l'environnement.
 */
export const tracesSampleRate = process.env.NODE_ENV === "development" ? 1.0 : 0.1;

/**
 * Le cookie d'admin (`cmotion_admin`) n'est pas couvert par la liste
 * de filtrage du SDK. On n'envoie ni cookies, ni corps HTTP, ni
 * paramètres de requêtes SQL, ni variables locales, ni query string.
 * Les jetons de chemin, y compris dans l'arbre de navigation Next.js,
 * sont retirés ensuite par le masquage. L'en-tête Cookie est refusé
 * en plus : `cmotion_admin` n'est pas dans la liste de noms sensibles
 * du SDK. `userInfo` reste coupé, et les en-têtes `-ip` aussi, pour
 * ne pas exporter l'adresse ni la localisation des invités.
 */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: {
      deny: [
        "cookie",
        "authorization",
        "forwarded",
        "-ip",
        "router-state-tree",
      ],
    },
    response: { deny: ["cookie", "authorization"] },
  },
  httpBodies: [],
  databaseQueryData: false,
  stackFrameVariables: false,
  urlQueryParams: false,
} satisfies DataCollection;

export function sentryInitOptions(dsn: string) {
  return {
    dsn,
    tracesSampleRate,
    dataCollection: sentryDataCollection,
    beforeSend: scrubSentryEvent,
    beforeSendSpan: scrubSentrySpan,
    beforeBreadcrumb: scrubSentryBreadcrumb,
  };
}
