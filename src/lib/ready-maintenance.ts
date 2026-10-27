/** Une maintenance de /api/ready toutes les 5 secondes, par instance. */
export const READY_MAINTENANCE_INTERVAL_MS = 5000;

let lastMaintenance = 0;

/**
 * Réserve le créneau de maintenance. Le premier appel dans la fenêtre
 * renvoie true et les suivants false, jusqu'à ce que 5 secondes soient passées.
 */
export function claimReadyMaintenance(now = Date.now()): boolean {
  if (now - lastMaintenance > READY_MAINTENANCE_INTERVAL_MS) {
    lastMaintenance = now;
    return true;
  }
  return false;
}

export function resetReadyMaintenance(at = 0): void {
  lastMaintenance = at;
}
