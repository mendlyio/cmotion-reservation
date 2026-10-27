/** Origine publique du site. Aucun repli vers localhost ni vers l'en-tête Host. */
export function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL manquant : définissez-la dans Vercel pour Production et Preview. Sans cette origine, le paiement Stripe et les emails ne peuvent pas construire leurs liens."
    );
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("NEXT_PUBLIC_BASE_URL invalide");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_BASE_URL invalide");
  }
  return url.origin;
}
