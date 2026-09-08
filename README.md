# GeoBook

GeoBook è un prototipo web per la condivisione geolocalizzata di biblioteche private. Il progetto segue la Traccia PW 14 del Tema 4 - Sharing technologies.

## Stato del progetto

È stata prevista una milestone giornaliera per organizzare il lavoro in maniera più efficiente
e ordinata, basandomi sulla progettazione fatta nell'ultimo mese a partire dal 27 luglio.

- 2 settembre 2026: repository inizializzato e piano salvato in `docs/IMPLEMENTATION_PLAN.md`.
- 2 settembre 2026: completata in anticipo la milestone prevista per il 3 settembre: bootstrap
  dei workspace, tooling, struttura iniziale, smoke test React e verifica dei prerequisiti.
- 2 settembre 2026: avviato e verificato PostgreSQL locale; creati ruolo e database di sviluppo
  `geobook` ed è stata attivata l'estensione PostGIS.
- 3 settembre 2026: completata in anticipo la milestone prevista per il 4 settembre: schema
  PostGIS riproducibile, dati demo e script di reset e verifica.
- 3 settembre 2026: completata in anticipo la milestone prevista per il 5 settembre: API
  Express di base, configurazione validata, connessione PostgreSQL, sicurezza HTTP e health
  check.
- 4 settembre 2026: completata in anticipo la milestone prevista per il 6 settembre:
  autenticazione con cookie HttpOnly e API protette per profilo, consenso e revoca della
  posizione.
- 4 settembre 2026: completata in anticipo la milestone prevista per il 7 settembre: frontend
  React con layout accessibile, autenticazione via cookie, rotte protette e gestione del profilo.
- 5 settembre 2026: completata in anticipo la milestone prevista per l'8 settembre: API per
  categorie e CRUD dei libri personali con validazione, proprietà e transazioni.
- 6 settembre 2026: completata in anticipo la milestone prevista per il 9 settembre: biblioteca
  personale React con form di creazione e modifica, disponibilità e cancellazione confermata.
- 6 settembre 2026: completata in anticipo la milestone prevista per il 10 settembre: upload
  sicuro delle copertine, generazione WebP di cover e miniature e integrazione nel frontend.
- 7 settembre 2026: completata in anticipo la milestone prevista per l'11 settembre: ricerca
  pubblica per testo e categoria, paginazione e filtri frontend sincronizzati con l'URL.
- 8 settembre 2026: completata in anticipo la milestone prevista per il 12 settembre: ricerca
  PostGIS per raggio, distanza arrotondata e coordinate pubbliche approssimate.

Non sono ancora implementati mappa o dashboard: queste funzionalità sono pianificate nelle
milestone successive.

## Stack previsto

- Frontend: React, Vite, React Router, CSS modulare.
- Backend: Node.js LTS, Express, JavaScript ES modules.
- Database: PostgreSQL con PostGIS.
- Test: Vitest, Supertest, React Testing Library.
- Qualità codice: ESLint e Prettier.

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

La milestone prevista per il 3 settembre è stata verificata in anticipo. Il server risponde su
`localhost:5432`; il ruolo e il database locale `geobook` sono configurati e PostGIS 3.3 è
attivo nel database dedicato. La connessione con la `DATABASE_URL` di esempio e la query
`SELECT PostGIS_Version();` sono state verificate con successo.

L'installazione da lockfile e gli script di qualità sono stati eseguiti con successo. Al termine
di `npm install`, `npm audit` non ha rilevato vulnerabilità note.

## Preparazione del database locale

Con il server PostgreSQL attivo, eseguire una sola volta i comandi seguenti se il ruolo e il
database non esistono ancora. La password è destinata solamente allo sviluppo locale.

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

Questi comandi preparano soltanto l'ambiente locale.

### Creazione dello schema e dei dati demo

Dalla radice del repository, con PostgreSQL attivo, applicare gli script nell'ordine seguente:

```bash
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/schema.sql
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/seed.sql
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/verify.sql
```

