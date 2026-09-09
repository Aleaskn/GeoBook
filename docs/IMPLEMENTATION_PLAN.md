# Piano di Implementazione GeoBook, 2-20 Settembre 2026

## Stato Attuale

### Attività completate

- Letto integralmente `AGENTS.md`, la specifica progettuale GeoBook e i documenti in `prog/`.
- Ispezionato il repository: sono presenti documentazione e file `.docx`; non risulta ancora codice applicativo.
- Preparato e corretto il piano operativo approvato.
- Inizializzato il repository Git il 2 settembre 2026.
- Completata in anticipo il 2 settembre 2026 la milestone prevista per il 3 settembre: workspace npm, lockfile, tooling, README iniziale, app React minima e smoke test.
- Verificati con successo lint, test, build frontend, formattazione e audit delle dipendenze.
- Verificato PostgreSQL 15.19 in esecuzione su `localhost:5432`; creati ruolo e database locali `geobook`, attivata PostGIS 3.3 e verificata la connessione applicativa.
- Completata in anticipo il 3 settembre 2026 la milestone prevista per il 4 settembre: schema PostGIS, seed dimostrativo e script riproducibili di reset e verifica.
- Completata in anticipo il 3 settembre 2026 la milestone prevista per il 5 settembre: fondazione Express, configurazione validata, pool PostgreSQL, middleware di sicurezza e health check.
- Completata in anticipo il 4 settembre 2026 la milestone prevista per il 6 settembre: autenticazione con cookie HttpOnly e API protette per profilo, consenso e revoca della posizione.
- Completata in anticipo il 4 settembre 2026 la milestone prevista per il 7 settembre: shell React accessibile, client API con credenziali, autenticazione da browser, profilo modificabile e rotte protette.
- Completata in anticipo il 5 settembre 2026 la milestone prevista per l'8 settembre: API categorie e CRUD dei libri personali con validazione, autorizzazione proprietario e transazioni.
- Completata in anticipo il 6 settembre 2026 la milestone prevista per il 9 settembre: biblioteca personale React, form libro, disponibilità e cancellazione confermata.
- Completata in anticipo il 6 settembre 2026 la milestone prevista per il 10 settembre: upload sicuro di copertine, generazione di cover e miniature WebP, cleanup e integrazione frontend.
- Completata in anticipo il 7 settembre 2026 la milestone prevista per l'11 settembre: ricerca pubblica per titolo/autore e categoria, paginazione stabile e filtri React sincronizzati con l'URL.
- Completata in anticipo l'8 settembre 2026 la milestone prevista per il 12 settembre: ricerca PostGIS per raggio, distanza arrotondata e coordinate pubbliche approssimate su griglia.
- Completata in anticipo l'8 settembre 2026 la milestone prevista per il 13 settembre: mappa Leaflet con lista equivalente, dettaglio pubblico dei libri e registrazione anonima delle visualizzazioni.
- Completata in anticipo il 9 settembre 2026 la milestone prevista per il 14 settembre: workflow delle richieste di prestito con autorizzazioni, transizioni atomiche e UI in entrata/uscita.

### Attività in corso

- Nessuna. Le richieste di prestito sono complete e verificate; dashboard e hardening restano pianificati per il 15 settembre.

### Attività pianificate

- Implementazione incrementale dell'MVP dal 15 al 16 settembre 2026.
- Stabilizzazione senza nuove funzionalità dal 17 al 20 settembre 2026, salvo requisiti indispensabili mancanti.

## Piano Giornaliero

### 2 settembre 2026 - Baseline repository e piano documentale

1. **Obiettivo principale:** inizializzare il repository e fissare il piano senza avviare il codice applicativo.
2. **Funzionalità da realizzare:** nessuna funzionalità applicativa; inizializzazione Git; posizionamento di `AGENTS.md` nella radice; creazione di `docs/IMPLEMENTATION_PLAN.md`.
3. **File o moduli presumibilmente coinvolti:** `AGENTS.md`, `docs/IMPLEMENTATION_PLAN.md`, documenti in `prog/`.
4. **Dipendenze dalle giornate precedenti:** documentazione progettuale esistente.
5. **Criteri di accettazione verificabili:** repository Git inizializzato; `AGENTS.md` disponibile in radice; piano salvato; nessuna cartella frontend/backend implementata.
6. **Test da eseguire:** `git status --short`; verifica manuale che non esista codice applicativo anticipato.
7. **Messaggi di commit suggeriti:** `docs: add GeoBook implementation plan`.
8. **Rischi o decisioni ancora aperte:** preservare la cronologia reale; nessuna retrodatazione.

