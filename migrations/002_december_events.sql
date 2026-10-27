-- Spectacles Disney des 5 et 6 décembre 2026.
-- À lancer à la main après migrations/001_security.sql et une sauvegarde Neon.
-- Ne pas exécuter deux fois : le bloc s'arrête si ces spectacles existent déjà.

DO $$
DECLARE
  ev_id integer;
  tbl_id integer;
  i integer;
  t integer;
  plan integer[][] := ARRAY[
    ARRAY[1, 5, 1],
    ARRAY[2, 6, 1],
    ARRAY[3, 7, 1],
    ARRAY[4, 7, 0],
    ARRAY[5, 7, 0],
    ARRAY[6, 6, 0],
    ARRAY[7, 7, 0],
    ARRAY[8, 5, 0],
    ARRAY[9, 5, 0]
  ];
  ev record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM events
    WHERE event_date IN (DATE '2026-12-05', DATE '2026-12-06')
      AND name LIKE 'Disney Show%'
  ) THEN
    RAISE EXCEPTION 'Les spectacles Disney Show de décembre 2026 existent déjà';
  END IF;

  FOR ev IN
    SELECT * FROM (VALUES
      ('Disney Show — moins de 12 ans', DATE '2026-12-05', '11h', '-12', 'Disney Show, Centre culturel de Spa, moins de 12 ans'),
      ('Disney Show — plus de 12 ans', DATE '2026-12-05', '17h30', '+12', 'Disney Show, Centre culturel de Spa, plus de 12 ans'),
      ('Disney Show — moins de 12 ans', DATE '2026-12-06', '11h', '-12', 'Disney Show, Centre culturel de Spa, moins de 12 ans'),
      ('Disney Show — plus de 12 ans', DATE '2026-12-06', '17h30', '+12', 'Disney Show, Centre culturel de Spa, plus de 12 ans')
    ) AS v(name, event_date, time_info, age_group, description)
  LOOP
    INSERT INTO events (name, event_date, time_info, age_group, description, is_active, open_at)
    VALUES (
      ev.name,
      ev.event_date,
      ev.time_info,
      ev.age_group,
      ev.description,
      false,
      TIMESTAMP '2026-11-04 19:00:00'
    )
    RETURNING id INTO ev_id;

    FOR i IN 1..array_length(plan, 1) LOOP
      FOR t IN 1..plan[i][2] LOOP
        INSERT INTO tables (event_id, row_number, table_number, seat_count, is_vip)
        VALUES (ev_id, plan[i][1], t, 8, plan[i][3] = 1)
        RETURNING id INTO tbl_id;

        INSERT INTO seats (table_id, seat_number, status)
        SELECT tbl_id, gs, 'available'::seat_status
        FROM generate_series(1, 8) AS gs;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Juin : inactifs, et sans heure d'ouverture, sinon un open_at passé les laisserait réservables.
  UPDATE events
  SET is_active = false, open_at = NULL
  WHERE id IN (19, 20, 21, 22);
END $$;
