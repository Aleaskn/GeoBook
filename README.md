# GeoBook

[![Verifica GeoBook](https://github.com/Aleaskn/GeoBook/actions/workflows/ci.yml/badge.svg)](https://github.com/Aleaskn/GeoBook/actions/workflows/ci.yml)

GeoBook è un prototipo web per condividere e cercare libri disponibili nelle vicinanze. Gli
utenti possono pubblicare la propria biblioteca, cercare volumi per testo, categoria e distanza,
consultare una mappa con posizioni approssimate e gestire richieste di prestito simulate.

Il progetto è stato realizzato per la Traccia PW 14 del Tema 4 - Sharing technologies. È pensato
per una dimostrazione locale e non per l'impiego in produzione.

## Funzionalità

- registrazione, login e sessione tramite JWT in cookie HttpOnly;
- profilo personale con consenso esplicito alla posizione e possibilità di revoca;
- biblioteca personale con creazione, modifica ed eliminazione dei propri libri;
- copertine JPEG, PNG o WebP convertite in cover e miniature WebP;
- ricerca per titolo, autore, categoria e raggio geografico;
- lista e mappa Leaflet con tile OpenStreetMap e posizioni pubbliche approssimate;
- dettaglio del libro e registrazione anonima delle visualizzazioni;
- richieste di prestito simulate con stati e autorizzazioni coerenti;
- dashboard amministrativa con indicatori, grafici e tabelle equivalenti;
- interfaccia responsive e percorsi principali utilizzabili da tastiera.

## Tecnologie principali

| Area            | Tecnologie                                                 |
| --------------- | ---------------------------------------------------------- |
| Frontend        | React, Vite, React Router, CSS Modules                     |
| Mappe e grafici | Leaflet, OpenStreetMap, Chart.js                           |
| Backend         | Node.js, Express, Zod                                      |
| Database        | PostgreSQL, PostGIS, query SQL parametrizzate con `pg`     |
| Autenticazione  | JWT, cookie HttpOnly, bcrypt                               |
| Immagini        | Multer, Sharp, WebP                                        |
| Test e qualità  | Vitest, Supertest, React Testing Library, ESLint, Prettier |

## Prerequisiti

- Node.js 20 o superiore;
- npm, incluso con Node.js;
- PostgreSQL con estensione PostGIS;
- connessione a Internet durante l'uso della mappa, necessaria per caricare le tile
  OpenStreetMap.

Verifica gli strumenti principali:

```bash
node --version
npm --version
psql --version
```

## Installazione

Dalla radice del repository installa le dipendenze bloccate dal lockfile:

```bash
npm ci
```

### Preparazione del database

Con PostgreSQL attivo, crea il ruolo e il database di sviluppo se non esistono già:

```bash
psql -d postgres -c "CREATE ROLE geobook WITH LOGIN PASSWORD 'geobook';"
psql -d postgres -c "CREATE DATABASE geobook OWNER geobook;"
psql -d geobook -c "CREATE EXTENSION postgis;"
```

Applica schema, dati dimostrativi e controlli di coerenza:

```bash
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/schema.sql
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/seed.sql
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/verify.sql
```

Il seed contiene esclusivamente dati fittizi: 6 utenti, 8 categorie, 18 libri, 5 richieste di
prestito e 36 visualizzazioni.

### Configurazione locale

Copia i file di esempio:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Prima dell'avvio sostituisci in `backend/.env` il valore dimostrativo di `JWT_SECRET` con una
stringa locale casuale lunga almeno 32 caratteri. I file `.env` sono ignorati da Git e non devono
essere versionati.

Configurazione predefinita:

| Servizio   | Indirizzo                                             |
| ---------- | ----------------------------------------------------- |
| Frontend   | `http://localhost:5173`                               |
| Backend    | `http://localhost:3000`                               |
| API        | `http://localhost:3000/api/v1`                        |
| PostgreSQL | `postgresql://geobook:geobook@localhost:5432/geobook` |

## Avvio

Avvia backend e frontend in due terminali distinti, dalla radice del repository.

Terminale 1:

```bash
npm run dev:backend
```

Terminale 2:

```bash
npm run dev:frontend
```

Apri `http://localhost:5173` nel browser. Per verificare il backend:

```bash
curl http://localhost:3000/api/v1/health
```

Risposta attesa:

```json
{
  "data": {
    "status": "ok",
    "database": "reachable"
  }
}
```

Per avviare il backend senza modalità watch:

```bash
npm start --workspace backend
```

## Account dimostrativi

| Ruolo          | Email                | Password           |
| -------------- | -------------------- | ------------------ |
| Utente         | `user1@example.test` | `GeoBookDemo2026!` |
| Amministratore | `admin@example.test` | `GeoBookDemo2026!` |

Nel database è memorizzato soltanto l'hash bcrypt della password. Gli indirizzi con dominio
`.test` sono riservati alla dimostrazione e non corrispondono a persone reali.

## Percorso di prova consigliato

1. Accedi come utente demo oppure registra un nuovo account.
2. Apri il profilo e salva il consenso usando coordinate dimostrative.
3. Visita **Biblioteca** per creare o modificare un libro e caricare una copertina.
4. Usa **Cerca** o **Mappa** per filtrare i libri per testo, categoria e distanza.
5. Apri un libro appartenente a un altro utente e invia una richiesta di prestito.
6. Gestisci richieste in entrata e in uscita dalla pagina **Richieste**.
7. Accedi come amministratore per consultare la dashboard.

Coordinate dimostrative per Bari:

| Zona         | Latitudine | Longitudine |
| ------------ | ---------: | ----------: |
| Murat        |  `41.1171` |   `16.8719` |
| Madonnella   |  `41.1218` |   `16.8797` |
| Poggiofranco |  `41.1077` |   `16.8548` |

Le coordinate vengono usate come centro della ricerca o come posizione interna dell'utente. Non
inserire indirizzi reali durante le prove.

## Comandi di verifica

```bash
npm run lint
npm test
npm run build
npm run format:check
```

La pipeline GitHub Actions esegue:

- su Ubuntu: schema, seed e verifica PostgreSQL/PostGIS, smoke test API, lint, test, controllo
  della formattazione e build;
- su Windows: installazione da lockfile, codifica WebP con Sharp, lint, test e build.

### Smoke test con PostgreSQL e PostGIS reali

Gli smoke test usano soltanto il database sacrificabile `geobook_test` e rifiutano nomi diversi.
Non sostituire questo nome con quello del database di sviluppo.

```bash
createdb -h localhost -U geobook geobook_test
psql postgresql://geobook:geobook@localhost:5432/geobook_test -f database/schema.sql
RUN_DATABASE_SMOKE_TESTS=true \
  DATABASE_URL=postgresql://geobook:geobook@localhost:5432/geobook_test \
  npm test --workspace backend -- tests/database-api.smoke.test.js
dropdb -h localhost -U geobook geobook_test
```

## Gestione del database

### Ripristino dei dati dimostrativi

`database/reset.sql` elimina i dati applicativi ed è destinato esclusivamente allo sviluppo.
Per sicurezza rifiuta database con nome diverso da `geobook`.

```bash
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/reset.sql
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/schema.sql
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/seed.sql
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/verify.sql
```

### Aggiornamento di un database esistente

La migrazione seguente aggiunge la protezione contro più prestiti accettati contemporaneamente
per lo stesso libro. Prima di applicare i vincoli controlla i dati e interrompe la transazione se
trova record incompatibili, senza correggerli o eliminarli automaticamente.

```bash
psql postgresql://geobook:geobook@localhost:5432/geobook \
  -f database/migrations/001-enforce-active-loan-invariant.sql
```

## Windows PowerShell

I comandi `npm`, `psql`, `createdb` e `dropdb` restano invariati quando i relativi eseguibili sono
disponibili nel `PATH`. Per copiare la configurazione:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

I comandi Bash distribuiti su più righe con `\` possono essere eseguiti su una sola riga oppure
continuati in PowerShell con l'accento grave `` ` ``.

Verifica del backend:

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/health'
```

Smoke test con database isolato:

```powershell
createdb -h localhost -U geobook geobook_test
psql postgresql://geobook:geobook@localhost:5432/geobook_test -f database/schema.sql
$env:RUN_DATABASE_SMOKE_TESTS = 'true'
$env:DATABASE_URL = 'postgresql://geobook:geobook@localhost:5432/geobook_test'
npm test --workspace backend -- tests/database-api.smoke.test.js
Remove-Item Env:RUN_DATABASE_SMOKE_TESTS
Remove-Item Env:DATABASE_URL
dropdb -h localhost -U geobook geobook_test
```

Il job Windows della CI verifica Node.js, Sharp, lint, test e build, ma non installa
PostgreSQL/PostGIS e non costituisce una prova completa dei comandi PowerShell su una macchina
Windows.

<details>
<summary>Esempi API con PowerShell</summary>

Login e riutilizzo della sessione:

```powershell
$loginBody = @{
  email = 'user1@example.test'
  password = 'GeoBookDemo2026!'
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri 'http://localhost:3000/api/v1/auth/login' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $loginBody `
  -SessionVariable geobookSession

Invoke-RestMethod `
  -Uri 'http://localhost:3000/api/v1/auth/me' `
  -WebSession $geobookSession
```

Creazione di un libro con copertina in PowerShell 7:

```powershell
$bookForm = @{
  title = 'Libro dimostrativo'
  author = 'Autore Fittizio'
  publicationYear = '2024'
  categoryIds = '[1,3]'
  cover = Get-Item 'C:\percorso\copertina.png'
}

Invoke-RestMethod `
  -Uri 'http://localhost:3000/api/v1/books' `
  -Method Post `
  -WebSession $geobookSession `
  -Form $bookForm
```

</details>

## Privacy geografica

La posizione viene salvata soltanto dopo consenso esplicito e viene eliminata insieme alla data
del consenso in caso di revoca. Le API pubbliche non restituiscono coordinate precise, email o
identità del proprietario.

Il filtro per raggio, la distanza e i marker usano tutti lo stesso punto pubblico arrotondato a due
decimali. Questa scelta limita l'inferenza della posizione tramite ricerche ripetute, ma non
equivale ad anonimato assoluto. Vicino al confine del raggio un libro può essere incluso o escluso
in base al punto approssimato anziché alla coordinata interna.

## Accessibilità

La mappa è accompagnata da una lista testuale equivalente e i grafici amministrativi da tabelle
con gli stessi valori. I form usano etichette esplicite, errori associati ai controlli e focus
visibile. Su viewport ridotte la lista dei risultati precede la mappa.

## Limiti del prototipo

- la posizione è inserita manualmente e non viene verificata tramite geocodifica;
- le immagini sono conservate nel filesystem locale;
- le tile OpenStreetMap richiedono connettività;
- prestiti e contatti sono simulati: non sono presenti chat, notifiche o pagamenti;
- non sono implementati recupero password, cancellazione dell'account o moderazione;
- il progetto non è configurato per una distribuzione di produzione.

## Struttura del repository

```text
GeoBook/
|-- frontend/          applicazione React
|-- backend/           API Express e storage locale
|-- database/          schema, seed, verifica, reset e migrazioni
|-- docs/              diagrammi e screenshot
|-- package.json       script npm e workspace
|-- package-lock.json  versioni bloccate delle dipendenze
`-- README.md
```

Le motivazioni progettuali, l'analisi dei requisiti, la pianificazione, l'architettura dettagliata
e la valutazione critica sono raccolte nel rapporto tecnico associato al progetto. Il README resta
deliberatamente una guida per installare, avviare e provare il prototipo.