### 3 settembre 2026 - Bootstrap e verifica ambiente

1. **Obiettivo principale:** creare struttura base e verificare prerequisiti.
2. **Funzionalità da realizzare:** npm workspaces, struttura `frontend/`, `backend/`, `database/`, `.gitignore`, `.env.example`, README iniziale, configurazione ESLint/Prettier/Vitest; verifica preliminare disponibilità PostgreSQL e PostGIS.
3. **File o moduli presumibilmente coinvolti:** `package.json`, `frontend/package.json`, `backend/package.json`, `README.md`, `.gitignore`, config lint/test.
4. **Dipendenze dalle giornate precedenti:** repository inizializzato e piano salvato.
5. **Criteri di accettazione verificabili:** workspace installabile; script npm principali risolti; almeno uno smoke test reale del componente React iniziale; PostgreSQL/PostGIS verificati o limite documentato.
6. **Test da eseguire:** `npm run lint`, `npm test`, verifica script workspace, smoke test React iniziale, comandi di verifica `psql`/PostGIS. I test Express reali sono rimandati alla milestone backend.
7. **Messaggi di commit suggeriti:** `chore: bootstrap GeoBook workspaces`.
8. **Rischi o decisioni ancora aperte:** eventuale assenza locale di PostGIS va risolta prima della milestone database.

**Esito anticipato del 2 settembre 2026:** workspace installato tramite lockfile; lint, 2 smoke test, build frontend e controllo Prettier superati; audit npm senza vulnerabilità note. La homepage è stata verificata manualmente nel browser senza errori console, inclusi struttura semantica e focus del collegamento di salto. PostgreSQL 15.19 risponde su `localhost:5432`; ruolo e database locali `geobook` sono configurati, PostGIS 3.3 è attivo e la query `SELECT PostGIS_Version();` è stata verificata con la credenziale applicativa di sviluppo.

### 4 settembre 2026 - Database PostGIS e seed

1. **Obiettivo principale:** rendere riproducibile persistenza e dati demo.
2. **Funzionalità da realizzare:** `schema.sql`, `seed.sql`, `reset.sql`; tipi enum; tabelle `users`, `categories`, `books`, `book_categories`, `loan_requests` e `book_views`; vincoli e indici PostGIS.
3. **File o moduli presumibilmente coinvolti:** `database/schema.sql`, `database/seed.sql`, `database/reset.sql`, `README.md`.
4. **Dipendenze dalle giornate precedenti:** bootstrap e verifica PostgreSQL/PostGIS.
5. **Criteri di accettazione verificabili:** database ricreabile; seed con almeno 6 utenti, 15-20 libri, categorie, richieste in stati diversi e record `book_views`; password demo hashate.
6. **Test da eseguire:** reset locale, applicazione schema/seed, query di controllo su vincoli e conteggi.
7. **Messaggi di commit suggeriti:** `feat(database): add PostGIS schema and demo seed`.
8. **Rischi o decisioni ancora aperte:** definire fixture geografiche semplici e verificabili.

**Esito anticipato del 3 settembre 2026:** creati schema, seed, reset e verifica SQL. Il database
contiene 6 utenti fittizi con password bcrypt, 8 categorie, 18 libri, 5 richieste che coprono
tutti gli stati e 36 visualizzazioni. Sono stati verificati PostGIS, indici, vincoli principali,
fixture geografiche e due ricostruzioni complete consecutive del database locale.

### 5 settembre 2026 - Backend base

