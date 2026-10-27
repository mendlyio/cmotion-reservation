export interface EventGate {
  isActive: boolean;
  openAt: Date | string | null;
}

/**
 * Un spectacle est ouvert s'il est actif, ou si son heure d'ouverture est passée.
 * Une heure d'ouverture future ferme le spectacle même s'il est marqué actif.
 */
export function isEventOpen(event: EventGate, now: Date = new Date()): boolean {
  const openAt = event.openAt ? new Date(event.openAt) : null;
  const hasOpenAt = openAt !== null && !Number.isNaN(openAt.getTime());
  if (hasOpenAt && openAt.getTime() > now.getTime()) return false;
  if (event.isActive) return true;
  if (hasOpenAt && openAt.getTime() <= now.getTime()) return true;
  return false;
}
