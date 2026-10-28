import { sha256Hex } from "@/lib/security";
import { isAwaitingOpen, isEventOpen, type EventGate } from "@/lib/open";

export type { EventGate };

/**
 * Jeton du cookie admin, ou null s'il n'a pas la forme attendue.
 * Un null évite toute lecture de session en base.
 */
export function adminTokenDigest(token: string | null | undefined): string | null {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;
  return sha256Hex(token);
}

/** Session admin encore valable : empreinte identique et expiration dans le futur. */
export function previewSessionActive(
  session: { tokenHash: string; expiresAt: Date | string } | null | undefined,
  token: string | null | undefined,
  now = new Date()
): boolean {
  const digest = adminTokenDigest(token);
  if (!digest || !session) return false;
  if (session.tokenHash !== digest) return false;
  const expiresAt = new Date(session.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

/**
 * Spectacle visible et réservable.
 * Sans session, seule la règle publique s'applique.
 * Avec session, un spectacle dont l'ouverture est encore devant est inclus, actif ou non.
 */
export function canAccessEvent(event: EventGate, preview: boolean, now = new Date()): boolean {
  if (isEventOpen(event, now)) return true;
  return preview && isAwaitingOpen(event, now);
}

export function bookingAllowed(
  event: EventGate | null | undefined,
  preview: boolean,
  now = new Date()
): boolean {
  if (!event) return false;
  return canAccessEvent(event, preview, now);
}

/**
 * Plan de salle et paiement : inchangés pour le public, y compris si le spectacle
 * n'a pas d'heure d'ouverture. Seul un spectacle pas encore ouvert exige la session.
 */
export function publicFlowAllows(
  event: EventGate | null | undefined,
  preview: boolean,
  now = new Date()
): boolean {
  if (!event || !isAwaitingOpen(event, now)) return true;
  return preview;
}

export function eventsVisibleTo<T extends EventGate>(events: T[], preview: boolean, now = new Date()): T[] {
  return events.filter((event) => canAccessEvent(event, preview, now));
}

/** Seul un retour exact vers l'accueil est accepté. Le logout admin reste sur /admin. */
export function logoutRedirectPath(returnTo: unknown): "/" | "/admin" {
  return returnTo === "/" ? "/" : "/admin";
}
