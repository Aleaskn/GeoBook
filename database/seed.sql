\set ON_ERROR_STOP on
\encoding WIN1252

BEGIN;

TRUNCATE TABLE
  book_views,
  loan_requests,
  book_categories,
  books,
  categories,
  users
RESTART IDENTITY;

-- Tutte le identità, le aree e le coordinate seguenti sono dati dimostrativi fittizi.
-- La password condivisa dai profili demo è GeoBookDemo2026!; nel database è presente solo
-- il relativo hash bcrypt con costo 12.
INSERT INTO users (
  name,
  email,
  password_hash,
  role,
  city,
  public_area,
  location,
  share_radius_km,
  location_consent_at,
  created_at,
  updated_at
)
VALUES
  (
    'Utente Demo Centro',
    'user1@example.test',
    '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
    'USER',
    'Bari',
    'Zona Murat',
    ST_SetSRID(ST_MakePoint(16.8719, 41.1171), 4326)::GEOGRAPHY,
    5,
    TIMESTAMPTZ '2026-08-20 09:00:00+02',
    TIMESTAMPTZ '2026-08-20 09:00:00+02',
    TIMESTAMPTZ '2026-08-20 09:00:00+02'
  ),
  (
    'Utente Demo Mare',
    'user2@example.test',
    '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
    'USER',
    'Bari',
    'Zona Madonnella',
    ST_SetSRID(ST_MakePoint(16.8797, 41.1218), 4326)::GEOGRAPHY,
    10,
    TIMESTAMPTZ '2026-08-21 10:30:00+02',
    TIMESTAMPTZ '2026-08-21 10:30:00+02',
    TIMESTAMPTZ '2026-08-21 10:30:00+02'
  ),
  (
    'Utente Demo Nord',
    'user3@example.test',
    '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
    'USER',
    'Bari',
    'Zona Poggiofranco',
    ST_SetSRID(ST_MakePoint(16.8548, 41.1077), 4326)::GEOGRAPHY,
    10,
    TIMESTAMPTZ '2026-08-22 11:00:00+02',
    TIMESTAMPTZ '2026-08-22 11:00:00+02',
    TIMESTAMPTZ '2026-08-22 11:00:00+02'
  ),
  (
    'Utente Demo Est',
    'user4@example.test',
    '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
    'USER',
    'Bari',
    'Zona Carrassi',
    ST_SetSRID(ST_MakePoint(16.8623, 41.1041), 4326)::GEOGRAPHY,
    20,
    TIMESTAMPTZ '2026-08-23 15:00:00+02',
    TIMESTAMPTZ '2026-08-23 15:00:00+02',
    TIMESTAMPTZ '2026-08-23 15:00:00+02'
  ),
  (
    'Utente Demo Sud',
    'user5@example.test',
    '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
    'USER',
    'Bari',
    'Zona Japigia',
    ST_SetSRID(ST_MakePoint(16.8882, 41.0985), 4326)::GEOGRAPHY,
    5,
    TIMESTAMPTZ '2026-08-24 16:45:00+02',
    TIMESTAMPTZ '2026-08-24 16:45:00+02',
    TIMESTAMPTZ '2026-08-24 16:45:00+02'
  ),
  (
    'Amministratore Demo',
    'admin@example.test',
    '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO',
    'ADMIN',
    'Bari',
    'Area amministrativa demo',
    NULL,
    10,
    NULL,
    TIMESTAMPTZ '2026-08-19 08:00:00+02',
    TIMESTAMPTZ '2026-08-19 08:00:00+02'
  );

INSERT INTO categories (name, slug)
VALUES
  ('Narrativa', 'narrativa'),
  ('Saggistica', 'saggistica'),
  ('Informatica', 'informatica'),
  ('Storia', 'storia'),
  ('Scienza', 'scienza'),
  ('Arte', 'arte'),
  ('Ragazzi', 'ragazzi'),
  ('Viaggi', 'viaggi');

