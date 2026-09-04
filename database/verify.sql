\set ON_ERROR_STOP on

DO $$
DECLARE
  missing_index TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'PostGIS non è attiva.';
  END IF;

  IF (SELECT COUNT(*) FROM users) <> 6 THEN
    RAISE EXCEPTION 'Conteggio utenti non valido.';
  END IF;

  IF (SELECT COUNT(*) FROM categories) <> 8 THEN
    RAISE EXCEPTION 'Conteggio categorie non valido.';
  END IF;

  IF (SELECT COUNT(*) FROM books) <> 18 THEN
    RAISE EXCEPTION 'Conteggio libri non valido.';
  END IF;

  IF (SELECT COUNT(*) FROM loan_requests) <> 5 THEN
    RAISE EXCEPTION 'Conteggio richieste non valido.';
  END IF;

  IF (SELECT COUNT(*) FROM book_views) <> 36 THEN
    RAISE EXCEPTION 'Conteggio visualizzazioni non valido.';
  END IF;

  IF (SELECT COUNT(*) FROM users WHERE location_consent_at IS NOT NULL) <> 5 THEN
    RAISE EXCEPTION 'Fixture di consenso geografico non valida.';
  END IF;

  IF NOT ST_DWithin(
    (SELECT location FROM users WHERE email = 'user1@example.test'),
    (SELECT location FROM users WHERE email = 'user2@example.test'),
    1000
  ) THEN
    RAISE EXCEPTION 'Le fixture geografiche vicine non sono entro un chilometro.';
  END IF;

  IF ST_DWithin(
    (SELECT location FROM users WHERE email = 'user1@example.test'),
    (SELECT location FROM users WHERE email = 'user2@example.test'),
    500
  ) THEN
    RAISE EXCEPTION 'Le fixture geografiche non distinguono i raggi di 500 m e 1 km.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users
    WHERE password_hash !~ '^\$2[aby]\$12\$'
  ) THEN
    RAISE EXCEPTION 'Il seed contiene una password non hashata o con costo inatteso.';
  END IF;

  IF (
    SELECT ARRAY_AGG(status ORDER BY status::TEXT)
    FROM (SELECT DISTINCT status FROM loan_requests) AS statuses
  ) <> ARRAY[
    'ACCEPTED'::loan_status,
    'CANCELLED'::loan_status,
    'PENDING'::loan_status,
    'REJECTED'::loan_status,
    'RETURNED'::loan_status
  ] THEN
    RAISE EXCEPTION 'Il seed non copre tutti gli stati delle richieste.';
  END IF;

  SELECT expected.index_name
  INTO missing_index
  FROM (
    VALUES
      ('users_email_lower_uq'),
      ('users_location_gix'),
      ('books_owner_idx'),
      ('books_available_created_idx'),
      ('books_search_gin'),
      ('book_categories_category_idx'),
      ('loan_requests_book_idx'),
      ('loan_requests_requester_idx'),
      ('loan_requests_owner_idx'),
      ('loan_requests_status_created_idx'),
      ('loan_requests_pending_unique_idx'),
      ('book_views_book_viewed_idx'),
      ('book_views_viewer_idx')
  ) AS expected(index_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = expected.index_name
  )
  LIMIT 1;

  IF missing_index IS NOT NULL THEN
    RAISE EXCEPTION 'Indice mancante: %.', missing_index;
  END IF;

  BEGIN
    INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      city,
      public_area,
      share_radius_km
    )
    VALUES (
      9001,
      'Duplicato Test',
      'USER1@EXAMPLE.TEST',
      '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
      'Bari',
      'Area test',
      10
    );
    RAISE EXCEPTION 'Il vincolo email case-insensitive non è attivo.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      city,
      public_area,
      share_radius_km
    )
    VALUES (
      9002,
      'Raggio Test',
      'radius-test@example.test',
      '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
      'Bari',
      'Area test',
      3
    );
    RAISE EXCEPTION 'Il vincolo sul raggio non è attivo.';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO loan_requests (
      id,
      book_id,
      requester_id,
      owner_id,
      status,
      created_at
    )
    VALUES (9003, 3, 2, 1, 'PENDING', '2026-09-03 20:00:00+02');
    RAISE EXCEPTION 'Il vincolo sulle richieste pending duplicate non è attivo.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO loan_requests (
      id,
      book_id,
      requester_id,
      owner_id,
      status,
      created_at
    )
    VALUES (9004, 3, 1, 1, 'PENDING', '2026-09-03 20:00:00+02');
    RAISE EXCEPTION 'Il vincolo contro le richieste al proprio libro non è attivo.';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO loan_requests (
      id,
      book_id,
      requester_id,
      owner_id,
      status,
      created_at
    )
    VALUES (9005, 3, 3, 2, 'PENDING', '2026-09-03 20:00:00+02');
    RAISE EXCEPTION 'Il proprietario della richiesta può divergere da quello del libro.';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  RAISE NOTICE 'Verifica schema, seed, indici e vincoli completata con successo.';
END;
$$;

SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM categories) AS categories,
  (SELECT COUNT(*) FROM books) AS books,
  (SELECT COUNT(*) FROM loan_requests) AS loan_requests,
  (SELECT COUNT(*) FROM book_views) AS book_views,
  PostGIS_Version() AS postgis_version;
