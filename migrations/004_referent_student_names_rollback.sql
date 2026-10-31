-- Retire uniquement les colonnes ajoutées par 004_referent_student_names.sql.
-- referent_student n'est pas modifiée. Les noms séparés saisis après la migration sont perdus.

BEGIN;

ALTER TABLE reservations DROP COLUMN IF EXISTS referent_first_name;
ALTER TABLE reservations DROP COLUMN IF EXISTS referent_last_name;

COMMIT;
