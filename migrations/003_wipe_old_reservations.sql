-- Vidage des réservations des spectacles 19, 20, 21 et 22.
-- Script séparé. Valentin le lance lui-même, après une sauvegarde Neon
-- et un accord explicite. L'application ne l'exécute pas.
-- Il n'y a pas de retour arrière automatique : restaurer la branche de sauvegarde.

BEGIN;

DELETE FROM reservation_upsells
WHERE reservation_id IN (
  SELECT id FROM reservations WHERE event_id IN (19, 20, 21, 22)
);

DELETE FROM reservation_seats
WHERE reservation_id IN (
  SELECT id FROM reservations WHERE event_id IN (19, 20, 21, 22)
);

DELETE FROM holds
WHERE event_id IN (19, 20, 21, 22);

DELETE FROM reservations
WHERE event_id IN (19, 20, 21, 22);

UPDATE seats AS s
SET status = 'available'
FROM tables AS t
WHERE s.table_id = t.id
  AND t.event_id IN (19, 20, 21, 22);

COMMIT;
