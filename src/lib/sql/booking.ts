/**
 * Requêtes uniques : avec le driver HTTP Neon, chaque appel est une transaction.
 * Les CTE d'écriture voient les RETURNING des CTE précédentes, pas leurs écritures
 * brutes. Un échec (contrainte unique) annule toute la requête.
 */

/** Libère les holds expirés des sièges demandés, sans toucher à un checkout encore pending. */
export const PREPARE_CLAIM_SQL = `
WITH gone AS (
  DELETE FROM holds h
  WHERE h.seat_id = ANY($1::int[])
    AND h.expires_at <= now()
    AND NOT EXISTS (
      SELECT 1
      FROM reservation_seats rs
      INNER JOIN reservations r ON r.id = rs.reservation_id
      WHERE rs.seat_id = h.seat_id
        AND r.stripe_status = 'pending'
    )
  RETURNING h.seat_id
)
UPDATE seats s
SET status = 'available'
WHERE s.id IN (SELECT seat_id FROM gone)
  AND s.status = 'held'
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_seats rs
    INNER JOIN reservations r ON r.id = rs.reservation_id
    WHERE rs.seat_id = s.id
      AND r.stripe_status IN ('paid', 'pending')
  )
`;

/** $1 reservation id, $2 convives jsonb, $3 repas danseur jsonb. Tout ou rien. */
export const UPDATE_MEALS_SQL = `
WITH guests AS (
  SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(id int, meal_choice text, has_dessert boolean)
),
ups AS (
  SELECT * FROM jsonb_to_recordset($3::jsonb) AS x(id int, meal_choice text)
),
gcount AS (
  SELECT count(*)::int AS n FROM reservation_seats WHERE reservation_id = $1
),
ucount AS (
  SELECT count(*)::int AS n FROM reservation_upsells WHERE reservation_id = $1
),
gate AS (
  SELECT 1
  WHERE (SELECT n FROM gcount) = (SELECT count(*)::int FROM guests)
    AND (SELECT n FROM ucount) = (SELECT count(*)::int FROM ups)
    AND (SELECT count(*)::int FROM guests g
         INNER JOIN reservation_seats rs ON rs.id = g.id AND rs.reservation_id = $1) = (SELECT n FROM gcount)
    AND (
      (SELECT n FROM ucount) = 0
      OR (SELECT count(*)::int FROM ups u
          INNER JOIN reservation_upsells ru ON ru.id = u.id AND ru.reservation_id = $1) = (SELECT n FROM ucount)
    )
),
updated_guests AS (
  UPDATE reservation_seats rs
  SET meal_choice = g.meal_choice,
      has_dessert = g.has_dessert
  FROM guests g
  WHERE rs.id = g.id
    AND rs.reservation_id = $1
    AND EXISTS (SELECT 1 FROM gate)
  RETURNING rs.id
),
updated_upsells AS (
  UPDATE reservation_upsells ru
  SET meal_choice = u.meal_choice
  FROM ups u
  WHERE ru.id = u.id
    AND ru.reservation_id = $1
    AND EXISTS (SELECT 1 FROM gate)
  RETURNING ru.id
)
SELECT
  (SELECT count(*)::int FROM updated_guests) AS guests,
  (SELECT count(*)::int FROM updated_upsells) AS upsells
`;

/**
 * Réserve tous les sièges demandés, ou aucun.
 * $1 seat ids, $2 event id, $3 count, $4 session, $5 expires_at
 */
export const CLAIM_SEATS_SQL = `
WITH requested AS (
  SELECT s.id, s.table_id
  FROM seats s
  INNER JOIN tables t ON t.id = s.table_id
  WHERE s.id = ANY($1::int[])
    AND t.event_id = $2
    AND s.status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM holds h
      WHERE h.seat_id = s.id AND h.expires_at > now()
    )
    AND NOT EXISTS (
      SELECT 1
      FROM reservation_seats rs
      INNER JOIN reservations r ON r.id = rs.reservation_id
      WHERE rs.seat_id = s.id
        AND r.stripe_status IN ('paid', 'pending')
    )
  FOR UPDATE OF s
),
gate AS (
  SELECT id, table_id
  FROM requested
  WHERE (SELECT count(*)::int FROM requested) = $3
    AND $3 = (SELECT count(DISTINCT x)::int FROM unnest($1::int[]) AS x)
),
updated AS (
  UPDATE seats
  SET status = 'held'
  WHERE id IN (SELECT id FROM gate)
    AND status = 'available'
  RETURNING id, table_id
)
INSERT INTO holds (session_id, event_id, table_id, seat_id, expires_at)
SELECT $4, $2, u.table_id, u.id, $5
FROM updated u
RETURNING seat_id
`;