1. **Obiettivo principale:** avviare API Express con architettura a livelli.
2. **Funzionalità da realizzare:** config env validata, pool `pg`, request id, error handler uniforme, Helmet, CORS esplicito, rate limit base, `/api/v1/health`.
3. **File o moduli presumibilmente coinvolti:** `backend/src/app.js`, `backend/src/server.js`, `backend/src/config`, `backend/src/middleware`, `backend/src/utils`, `backend/tests`.
4. **Dipendenze dalle giornate precedenti:** database e `.env.example`.
5. **Criteri di accettazione verificabili:** backend fallisce chiaramente se manca env obbligatoria; health check risponde; errori nel formato previsto.
6. **Test da eseguire:** Vitest/Supertest su health, env validation, formato errori.
7. **Messaggi di commit suggeriti:** `feat(backend): add Express API foundation`.
8. **Rischi o decisioni ancora aperte:** configurare test DB senza introdurre tooling fuori stack.

**Esito anticipato del 3 settembre 2026:** implementati configurazione ambiente Zod, pool `pg`,
avvio e arresto del server, request ID, Helmet, CORS esplicito, rate limit, parsing JSON, 404 ed
error handler uniforme. `GET /api/v1/health` verifica realmente PostgreSQL attraverso i livelli
route, controller, service e repository. Supertest copre health, sicurezza, CORS, errori e rate
limit; l'avvio reale e il fallimento su configurazione mancante sono stati verificati.

### 6 settembre 2026 - Autenticazione e profilo API

1. **Obiettivo principale:** implementare identità, sessione e profilo.
2. **Funzionalità da realizzare:** register, login, logout, me, get/patch profile, patch/delete location; JWT in cookie HttpOnly; bcrypt; Zod.
3. **File o moduli presumibilmente coinvolti:** backend `routes`, `controllers`, `services`, `repositories`, `schemas`, `middleware/auth`.
4. **Dipendenze dalle giornate precedenti:** backend base e schema utenti.
5. **Criteri di accettazione verificabili:** login neutro su errore; cookie corretto; coordinate mai esposte nei DTO; revoca posizione azzera dati.
6. **Test da eseguire:** registrazione, email duplicata, login/logout, accesso senza token, patch profilo, consenso/revoca.
7. **Messaggi di commit suggeriti:** `feat(auth): add cookie based authentication and profile APIs`.
8. **Rischi o decisioni ancora aperte:** confermare costo bcrypt su macchina locale.

**Esito anticipato del 4 settembre 2026:** implementati registrazione, login neutro, logout,
sessione corrente e profilo protetto. Il token JWT usa un cookie HttpOnly con opzioni coerenti
all'ambiente; password bcrypt, input Zod e query parametrizzate sono verificati. Consenso e
revoca della posizione operano su PostGIS senza restituire coordinate nei DTO. I test automatici
e un flusso reale contro il database locale sono stati completati con successo.

### 7 settembre 2026 - Frontend base e autenticazione

1. **Obiettivo principale:** avere shell React utilizzabile con autenticazione.
2. **Funzionalità da realizzare:** Vite React, router, layout accessibile, API client con credentials, auth context, `/`, `/register`, `/login`, `/profile`, route protette.
3. **File o moduli presumibilmente coinvolti:** `frontend/src/api`, `frontend/src/context`, `frontend/src/routes`, `frontend/src/layouts`, `frontend/src/pages`, `frontend/src/styles`.
4. **Dipendenze dalle giornate precedenti:** API auth/profilo.
5. **Criteri di accettazione verificabili:** registrazione/login/logout da browser; profilo modificabile; stati loading/error/empty; testi UI in italiano.
6. **Test da eseguire:** React Testing Library su form auth/profilo e route protette; build frontend.
7. **Messaggi di commit suggeriti:** `feat(frontend): add auth flows and protected layout`.
8. **Rischi o decisioni ancora aperte:** mantenere UI sobria, accessibile e non decorativa.

**Esito anticipato del 4 settembre 2026:** implementati router, layout con collegamento di salto,
client API centralizzato con cookie, contesto di autenticazione, homepage, registrazione, login,
logout e profilo protetto modificabile. I form espongono errori associati ai campi e stati di
caricamento, errore, assenza dati e successo; i test React coprono i flussi principali e la build
di produzione è stata verificata.

