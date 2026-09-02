# GeoBook

GeoBook e un prototipo web per la condivisione geolocalizzata di biblioteche private. Il progetto segue la Traccia PW 14 del Tema 4 - Sharing technologies.

## Stato del progetto

- 2 settembre 2026: repository inizializzato e piano salvato in `docs/IMPLEMENTATION_PLAN.md`.
- 2 settembre 2026: completata in anticipo la milestone prevista per il 3 settembre: bootstrap
  dei workspace, tooling, struttura iniziale, smoke test React e verifica dei prerequisiti.
- 2 settembre 2026: avviato e verificato PostgreSQL locale; creati ruolo e database di sviluppo
  `geobook` e attivata l'estensione PostGIS.

Non sono ancora implementati schema dati, seed, API Express, autenticazione, ricerca, mappa o dashboard: queste funzionalita sono pianificate nelle milestone successive.

## Stack previsto

- Frontend: React, Vite, React Router, CSS modulare.
- Backend: Node.js LTS, Express, JavaScript ES modules.
- Database: PostgreSQL con PostGIS.
- Test: Vitest, Supertest, React Testing Library.
- Qualita: ESLint e Prettier.

## Prerequisiti

- Node.js 20 o superiore; usare una release LTS supportata per lo sviluppo ordinario.
- npm incluso con Node.js.
- PostgreSQL con estensione PostGIS disponibile localmente.

Verifica rapida:

```bash
node --version
npm --version
psql --version
```

Verifica PostGIS, dopo aver configurato un database locale:

```sql
SELECT PostGIS_Version();
```

### Stato della verifica eseguita il 2 settembre 2026

La milestone prevista per il 3 settembre e stata verificata in anticipo con Node.js 20.9.0,
npm 10.1.0 e PostgreSQL 15.19 fornito da Postgres.app. Il server risponde su
`localhost:5432`; il ruolo e il database locale `geobook` sono configurati e PostGIS 3.3 e
attivo nel database dedicato. La connessione con la `DATABASE_URL` di esempio e la query
`SELECT PostGIS_Version();` sono state verificate con successo.

L'installazione da lockfile e gli script di qualita sono stati eseguiti con successo. Al termine
di `npm install`, `npm audit` non ha rilevato vulnerabilita note.

## Preparazione del database locale

Con il server PostgreSQL attivo, eseguire una sola volta i comandi seguenti se il ruolo e il
database non esistono ancora. La password e destinata esclusivamente allo sviluppo locale.

```bash
psql -d postgres -c "CREATE ROLE geobook WITH LOGIN PASSWORD 'geobook';"
psql -d postgres -c "CREATE DATABASE geobook OWNER geobook;"
psql -d geobook -c "CREATE EXTENSION postgis;"
```

Verifica:

```bash
psql postgresql://geobook:geobook@localhost:5432/geobook \
  -c "SELECT current_user, current_database(), PostGIS_Version();"
```

Questi comandi preparano soltanto l'ambiente locale. Tabelle e dati demo saranno creati dagli
script versionati della milestone database.

## Installazione

```bash
npm ci
```

## Script principali

```bash
npm run lint
npm test
npm run build
npm run format:check
npm run dev:frontend
npm run dev:backend
```

Il backend avra un server Express dalla milestone del 5 settembre 2026; fino ad allora `npm run dev:backend` verifica solo il workspace backend iniziale.

## Struttura

```text
geobook/
|-- frontend/
|-- backend/
|-- database/
|-- docs/
|-- prog/
|-- AGENTS.md
|-- README.md
|-- package.json
`-- .gitignore
```

## Privacy

Il progetto non deve versionare segreti, file `.env`, upload reali o dipendenze installate. Le coordinate esatte saranno gestite solo lato backend e mai restituite nei DTO pubblici quando la funzionalita geografica verra implementata.
