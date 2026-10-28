import { verifyAdmin } from "@/lib/admin";
import {
  bookingAllowed,
  publicFlowAllows,
  type EventGate,
} from "@/lib/event-access";
import { isAwaitingOpen, isEventOpen } from "@/lib/open";

/** Réservation, hold, fiche spectacle. La session n'est lue que si l'ouverture est encore devant. */
export async function guardEvent(event: EventGate | null | undefined, now = new Date()): Promise<boolean> {
  if (!event) return false;
  if (isEventOpen(event, now)) return true;
  if (!isAwaitingOpen(event, now)) return false;
  return bookingAllowed(event, await verifyAdmin(), now);
}

/** Plan et paiement : le public garde le comportement actuel, sauf spectacle pas encore ouvert. */
export async function guardPublicFlow(
  event: EventGate | null | undefined,
  now = new Date()
): Promise<boolean> {
  if (publicFlowAllows(event, false, now)) return true;
  return publicFlowAllows(event, await verifyAdmin(), now);
}
