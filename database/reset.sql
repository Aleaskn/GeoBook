\set ON_ERROR_STOP on

\echo 'ATTENZIONE: reset.sql elimina tutte le tabelle e i dati applicativi dal database locale geobook.'

DO $$
BEGIN
  IF CURRENT_DATABASE() <> 'geobook' THEN
    RAISE EXCEPTION 'Reset rifiutato: il database corrente è %, non geobook.', CURRENT_DATABASE();
  END IF;
END;
$$;

BEGIN;

DROP TABLE IF EXISTS
  book_views,
  loan_requests,
  book_categories,
  books,
  categories,
  users
CASCADE;

DROP FUNCTION IF EXISTS set_updated_at();
DROP TYPE IF EXISTS loan_status;
DROP TYPE IF EXISTS user_role;

COMMIT;

\echo "Reset completato. L'estensione PostGIS è stata mantenuta."
