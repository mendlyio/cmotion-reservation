-- Annule 001_security.sql. À n'utiliser qu'en revenant aussi au code précédent :
-- les pages de confirmation et le login admin de la nouvelle version en dépendent.

BEGIN;

DROP TABLE IF EXISTS request_limits;
DROP TABLE IF EXISTS admin_sessions;
DROP INDEX IF EXISTS reservations_stripe_payment_id_unique;
DROP INDEX IF EXISTS reservations_public_token_unique;
ALTER TABLE reservations DROP COLUMN IF EXISTS session_id;
ALTER TABLE reservations DROP COLUMN IF EXISTS public_token;

COMMIT;