/**
 * Crée la réservation, les convives et les repas danseur, ou rien.
 * $1 session, $2 event, $3 seat ids, $4 hold expiry, $5 count,
 * $6 guests jsonb, $7 referent, $8 email, $9 phone, $10 total cents,
 * $11 public token, $12 upsells jsonb
 */
export const INSERT_RESERVATION_SQL = `
WITH held AS (
  SELECT h.seat_id
  FROM holds h
  INNER JOIN seats s ON s.id = h.seat_id AND s.status = 'held'
  WHERE h.session_id = $1
    AND h.event_id = $2
    AND h.expires_at > now()
    AND h.seat_id = ANY($3::int[])
  FOR UPDATE OF h, s
),
extended AS (
  UPDATE holds
  SET expires_at = $4
  WHERE session_id = $1
    AND seat_id IN (SELECT seat_id FROM held)
    AND (SELECT count(*)::int FROM held) = $5
    AND $5 = (SELECT count(*)::int FROM unnest($3::int[]) AS x)
    AND $5 = (
      SELECT count(*)::int
      FROM jsonb_to_recordset($6::jsonb) AS g(seat_id int)
      WHERE g.seat_id IN (SELECT seat_id FROM held)
    )
    AND $5 = (SELECT count(*)::int FROM jsonb_to_recordset($6::jsonb) AS g(seat_id int))
  RETURNING seat_id
),
ins AS (
  INSERT INTO reservations (
    event_id, referent_student, email, phone, total_amount,
    stripe_status, public_token, session_id
  )
  SELECT $2, $7, $8, $9, $10, 'pending', $11, $1
  WHERE (SELECT count(*)::int FROM extended) = $5
  RETURNING id
),
guests AS (
  INSERT INTO reservation_seats (
    reservation_id, seat_id, first_name, last_name, meal_choice, has_dessert
  )
  SELECT ins.id, g.seat_id, g.first_name, g.last_name, g.meal_choice, g.has_dessert
  FROM ins
  CROSS JOIN jsonb_to_recordset($6::jsonb) AS g(
    seat_id int,
    first_name text,
    last_name text,
    meal_choice text,
    has_dessert boolean
  )
  RETURNING id
),
ups AS (
  INSERT INTO reservation_upsells (
    reservation_id, upsell_type, quantity, unit_price, meal_choice
  )
  SELECT ins.id, u.upsell_type, u.quantity, u.unit_price, NULLIF(u.meal_choice, '')
  FROM ins
  CROSS JOIN jsonb_to_recordset($12::jsonb) AS u(
    upsell_type text,
    quantity int,
    unit_price int,
    meal_choice text
  )
  RETURNING id
)
SELECT id FROM ins
`;

/**
 * Passe la réservation en paid et réserve ses sièges dans la même requête.
 * $1 id, $2 session Stripe, $3 montant en centimes.
 * Un montant différent ou un statut autre que pending ne change rien.
 * Le DELETE des holds est référencé par l'UPDATE (UNION) pour qu'il s'exécute.
 */
export const FULFILL_PAID_SQL = `
WITH paid AS (
  UPDATE reservations
  SET stripe_status = 'paid', stripe_payment_id = $2
  WHERE id = $1
    AND stripe_status = 'pending'
    AND total_amount = $3
  RETURNING id
),
target AS (
  SELECT seat_id
  FROM reservation_seats
  WHERE reservation_id IN (SELECT id FROM paid)
),
cleared AS (
  DELETE FROM holds
  WHERE seat_id IN (SELECT seat_id FROM target)
  RETURNING seat_id
),
reserved AS (
  UPDATE seats
  SET status = 'reserved'
  WHERE id IN (
    SELECT seat_id FROM target
    UNION
    SELECT seat_id FROM cleared
  )
  RETURNING id
)
SELECT
  (SELECT id FROM paid) AS id,
  (SELECT count(*)::int FROM reserved) AS seats
`;

