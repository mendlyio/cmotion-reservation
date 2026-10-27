-- Lot sécurité. À lancer UNE FOIS sur la base, avant ou en même temps que le déploiement.
-- Ne supprime aucune réservation. Prévoir une branche Neon de sauvegarde avant.
-- Nécessite pgcrypto (disponible sur Neon).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS public_token text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS session_id text;

UPDATE reservations
SET public_token = encode(gen_random_bytes(16), 'hex')
WHERE public_token IS NULL;

ALTER TABLE reservations ALTER COLUMN public_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE reservations ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_public_token_unique ON reservations (public_token);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_stripe_payment_id_unique
  ON reservations (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id serial PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_limits (
  id serial PRIMARY KEY,
  bucket text NOT NULL,
  ip text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_limits_lookup ON request_limits (bucket, ip, created_at);

COMMIT;
