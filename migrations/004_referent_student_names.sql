-- Nom et prénom de l'élève référent.
-- À lancer une fois sur Neon, avant le déploiement de cette version.
-- Additive et rétrocompatible : la colonne referent_student est conservée.
-- Les nouvelles colonnes restent nullables pour les réservations déjà enregistrées.
-- Le formulaire exige les deux champs. L'application recopie aussi « Nom Prénom »
-- dans referent_student, pour les lectures qui s'appuient encore sur l'ancienne colonne.
-- Aucun découpage automatique de l'ancien texte : il n'est pas fiable.

BEGIN;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS referent_last_name text;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS referent_first_name text;

COMMIT;
