\set ON_ERROR_STOP on

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE loan_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'RETURNED', 'CANCELLED');

CREATE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'USER',
  city VARCHAR(100) NOT NULL,
  public_area VARCHAR(150) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  share_radius_km SMALLINT NOT NULL DEFAULT 10,
  location_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT users_email_not_blank CHECK (BTRIM(email) <> ''),
  CONSTRAINT users_password_hash_not_blank CHECK (BTRIM(password_hash) <> ''),
  CONSTRAINT users_city_not_blank CHECK (BTRIM(city) <> ''),
  CONSTRAINT users_public_area_not_blank CHECK (BTRIM(public_area) <> ''),
  CONSTRAINT users_share_radius_check CHECK (share_radius_km IN (1, 5, 10, 20)),
  CONSTRAINT users_location_consent_check CHECK (
    (location IS NULL AND location_consent_at IS NULL)
    OR (location IS NOT NULL AND location_consent_at IS NOT NULL)
  )
);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(90) NOT NULL UNIQUE,
  CONSTRAINT categories_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(160) NOT NULL,
  publication_year SMALLINT NOT NULL,
  description TEXT,
  isbn VARCHAR(20),
  cover_path TEXT,
  thumbnail_path TEXT,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT books_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT books_author_not_blank CHECK (BTRIM(author) <> ''),
  CONSTRAINT books_publication_year_check CHECK (
    publication_year BETWEEN 1450 AND EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  ),
  CONSTRAINT books_description_not_blank CHECK (
    description IS NULL OR BTRIM(description) <> ''
  ),
  CONSTRAINT books_isbn_format CHECK (
    isbn IS NULL OR isbn ~ '^[0-9Xx-]{10,20}$'
  ),
  CONSTRAINT books_cover_path_not_blank CHECK (
    cover_path IS NULL OR BTRIM(cover_path) <> ''
  ),
  CONSTRAINT books_thumbnail_path_not_blank CHECK (
    thumbnail_path IS NULL OR BTRIM(thumbnail_path) <> ''
  ),
  CONSTRAINT books_id_owner_unique UNIQUE (id, owner_id)
);

CREATE TABLE book_categories (
  book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, category_id)
);

CREATE TABLE loan_requests (
  id BIGSERIAL PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status loan_status NOT NULL DEFAULT 'PENDING',
  message VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  CONSTRAINT loan_requests_book_owner_fk
    FOREIGN KEY (book_id, owner_id) REFERENCES books(id, owner_id) ON DELETE RESTRICT,
  CONSTRAINT loan_requests_participants_check CHECK (requester_id <> owner_id),
  CONSTRAINT loan_requests_message_not_blank CHECK (
    message IS NULL OR BTRIM(message) <> ''
  ),
  CONSTRAINT loan_requests_response_check CHECK (
    (status = 'PENDING' AND responded_at IS NULL)
    OR (status <> 'PENDING' AND responded_at IS NOT NULL)
  ),
  CONSTRAINT loan_requests_return_check CHECK (
    (status = 'RETURNED' AND returned_at IS NOT NULL)
    OR (status <> 'RETURNED' AND returned_at IS NULL)
  ),
  CONSTRAINT loan_requests_timestamp_order_check CHECK (
    (responded_at IS NULL OR responded_at >= created_at)
    AND (returned_at IS NULL OR returned_at >= responded_at)
  )
);

CREATE TABLE book_views (
  id BIGSERIAL PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  viewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX users_email_lower_uq ON users (LOWER(email));
CREATE INDEX users_location_gix ON users USING GIST (location);

CREATE INDEX books_owner_idx ON books (owner_id);
CREATE INDEX books_available_created_idx ON books (available, created_at DESC);
CREATE INDEX books_search_gin ON books USING GIN (
  TO_TSVECTOR('simple', COALESCE(title, '') || ' ' || COALESCE(author, ''))
);

CREATE INDEX book_categories_category_idx ON book_categories (category_id, book_id);

CREATE INDEX loan_requests_book_idx ON loan_requests (book_id);
CREATE INDEX loan_requests_requester_idx ON loan_requests (requester_id, created_at DESC);
CREATE INDEX loan_requests_owner_idx ON loan_requests (owner_id, created_at DESC);
CREATE INDEX loan_requests_status_created_idx ON loan_requests (status, created_at DESC);
CREATE UNIQUE INDEX loan_requests_pending_unique_idx
  ON loan_requests (book_id, requester_id)
  WHERE status = 'PENDING';
CREATE UNIQUE INDEX loan_requests_accepted_unique_idx
  ON loan_requests (book_id)
  WHERE status = 'ACCEPTED';

CREATE INDEX book_views_book_viewed_idx ON book_views (book_id, viewed_at DESC);
CREATE INDEX book_views_viewer_idx ON book_views (viewer_id)
  WHERE viewer_id IS NOT NULL;

CREATE FUNCTION enforce_active_loan_book_unavailable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  checked_book_id BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'books' THEN
    checked_book_id := NEW.id;
  ELSE
    checked_book_id := NEW.book_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM books b
    JOIN loan_requests lr ON lr.book_id = b.id
    WHERE b.id = checked_book_id
      AND b.available = TRUE
      AND lr.status = 'ACCEPTED'
  ) THEN
    RAISE EXCEPTION 'Un libro con un prestito accettato non può essere disponibile.'
      USING ERRCODE = '23514', CONSTRAINT = 'active_loan_book_unavailable';
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER books_active_loan_availability_check
AFTER INSERT OR UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION enforce_active_loan_book_unavailable();

CREATE TRIGGER loan_requests_active_loan_availability_check
AFTER INSERT OR UPDATE ON loan_requests
FOR EACH ROW
EXECUTE FUNCTION enforce_active_loan_book_unavailable();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER books_set_updated_at
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
