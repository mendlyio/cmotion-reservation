/**
 * Origine publique, sans slash final et sans l'en-tête Host.
 * 1. NEXT_PUBLIC_BASE_URL si elle est définie
 * 2. en production : https://VERCEL_PROJECT_PRODUCTION_URL
 * 3. en preview : https://VERCEL_URL
 * 4. en dev : http://localhost:3000
 * En production, les retours Stripe et les liens d'e-mail passent par cette
 * origine stable, jamais par l'URL d'un déploiement de preview.
 */
const DEV_ORIGIN = "http://localhost:3000";

function origin(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getBaseUrl(): string {
  const explicit = origin(process.env.NEXT_PUBLIC_BASE_URL);
  if (explicit) return explicit;

  if (process.env.VERCEL_ENV === "production") {
    const production = origin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    if (production) return production;
  }

  if (process.env.VERCEL_ENV === "preview") {
    const preview = origin(process.env.VERCEL_URL);
    if (preview) return preview;
  }

  return DEV_ORIGIN;
}