INSERT INTO books (
  owner_id,
  title,
  author,
  publication_year,
  description,
  isbn,
  available,
  created_at,
  updated_at
)
VALUES
  (1, 'Il faro delle conchiglie', 'Autrice Demo A', 2018, 'Romanzo fittizio ambientato sulla costa pugliese.', '9780000000001', TRUE, '2026-08-21 09:00:00+02', '2026-08-21 09:00:00+02'),
  (1, 'Algoritmi quotidiani', 'Autore Demo B', 2022, 'Introduzione narrativa al pensiero computazionale.', '9780000000002', TRUE, '2026-08-22 09:30:00+02', '2026-08-22 09:30:00+02'),
  (1, 'Storie di quartiere', 'Collettivo Demo Centro', 2016, 'Racconti fittizi dedicati alla vita di quartiere.', NULL, TRUE, '2026-08-23 10:00:00+02', '2026-08-23 10:00:00+02'),
  (2, 'Mappe invisibili', 'Autrice Demo C', 2020, 'Itinerari immaginari fra paesaggi e memoria.', '9780000000004', FALSE, '2026-08-22 11:00:00+02', '2026-08-26 12:00:00+02'),
  (2, 'Breve storia del porto', 'Autore Demo D', 2014, 'Saggio storico fittizio su un porto mediterraneo.', '9780000000005', TRUE, '2026-08-23 11:30:00+02', '2026-08-23 11:30:00+02'),
  (2, 'Cieli di Puglia', 'Autrice Demo E', 2023, 'Guida divulgativa fittizia all osservazione del cielo.', '9780000000006', TRUE, '2026-08-24 12:00:00+02', '2026-08-24 12:00:00+02'),
  (3, 'Pensare in reti', 'Autore Demo F', 2021, 'Concetti introduttivi su reti digitali e sociali.', '9780000000007', TRUE, '2026-08-24 14:00:00+02', '2026-08-24 14:00:00+02'),
  (3, 'Il giardino delle domande', 'Autrice Demo G', 2019, 'Racconto per giovani lettrici e lettori curiosi.', '9780000000008', TRUE, '2026-08-25 14:30:00+02', '2026-08-25 14:30:00+02'),
  (3, 'Numeri e natura', 'Autore Demo H', 2017, 'Percorso divulgativo fittizio fra matematica e ambiente.', '9780000000009', TRUE, '2026-08-26 15:00:00+02', '2026-08-26 15:00:00+02'),
  (4, 'Viaggio lungo la costa', 'Autrice Demo I', 2015, 'Taccuino di viaggio fittizio lungo il mare Adriatico.', '9780000000010', TRUE, '2026-08-25 16:00:00+02', '2026-08-30 18:00:00+02'),
  (4, 'Colori mediterranei', 'Autore Demo L', 2013, 'Saggio illustrato fittizio sui linguaggi del colore.', '9780000000011', TRUE, '2026-08-26 16:30:00+02', '2026-08-26 16:30:00+02'),
  (4, 'Racconti piccoli per grandi idee', 'Autrice Demo M', 2024, 'Storie brevi fittizie dedicate alle nuove generazioni.', '9780000000012', TRUE, '2026-08-27 17:00:00+02', '2026-08-27 17:00:00+02'),
  (5, 'Archivi di comunità', 'Autore Demo N', 2012, 'Riflessione fittizia sulla memoria condivisa.', '9780000000013', TRUE, '2026-08-27 09:00:00+02', '2026-08-27 09:00:00+02'),
  (5, 'La città che legge', 'Autrice Demo O', 2025, 'Romanzo fittizio sulla nascita di una biblioteca diffusa.', '9780000000014', TRUE, '2026-08-28 09:30:00+02', '2026-08-28 09:30:00+02'),
  (5, 'Introduzione alle reti locali', 'Autore Demo P', 2020, 'Manuale dimostrativo sui fondamenti delle reti.', '9780000000015', TRUE, '2026-08-29 10:00:00+02', '2026-08-29 10:00:00+02'),
  (6, 'Amministrare una biblioteca diffusa', 'Autrice Demo Q', 2022, 'Guida fittizia alla gestione di un catalogo condiviso.', '9780000000016', TRUE, '2026-08-29 11:00:00+02', '2026-08-29 11:00:00+02'),
  (6, 'Atlante delle piazze immaginarie', 'Autore Demo R', 2018, 'Raccolta illustrata di luoghi interamente inventati.', '9780000000017', TRUE, '2026-08-30 11:30:00+02', '2026-08-30 11:30:00+02'),
  (6, 'Statistiche senza misteri', 'Autrice Demo S', 2023, 'Introduzione fittizia alla lettura dei dati.', '9780000000018', TRUE, '2026-08-31 12:00:00+02', '2026-08-31 12:00:00+02');

INSERT INTO book_categories (book_id, category_id)
VALUES
  (1, 1),
  (2, 2),
  (2, 3),
  (3, 1),
  (4, 1),
  (4, 8),
  (5, 2),
  (5, 4),
  (6, 5),
  (7, 2),
  (7, 3),
  (8, 1),
  (8, 7),
  (9, 5),
  (9, 7),
  (10, 8),
  (11, 6),
  (12, 1),
  (12, 7),
  (13, 2),
  (13, 4),
  (14, 1),
  (14, 4),
  (15, 3),
  (16, 2),
  (16, 3),
  (17, 6),
  (17, 8),
  (18, 2),
  (18, 3);

INSERT INTO loan_requests (
  book_id,
  requester_id,
  owner_id,
  status,
  message,
  created_at,
  responded_at,
  returned_at
)
VALUES
  (3, 2, 1, 'PENDING', 'Richiesta demo ancora da valutare.', '2026-09-01 09:00:00+02', NULL, NULL),
  (4, 3, 2, 'ACCEPTED', 'Richiesta demo accettata.', '2026-08-25 10:00:00+02', '2026-08-26 12:00:00+02', NULL),
  (7, 4, 3, 'REJECTED', 'Richiesta demo non disponibile nel periodo indicato.', '2026-08-26 14:00:00+02', '2026-08-27 09:00:00+02', NULL),
  (10, 5, 4, 'RETURNED', 'Prestito demo concluso con restituzione.', '2026-08-20 15:00:00+02', '2026-08-21 10:00:00+02', '2026-08-30 18:00:00+02'),
  (13, 1, 5, 'CANCELLED', 'Richiesta demo annullata dal richiedente.', '2026-08-27 16:00:00+02', '2026-08-28 08:00:00+02', NULL);

WITH view_plan (book_id, view_count) AS (
  VALUES
    (1, 8),
    (4, 7),
    (7, 6),
    (10, 5),
    (13, 4),
    (16, 3),
    (18, 2),
    (2, 1)
)
INSERT INTO book_views (book_id, viewer_id, viewed_at)
SELECT
  view_plan.book_id,
  CASE
    WHEN generated.sequence_no % 3 = 0 THEN NULL
    ELSE ((view_plan.book_id + generated.sequence_no) % 6) + 1
  END,
  TIMESTAMPTZ '2026-09-03 18:00:00+02'
    - ((view_plan.book_id + generated.sequence_no) * INTERVAL '3 hours')
FROM view_plan
CROSS JOIN LATERAL GENERATE_SERIES(1, view_plan.view_count) AS generated(sequence_no);

COMMIT;