export const FAIL_PENDING_SQL = `
WITH marked AS (
  UPDATE reservations
  SET stripe_status = 'failed'
  WHERE id = $1 AND stripe_status = 'pending'
  RETURNING id
),
dropped AS (
  DELETE FROM reservation_seats
  WHERE reservation_id IN (SELECT id FROM marked)
  RETURNING seat_id
),
gone AS (
  DELETE FROM holds
  WHERE seat_id IN (SELECT seat_id FROM dropped)
  RETURNING seat_id
)
UPDATE seats
SET status = 'available'
WHERE id IN (SELECT seat_id FROM dropped)
  AND status = 'held'
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_seats rs
    INNER JOIN reservations r ON r.id = rs.reservation_id
    WHERE rs.seat_id = seats.id
      AND r.stripe_status IN ('paid', 'pending')
  )
`;

/** Abandonne les réservations pending de la session et rend les sièges. */
export const RELEASE_SESSION_SQL = `
WITH doomed AS (
  UPDATE reservations
  SET stripe_status = 'failed'
  WHERE session_id = $1 AND stripe_status = 'pending'
  RETURNING id
),
dropped AS (
  DELETE FROM reservation_seats
  WHERE reservation_id IN (SELECT id FROM doomed)
  RETURNING seat_id
),
dropped_holds AS (
  DELETE FROM holds WHERE session_id = $1
  RETURNING seat_id
)
UPDATE seats
SET status = 'available'
WHERE status = 'held'
  AND id IN (
    SELECT seat_id FROM dropped
    UNION
    SELECT seat_id FROM dropped_holds
  )
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_seats rs
    INNER JOIN reservations r ON r.id = rs.reservation_id
    WHERE rs.seat_id = seats.id
      AND r.stripe_status IN ('paid', 'pending')
  )
`;

/**
 * Pending sans session Stripe, sièges held orphelins, holds expirés sans checkout.
 * Répare aussi une réservation déjà paid dont les sièges sont restés held
 * (ancien enchaînement en deux requêtes interrompu après le paiement).
 */
export const FAST_CLEANUP_SQL = `
WITH stale AS (
  SELECT r.id
  FROM reservations r
  WHERE r.stripe_status = 'pending'
    AND r.stripe_payment_id IS NULL
    AND r.created_at < now() - interval '2 minutes'
    AND NOT EXISTS (
      SELECT 1
      FROM reservation_seats rs
      INNER JOIN holds h ON h.seat_id = rs.seat_id
      WHERE rs.reservation_id = r.id
        AND h.expires_at > now()
    )
),
marked AS (
  UPDATE reservations
  SET stripe_status = 'failed'
  WHERE id IN (SELECT id FROM stale)
    AND stripe_status = 'pending'
  RETURNING id
),
dropped AS (
  DELETE FROM reservation_seats rs
  USING marked
  WHERE rs.reservation_id = marked.id
  RETURNING rs.seat_id
),
expired_holds AS (
  DELETE FROM holds h
  WHERE h.expires_at <= now()
    AND NOT EXISTS (
      SELECT 1
      FROM reservation_seats rs
      INNER JOIN reservations r ON r.id = rs.reservation_id
      WHERE rs.seat_id = h.seat_id
        AND r.stripe_status = 'pending'
    )
  RETURNING h.seat_id
),
reserved_holds AS (
  DELETE FROM holds h
  USING seats s
  WHERE s.id = h.seat_id
    AND s.status = 'reserved'
  RETURNING h.seat_id
),
paid_held AS (
  SELECT rs.seat_id
  FROM reservation_seats rs
  INNER JOIN reservations r ON r.id = rs.reservation_id
  INNER JOIN seats s ON s.id = rs.seat_id
  WHERE r.stripe_status = 'paid'
    AND s.status = 'held'
),
drop_paid_holds AS (
  DELETE FROM holds h
  WHERE h.seat_id IN (SELECT seat_id FROM paid_held)
  RETURNING h.seat_id
),
fix_paid_seats AS (
  UPDATE seats s
  SET status = 'reserved'
  WHERE s.status = 'held'
    AND s.id IN (
      SELECT seat_id FROM paid_held
      UNION
      SELECT seat_id FROM drop_paid_holds
    )
  RETURNING s.id
)
UPDATE seats s
SET status = 'available'
WHERE s.status = 'held'
  AND NOT EXISTS (SELECT 1 FROM fix_paid_seats f WHERE f.id = s.id)
  AND NOT EXISTS (
    SELECT 1 FROM holds h
    WHERE h.seat_id = s.id AND h.expires_at > now()
  )
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_seats rs
    INNER JOIN reservations r ON r.id = rs.reservation_id
    WHERE rs.seat_id = s.id
      AND r.stripe_status IN ('paid', 'pending')
  )
`;
