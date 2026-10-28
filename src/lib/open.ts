export interface EventGate {
  isActive: boolean;
  openAt: Date | string | null;
}

export function scheduledOpenAt(event: EventGate): Date | null {
  if (!event.openAt) return null;
  const openAt = event.openAt instanceof Date ? event.openAt : new Date(event.openAt);
  if (Number.isNaN(openAt.getTime())) return null;
  return openAt;
}

/**
 * Un spectacle est ouvert s'il est actif, ou si son heure d'ouverture est passée.
 * Une heure d'ouverture future ferme le spectacle même s'il est marqué actif.
 */
export function isEventOpen(event: EventGate, now: Date = new Date()): boolean {
  const openAt = scheduledOpenAt(event);
  if (openAt && openAt.getTime() > now.getTime()) return false;
  if (event.isActive) return true;
  if (openAt && openAt.getTime() <= now.getTime()) return true;
  return false;
}

/** Ouverture programmée, encore dans le futur. Vrai que le spectacle soit actif ou non. */
export function isAwaitingOpen(event: EventGate, now: Date = new Date()): boolean {
  const openAt = scheduledOpenAt(event);
  return openAt !== null && openAt.getTime() > now.getTime();
}