### 8 settembre 2026 - Categorie e CRUD libri API

1. **Obiettivo principale:** implementare patrimonio librario senza upload avanzato.
2. **Funzionalità da realizzare:** `GET /categories`, `GET /me/books`, `POST/PATCH/DELETE /books`, proprietà, disponibilità, categorie N:M.
3. **File o moduli presumibilmente coinvolti:** backend books/categories routes, schemas, services, repositories, tests.
4. **Dipendenze dalle giornate precedenti:** auth e schema libri/categorie.
5. **Criteri di accettazione verificabili:** solo proprietario modifica/elimina; validazione anno/categorie; cancellazione coerente.
6. **Test da eseguire:** CRUD positivo, modifica libro altrui 403, input non valido 400, categorie.
7. **Messaggi di commit suggeriti:** `feat(books): add book and category APIs`.
8. **Rischi o decisioni ancora aperte:** nessuna; la DELETE preserva i libri con richieste
   storiche e risponde con conflitto.

**Esito anticipato del 5 settembre 2026:** implementati elenco pubblico delle categorie,
biblioteca personale protetta e creazione, modifica e cancellazione dei libri. Gli input sono
validati con Zod, le query sono parametrizzate, le associazioni N:M sono gestite in transazione
e soltanto il proprietario può modificare o eliminare. I libri con richieste storiche vengono
preservati con risposta `409`. Test automatici e flusso CRUD reale su PostgreSQL sono stati
verificati con successo.

### 9 settembre 2026 - Biblioteca personale e form libro

1. **Obiettivo principale:** collegare UI al CRUD libri.
2. **Funzionalità da realizzare:** `/my-library`, `/books/new`, `/books/:id/edit`, `BookForm`, `BookCard`, conferma eliminazione, badge disponibilità.
3. **File o moduli presumibilmente coinvolti:** frontend pages, components, api e styles.
4. **Dipendenze dalle giornate precedenti:** API libri/categorie.
5. **Criteri di accettazione verificabili:** utente crea, modifica, elimina e cambia disponibilità dei propri libri; errori campo per campo.
6. **Test da eseguire:** React Testing Library su form libro, validazioni, delete confirm; build frontend.
7. **Messaggi di commit suggeriti:** `feat(frontend): add personal library management`.
8. **Rischi o decisioni ancora aperte:** nessuna; la selezione categorie è stata verificata su
   viewport mobile a 360 px.

**Esito anticipato del 6 settembre 2026:** implementati biblioteca personale, form riusabile e
card libro nelle rotte protette previste. L'utente può creare e modificare metadati e categorie,
cambiare la disponibilità ed eliminare con conferma; ogni pagina gestisce caricamento, errore,
stato vuoto e successo. Validazioni ed errori campo per campo sono accessibili. Test React e
flusso manuale nel browser con PostgreSQL reale sono stati verificati con successo.

### 10 settembre 2026 - Upload copertine e miniature

1. **Obiettivo principale:** completare gestione immagini.
2. **Funzionalità da realizzare:** Multer, validazione JPEG/PNG/WebP, Sharp cover/thumbnail WebP, storage locale, cleanup file, placeholder.
3. **File o moduli presumibilmente coinvolti:** backend upload middleware, image service, books service, storage `.gitkeep`, frontend `CoverUploader`.
4. **Dipendenze dalle giornate precedenti:** CRUD libri stabile.
5. **Criteri di accettazione verificabili:** upload valido genera cover e thumbnail; file non immagine rifiutato; nessun path traversal; niente residui su errore DB.
6. **Test da eseguire:** Supertest multipart valido/non valido, dimensione limite, cleanup; test UI anteprima.
7. **Messaggi di commit suggeriti:** `feat(images): add cover upload and thumbnail generation`.
8. **Rischi o decisioni ancora aperte:** affidabilità test Sharp su Windows.

**Esito anticipato del 6 settembre 2026:** implementati upload multipart in memoria, verifica
del MIME e del contenuto decodificabile, correzione EXIF e generazione WebP di cover e miniatura.
I file hanno nomi casuali, sono esposti solo da directory controllate e vengono rimossi in caso
di rollback, sostituzione o cancellazione; i libri senza immagine usano un placeholder locale.
Il form React offre selezione e anteprima accessibile. Test automatici e flusso reale con
PostgreSQL e browser sono stati verificati con successo anche sul runtime Sharp locale.