Il seed contiene dati dichiaratamente fittizi: 6 utenti, 8 categorie, 18 libri, 5 richieste
che coprono tutti gli stati e 36 visualizzazioni. Sono disponibili questi profili demo:

- utente: `user1@example.test`;
- amministratore: `admin@example.test`;
- password condivisa: `GeoBookDemo2026!`.

Nel database è memorizzato soltanto l'hash bcrypt della password, con costo 12.

Per ricreare completamente i dati applicativi locali, eseguire prima il reset e poi ripetere i
tre comandi precedenti:

```bash
psql postgresql://geobook:geobook@localhost:5432/geobook -f database/reset.sql
```

`reset.sql` elimina tabelle e dati applicativi ed è quindi destinato esclusivamente allo
sviluppo. Per sicurezza rifiuta di operare su database con nome diverso da `geobook`; mantiene
l'estensione PostGIS installata.

## Installazione

```bash
npm ci
```

## Avvio del backend

Creare la configurazione locale partendo dall'esempio versionato:

```bash
cp backend/.env.example backend/.env
```

Prima dell'avvio, sostituire in `backend/.env` il valore dimostrativo di `JWT_SECRET` con una
stringa locale lunga almeno 32 caratteri. Il file `.env` è ignorato da Git e non deve essere
versionato.

Con PostgreSQL attivo e il database preparato, avviare l'API:

```bash
npm run dev:backend
```

Il server valida tutte le variabili obbligatorie e verifica la connessione al database prima di
mettersi in ascolto su `http://localhost:3000`. Se la configurazione o PostgreSQL non sono
disponibili, l'avvio termina con un messaggio esplicito.

Verifica del servizio:

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

## Avvio del frontend

Con il backend attivo, creare la configurazione locale del frontend e avviare Vite:

```bash
cp frontend/.env.example frontend/.env
npm run dev:frontend
```

Aprire `http://localhost:5173`. Sono disponibili la homepage, la ricerca pubblica in `/search`,
le pagine di autenticazione, `/profile`, `/my-library`, `/books/new` e `/books/:id/edit`; le
pagine personali richiedono una sessione valida. Tutte le chiamate usano il client API
centralizzato con credenziali abilitate, perciò il cookie HttpOnly viene gestito dal browser e
non deve essere copiato nel codice o salvato in `localStorage`.

Per una prova rapida è possibile accedere dal browser con uno dei profili demo indicati nella
sezione database, modificare il profilo e gestire libri, categorie, copertine e disponibilità
dalla pagina **Biblioteca**, quindi usare il comando **Esci** nella navigazione.

## API di autenticazione e profilo

Gli endpoint disponibili sotto `/api/v1` sono:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` e `GET /auth/me`;
- `GET /profile` e `PATCH /profile`;
- `PATCH /profile/location` e `DELETE /profile/location`.

Login con l'utente demo e salvataggio del cookie di sessione:

```bash
curl -c /tmp/geobook.cookies \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.test","password":"GeoBookDemo2026!"}' \
  http://localhost:3000/api/v1/auth/login
