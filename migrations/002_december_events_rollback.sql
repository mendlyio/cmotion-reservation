-- Retour arrière du script 002.
-- Supprime les spectacles Disney Show des 5 et 6 décembre 2026
-- et tout ce qui y est rattaché (tables, sièges, réservations).
-- Ne lancer ce script qu'avant l'ouverture des ventes, ou après une sauvegarde
-- si des places ont déjà été vendues : ces ventes disparaîtraient.
-- Les spectacles 21 et 22 redeviennent actifs. 19 et 20 restent inactifs.

DELETE FROM events
WHERE event_date IN (DATE '2026-12-05', DATE '2026-12-06')
  AND name LIKE 'Disney Show%';

UPDATE events
SET is_active = true
WHERE id IN (21, 22);