### 11 settembre 2026 - Ricerca testuale e paginazione

1. **Obiettivo principale:** rendere cercabile il catalogo.
2. **Funzionalità da realizzare:** `GET /books` con `q`, `category`, `page`, `limit`; DTO pubblico; ordinamento stabile; URL query frontend.
3. **File o moduli presumibilmente coinvolti:** backend books search repository/service/schema; frontend `/search`, filters, pagination, result list.
4. **Dipendenze dalle giornate precedenti:** libri, categorie, seed.
5. **Criteri di accettazione verificabili:** ricerca case-insensitive titolo/autore; filtro categoria; paginazione con `meta`; nessuna email o dato sensibile nel DTO.
6. **Test da eseguire:** API ricerca positiva/vuota/input errato; React Testing Library su sincronizzazione filtri URL.
7. **Messaggi di commit suggeriti:** `feat(search): add text and category search`.
8. **Rischi o decisioni ancora aperte:** indice testuale semplice sufficiente per MVP.

**Esito anticipato del 7 settembre 2026:** implementato `GET /api/v1/books` pubblico con ricerca
case-insensitive per titolo/autore, filtro per slug categoria, paginazione validata e ordinamento
stabile. Il DTO espone soltanto i dati necessari del libro e la zona pubblica. La pagina React
`/search` sincronizza filtri e pagina con la query URL e gestisce caricamento, errore, assenza
di risultati e ripetizione della richiesta. Test API, repository e frontend verificano input,
query parametrizzate, privacy del payload e sincronizzazione URL.

### 12 settembre 2026 - Ricerca geografica e privacy

1. **Obiettivo principale:** integrare PostGIS senza esporre coordinate esatte.
2. **Funzionalità da realizzare:** filtri `lat`, `lon`, `radiusKm`; `ST_DWithin`, `ST_Distance`; approssimazione server-side griglia 0,01 gradi; esclusione utenti senza consenso.
3. **File o moduli presumibilmente coinvolti:** backend geo utils, books repository/service/schema, profile location tests.
4. **Dipendenze dalle giornate precedenti:** ricerca base e profilo posizione.
5. **Criteri di accettazione verificabili:** risultati dentro/fuori raggio corretti; distanza arrotondata; payload privo di coordinate esatte; revoca consenso esclude dalla ricerca spaziale.
6. **Test da eseguire:** test PostGIS con fixture note, privacy DTO, radius allowlist, lon/lat invalidi.
7. **Messaggi di commit suggeriti:** `feat(search): add PostGIS radius filtering`.
8. **Rischi o decisioni ancora aperte:** documentare precisione della griglia nella relazione.

**Esito anticipato dell'8 settembre 2026:** esteso `GET /api/v1/books` con i filtri congiunti
`lat`, `lon` e `radiusKm`, validati rispetto agli intervalli geografici e alla allowlist dei
raggi. La query PostGIS parametrizzata usa `ST_DWithin` e `ST_Distance`, esclude proprietari
senza posizione o consenso e seleziona soltanto distanza in chilometri arrotondata e coordinate
su griglia di 0,01 gradi. I test verificano risultati dentro/fuori raggio, revoca del consenso,
input incompleti o non validi, privacy del DTO e fixture PostGIS riproducibili.

### 13 settembre 2026 - Mappa e dettaglio libro

1. **Obiettivo principale:** completare consultazione pubblica dei risultati.
2. **Funzionalità da realizzare:** `/map` con Leaflet/OpenStreetMap e lista equivalente; `/books/:id`; registrazione vista `POST /books/:id/view`.
3. **File o moduli presumibilmente coinvolti:** frontend `MapResults`, `BookDetailPage`; backend book detail/view endpoint.
4. **Dipendenze dalle giornate precedenti:** ricerca geografica e DTO mappa.
5. **Criteri di accettazione verificabili:** lista e mappa mostrano gli stessi risultati; marker approssimati; dettaglio con copertina, area, distanza e disponibilità.
6. **Test da eseguire:** API dettaglio/vista; React Testing Library su stati mappa/lista; test manuale tastiera e viewport 360/768/1440.
7. **Messaggi di commit suggeriti:** `feat(map): add accessible map and book detail views`.
8. **Rischi o decisioni ancora aperte:** tile OSM dipendenti dalla rete durante demo.