```

Richiesta autenticata e logout:

```bash
curl -b /tmp/geobook.cookies http://localhost:3000/api/v1/auth/me
curl -b /tmp/geobook.cookies -X POST http://localhost:3000/api/v1/auth/logout
```

Il token JWT viene inviato esclusivamente in un cookie `HttpOnly`, `SameSite=Lax` e `Secure`
in produzione. Per salvare la posizione, `PATCH /profile/location` richiede `lat`, `lon` e
`consent: true`. Le risposte restituiscono solo la data del consenso: coordinate
e hash password non fanno parte del DTO utente. La revoca elimina sia la posizione sia la data
del consenso.

## API di categorie, ricerca e biblioteca personale

Gli endpoint disponibili sono:

- `GET /api/v1/categories`, pubblico;
- `GET /api/v1/books`, ricerca pubblica;
- `GET /api/v1/me/books`, autenticato;
- `POST /api/v1/books`, autenticato;
- `PATCH /api/v1/books/:id` e `DELETE /api/v1/books/:id`, riservati al proprietario.

La ricerca accetta `q` per titolo o autore, `category` come slug, `page` e `limit`. I valori
predefiniti sono pagina 1 e 12 risultati; il limite massimo è 50. L'ordinamento è stabile dal
libro più recente e la risposta include i metadati `page`, `limit`, `total` e `totalPages`.
Per limitare i risultati nello spazio occorre fornire insieme `lat`, `lon` e `radiusKm`; il
raggio deve essere 1, 5, 10 o 20 km.

```bash
curl "http://localhost:3000/api/v1/books?q=romanzo&category=narrativa&page=1&limit=12"
curl "http://localhost:3000/api/v1/books?lat=41.1171&lon=16.8719&radiusKm=5"
```

Il DTO pubblico contiene soltanto titolo, autore, anno, miniatura, disponibilità, categorie e
zona dichiarata pubblica. Quando è attivo il filtro geografico aggiunge `distanceKm`, arrotondata
a un decimale, e `approximateLocation` su una griglia di 0,01 gradi. Non espone identità del
proprietario, email o coordinate esatte.

Creazione di un libro con copertina usando il cookie ottenuto con il login:

```bash
curl -b /tmp/geobook.cookies \
  -F "title=Libro dimostrativo" \
  -F "author=Autore Fittizio" \
  -F "publicationYear=2024" \
  -F 'categoryIds=[1,3]' \
  -F "cover=@/percorso/copertina.png;type=image/png" \
  http://localhost:3000/api/v1/books
```

Le operazioni di creazione e modifica accettano `multipart/form-data`. Il corpo richiede
`title`, `author` e `publicationYear`; accetta inoltre `description`, `isbn`, `available`,
`categoryIds` come array JSON e il campo file facoltativo `cover`. La modifica accetta gli
stessi campi e richiede almeno un metadato o una copertina. Le categorie devono esistere e non
possono essere duplicate. Le operazioni sulle categorie e sui percorsi delle immagini sono
atomiche rispetto alla creazione o modifica. Le richieste JSON senza file restano supportate
per compatibilità con i client esistenti.

La copertina può essere JPEG, PNG o WebP e non può superare il limite configurato da
`MAX_UPLOAD_BYTES`, pari a 5 MiB nell'esempio. Il backend verifica sia il MIME sia il contenuto
decodificabile, corregge l'orientamento EXIF e genera due file WebP con nomi casuali: una cover
entro 1200×1800 pixel e una miniatura 240×360. I file sono serviti sotto `/uploads`, mentre i
libri privi di immagine usano un placeholder locale. In caso di errore DB, sostituzione o
cancellazione, il servizio rimuove i file che non devono più essere conservati. Gli upload
reali presenti in `backend/storage` sono esclusi da Git.

La cancellazione rimuove in cascata associazioni alle categorie e visualizzazioni. Un libro con
richieste di prestito storiche viene invece conservato e l'API risponde
`409 BOOK_HAS_LOAN_REQUESTS`, così da non perdere la cronologia.

## Script principali

```bash
npm run lint
npm test
npm run build
npm run format:check
npm run dev:frontend
npm run dev:backend
```

`npm run dev:backend` avvia Express in modalità watch. In alternativa, il comando
`npm start --workspace backend` avvia il server senza watch.

## Struttura

```text
geobook/
|-- frontend/
|-- backend/
|-- database/
|-- docs/
|-- prog/
|-- README.md
|-- package.json
`-- .gitignore
```

## Privacy

Il progetto non deve versionare file `.env`, upload reali o dipendenze installate. Le coordinate
sono salvate soltanto dopo consenso esplicito. La ricerca geografica considera esclusivamente
utenti con posizione e consenso attivi, usa `ST_DWithin` sul tipo `geography` e non seleziona mai
il punto esatto per il DTO pubblico. La posizione restituita viene arrotondata lato database a
due decimali, cioè una griglia di circa 0,01 gradi; la distanza è espressa in chilometri e
arrotondata a un decimale. La revoca del consenso azzera posizione e data del consenso, rendendo
i relativi libri assenti dalle ricerche spaziali.
