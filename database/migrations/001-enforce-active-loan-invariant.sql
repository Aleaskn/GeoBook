\set ON_ERROR_STOP on

BEGIN;

-- La migrazione si limita a diagnosticare dati incompatibili: non li corregge né li elimina.
DO $$
DECLARE
  duplicate_book_id BIGINT;
  available_book_id BIGINT;
BEGIN
  SELECT book_id
  INTO duplicate_book_id
  FROM loan_requests
  WHERE status = 'ACCEPTED'
  GROUP BY book_id
  HAVING COUNT(*) > 1
  ORDER BY book_id
  LIMIT 1;

  IF duplicate_book_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Migrazione interrotta: il libro % possiede più prestiti ACCEPTED. Correggere i dati manualmente prima di riprovare.',
      duplicate_book_id;
  END IF;

  SELECT b.id
  INTO available_book_id
  FROM books b
  JOIN loan_requests lr ON lr.book_id = b.id
  WHERE b.available = TRUE
    AND lr.status = 'ACCEPTED'
  ORDER BY b.id
  LIMIT 1;

  IF available_book_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Migrazione interrotta: il libro % è disponibile nonostante un prestito ACCEPTED. Correggere i dati manualmente prima di riprovare.',
      available_book_id;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS loan_requests_accepted_unique_idx
  ON loan_requests (book_id)
  WHERE status = 'ACCEPTED';

CREATE OR REPLACE FUNCTION enforce_active_loan_book_unavailable()
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

DROP TRIGGER IF EXISTS books_active_loan_availability_check ON books;
CREATE TRIGGER books_active_loan_availability_check
AFTER INSERT OR UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION enforce_active_loan_book_unavailable();

DROP TRIGGER IF EXISTS loan_requests_active_loan_availability_check ON loan_requests;
CREATE TRIGGER loan_requests_active_loan_availability_check
AFTER INSERT OR UPDATE ON loan_requests
FOR EACH ROW
EXECUTE FUNCTION enforce_active_loan_book_unavailable();

COMMIT;