**Esito del 13 settembre 2026:** implementati dettaglio pubblico e registrazione anonima delle
visualizzazioni con endpoint validati e query parametrizzate. La pagina `/map` applica filtri
geografici sincronizzati con l'URL e rappresenta lo stesso insieme di libri tramite marker
Leaflet su coordinate approssimate e una lista testuale equivalente che precede la mappa su
viewport ridotte. Il dettaglio mostra copertina, area pubblica, disponibilità e distanza
arrotondata quando sono disponibili coordinate di ricerca; `sessionStorage` evita conteggi
ripetuti dello stesso libro nella singola sessione browser. Test API, repository e React coprono
percorsi positivi, input errati, assenze e stati vuoti o di errore.

### 14 settembre 2026 - Richieste di prestito

1. **Obiettivo principale:** implementare workflow prestito simulato.
2. **Funzionalità da realizzare:** creazione richiesta, liste incoming/outgoing, transizioni PENDING/ACCEPTED/REJECTED/CANCELLED/RETURNED, aggiornamento disponibilità in transazione, UI `/requests`.
3. **File o moduli presumibilmente coinvolti:** backend loan routes/services/repositories/schemas; frontend requests page/components.
4. **Dipendenze dalle giornate precedenti:** dettaglio libro, disponibilità, auth.
5. **Criteri di accettazione verificabili:** vietato richiedere proprio libro; vietati duplicati pending; solo attori autorizzati cambiano stato; transizioni invalide 409.
6. **Test da eseguire:** T07-T09, autorizzazioni 403, transazioni disponibilità; React Testing Library su azioni valide per ruolo.
7. **Messaggi di commit suggeriti:** `feat(loans): add loan request workflow`.
8. **Rischi o decisioni ancora aperte:** gestione libro eliminato con richieste esistenti.

**Esito anticipato del 9 settembre 2026:** implementati creazione e consultazione delle richieste in
entrata e in uscita, insieme alle transizioni autorizzate `PENDING` → `ACCEPTED`, `REJECTED` o
`CANCELLED` e `ACCEPTED` → `RETURNED`. Il service blocca le righe coinvolte e aggiorna stato e
disponibilità del libro nella stessa transazione. I test coprono T07-T09, attori non autorizzati,
rollback e query parametrizzate. Il dettaglio libro consente l'invio con messaggio facoltativo e
la pagina protetta `/requests` presenta solo le azioni valide per proprietario o richiedente, con
stati di caricamento, errore, vuoto e successo.

### 15 settembre 2026 - Dashboard admin e hardening

1. **Obiettivo principale:** completare statistiche e sicurezza.
2. **Funzionalità da realizzare:** `GET /admin/stats`, `GET /admin/recent-activity`, dashboard `/admin`, grafici Chart.js con tabella equivalente, revisione Helmet/CORS/rate limit/log.
3. **File o moduli presumibilmente coinvolti:** backend admin routes/services/repositories; frontend admin page/components; README parziale.
4. **Dipendenze dalle giornate precedenti:** dati operativi, `book_views`, richieste.
5. **Criteri di accettazione verificabili:** USER riceve 403; ADMIN vede KPI, categorie top, libri più visti, richieste mensili e attività recenti; nessun hash/coordinate/email sensibile esposto.
6. **Test da eseguire:** Supertest admin role, aggregazioni, payload privacy; React Testing Library dashboard; build.
7. **Messaggi di commit suggeriti:** `feat(admin): add statistics dashboard`.
8. **Rischi o decisioni ancora aperte:** grafici leggibili e accessibili senza sovraccaricare la UI.

### 16 settembre 2026 - Completamento tecnico MVP

1. **Obiettivo principale:** portare GeoBook a revisione tecnica completa.
2. **Funzionalità da realizzare:** correzioni finali dei requisiti MVP, accessibilità, responsive, privacy checklist, README tecnico completo.
3. **File o moduli presumibilmente coinvolti:** `README.md`, frontend styles/tests, backend tests, eventuale documentazione API.
4. **Dipendenze dalle giornate precedenti:** tutte le funzionalità MVP.
5. **Criteri di accettazione verificabili:** valutatore può ricreare DB, avviare backend/frontend, usare USER/ADMIN demo, completare flussi principali, eseguire test documentati.
6. **Test da eseguire:** `npm run lint`, `npm test`, build frontend, test manuale browser, tastiera, mobile 360/768/1440, verifica payload privacy.
7. **Messaggi di commit suggeriti:** `test: complete MVP verification coverage`, `docs: finalize technical setup`.
8. **Rischi o decisioni ancora aperte:** correggere bug senza ampliare scope.

## Finestra di Stabilizzazione

### 17 settembre 2026 - Regressione completa

1. **Obiettivo principale:** verificare tutto l'MVP end-to-end.
2. **Attività:** suite completa backend/frontend, build, flussi manuali USER/ADMIN, test privacy, accessibilità tastiera e responsive; documentare l'esito in `docs/testing/regression-2026-09-17.md` se vengono registrati risultati o difetti.
3. **Criteri di accettazione verificabili:** lista difetti classificata; nessuna nuova funzionalità pianificata.
4. **Test da eseguire:** lint, test, build, setup DB da zero, flussi principali.
5. **Messaggi di commit suggeriti:** nessun commit se non esistono modifiche reali; se viene aggiunto il report, `docs(testing): record full regression results`.
6. **Rischi o decisioni ancora aperte:** eventuali requisiti mancanti indispensabili hanno priorità sui bug minori.

### 18 settembre 2026 - Correzione bug e regressione mirata

1. **Obiettivo principale:** correggere difetti emersi il 17.
2. **Attività:** bug fixing limitato, aggiunta test di regressione per ogni bug corretto.
3. **Criteri di accettazione verificabili:** difetti bloccanti chiusi; suite verde.
4. **Test da eseguire:** test mirati più suite completa.
5. **Messaggi di commit suggeriti:** `fix: address MVP regression findings`.
6. **Rischi o decisioni ancora aperte:** evitare refactor non necessari.

### 19 settembre 2026 - README, screenshot e documentazione

1. **Obiettivo principale:** rendere la consegna verificabile.
2. **Attività:** README finale, credenziali demo, istruzioni DB/env, screenshot in `docs/screenshots`, note privacy/accessibilità e limiti noti.
3. **Criteri di accettazione verificabili:** una persona esterna può seguire README senza conoscenza pregressa.
4. **Test da eseguire:** prova manuale dei comandi documentati.
5. **Messaggi di commit suggeriti:** `docs: finalize README and delivery evidence`.
6. **Rischi o decisioni ancora aperte:** non dichiarare risultati non verificati.

### 20 settembre 2026 - Ambiente pulito e release candidate

1. **Obiettivo principale:** validare la release candidate.
2. **Attività:** clone/setup pulito, installazione dipendenze, creazione DB, seed, avvio backend/frontend, test completi, revisione finale diff.
3. **Criteri di accettazione verificabili:** release candidate pronta; nessun segreto, upload reale o dipendenza installata versionata.
4. **Test da eseguire:** setup completo da README, lint, test, build, flussi demo.
5. **Messaggi di commit suggeriti:** nessun commit se non esistono modifiche reali; se la verifica produce aggiornamenti necessari, `chore: prepare release candidate`.
6. **Rischi o decisioni ancora aperte:** solo correzioni bloccanti o requisiti indispensabili mancanti.

## Assunzioni e Default

- Lo stato di avanzamento sarà tracciato tramite `docs/IMPLEMENTATION_PLAN.md`, cronologia Git e riepiloghi di milestone;
- Ogni workspace deve avere test reali coerenti con ciò che esiste in quella milestone; niente test segnaposto.
- Non si pianificano nuove funzionalità dal 17 al 20 settembre, salvo requisiti MVP indispensabili mancanti.
