import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getBook, recordBookView } from '../api/book-api.js';
import { resolveApiAssetUrl } from '../api/api-client.js';
import { createLoanRequest } from '../api/loan-request-api.js';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import styles from './BookDetailPage.module.css';

const VIEW_SESSION_KEY_PREFIX = 'geobook:viewed-book:';

export function BookDetailPage() {
  const { status: authStatus } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const serializedSearch = searchParams.toString();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: 'loading', book: null, error: '' });
  const [message, setMessage] = useState('');
  const [requestState, setRequestState] = useState({ pending: false, error: '', success: false });

  useEffect(() => {
    const activeParams = new window.URLSearchParams(serializedSearch);
    const lat = activeParams.get('lat');
    const lon = activeParams.get('lon');
    const coordinates = lat !== null && lon !== null ? { lat, lon } : {};
    const controller = new window.AbortController();

    async function loadBook() {
      setState({ status: 'loading', book: null, error: '' });
      setMessage('');
      setRequestState({ pending: false, error: '', success: false });

      let book;

      try {
        book = await getBook(id, coordinates, { signal: controller.signal });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({
            status: 'error',
            book: null,
            error: error.message ?? 'Non è stato possibile caricare il libro.',
          });
        }

        return;
      }

      setState({ status: 'ready', book, error: '' });
      const viewKey = `${VIEW_SESSION_KEY_PREFIX}${book.id}`;

      // Il conteggio è best-effort: un errore statistico non deve nascondere un dettaglio valido.
      if (window.sessionStorage.getItem(viewKey) !== 'recorded') {
        try {
          await recordBookView(book.id, { signal: controller.signal });
          window.sessionStorage.setItem(viewKey, 'recorded');
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('Non è stato possibile registrare la visualizzazione del libro.');
          }
        }
      }
    }

    void loadBook();
    return () => controller.abort();
  }, [id, revision, serializedSearch]);

  async function handleLoanRequest(event) {
    event.preventDefault();
    setRequestState({ pending: true, error: '', success: false });

    try {
      await createLoanRequest(id, message);
      setMessage('');
      setRequestState({ pending: false, error: '', success: true });
    } catch (error) {
      setRequestState({
        pending: false,
        error: error.message ?? 'Non è stato possibile inviare la richiesta.',
        success: false,
      });
    }
  }

  if (state.status === 'loading') {
    return <PageState title="Dettaglio libro" message="Caricamento del libro in corso…" />;
  }

  if (state.status === 'error') {
    return (
      <PageState
        title="Dettaglio non disponibile"
        message={state.error}
        kind="error"
        action={{ label: 'Riprova', onClick: () => setRevision((current) => current + 1) }}
      />
    );
  }

  const { book } = state;
  const hasCover = book.coverPath && !book.coverPath.endsWith('/placeholder-cover.svg');

  return (
    <article className={styles.detail}>
      <nav className={styles.backLinks} aria-label="Torna ai risultati">
        <Link to="/search">Elenco dei libri</Link>
        <Link to={`/map${serializedSearch ? `?${serializedSearch}` : ''}`}>Mappa</Link>
      </nav>
      <div className={styles.layout}>
        <img
          className={styles.cover}
          src={resolveApiAssetUrl(book.coverPath)}
          alt={hasCover ? `Copertina di ${book.title}` : ''}
        />
        <div className={styles.content}>
          <p className={styles.author}>{book.author}</p>
          <h1>{book.title}</h1>
          <p className={book.available ? styles.available : styles.unavailable}>
            {book.available ? 'Disponibile per una richiesta' : 'Al momento non disponibile'}
          </p>
          <dl className={styles.metadata}>
            <div>
              <dt>Anno di pubblicazione</dt>
              <dd>{book.publicationYear}</dd>
            </div>
            <div>
              <dt>Zona pubblica</dt>
              <dd>{book.publicArea}</dd>
            </div>
            {Number.isFinite(book.distanceKm) ? (
              <div>
                <dt>Distanza indicativa</dt>
                <dd>{book.distanceKm.toLocaleString('it-IT')} km</dd>
              </div>
            ) : null}
            {book.isbn ? (
              <div>
                <dt>ISBN</dt>
                <dd>{book.isbn}</dd>
              </div>
            ) : null}
          </dl>
          <section className={styles.description} aria-labelledby="book-description-title">
            <h2 id="book-description-title">Descrizione</h2>
            <p>{book.description ?? 'Nessuna descrizione disponibile.'}</p>
          </section>
          <section className={styles.categories} aria-labelledby="book-categories-title">
            <h2 id="book-categories-title">Categorie</h2>
            {book.categories.length > 0 ? (
              <ul>
                {book.categories.map((category) => (
                  <li key={category.id}>{category.name}</li>
                ))}
              </ul>
            ) : (
              <p>Nessuna categoria associata.</p>
            )}
          </section>
          <section className={styles.loanRequest} aria-labelledby="loan-request-title">
            <h2 id="loan-request-title">Richiedi il libro</h2>
            {!book.available ? <p>Questo libro non è disponibile per nuove richieste.</p> : null}
            {book.available && authStatus === 'loading' ? (
              <p role="status">Verifica della sessione in corso…</p>
            ) : null}
            {book.available && (authStatus === 'anonymous' || authStatus === 'error') ? (
              <p>
                <Link to="/login">Accedi</Link> per inviare una richiesta di prestito.
              </p>
            ) : null}
            {book.available && authStatus === 'authenticated' && !requestState.success ? (
              <form className={styles.loanForm} onSubmit={handleLoanRequest}>
                <label htmlFor="loan-message">Messaggio facoltativo</label>
                <textarea
                  id="loan-message"
                  name="message"
                  value={message}
                  maxLength={500}
                  rows={4}
                  aria-describedby="loan-message-hint"
                  onChange={(event) => setMessage(event.target.value)}
                />
                <p id="loan-message-hint" className={styles.hint}>
                  Massimo 500 caratteri. Non inserire indirizzi o altri dati personali.
                </p>
                <button type="submit" disabled={requestState.pending}>
                  {requestState.pending ? 'Invio in corso…' : 'Invia richiesta'}
                </button>
              </form>
            ) : null}
            {requestState.success ? (
              <p className={styles.requestSuccess} role="status">
                Richiesta inviata. Puoi seguirne lo stato nella pagina{' '}
                <Link to="/requests">Richieste</Link>.
              </p>
            ) : null}
            {requestState.error ? (
              <p className={styles.requestError} role="alert">
                {requestState.error}
              </p>
            ) : null}
          </section>
          <p className={styles.privacyNote}>
            GeoBook mostra soltanto la zona dichiarata pubblica e, se disponibile, una distanza
            arrotondata. Le coordinate precise del proprietario non vengono esposte.
          </p>
        </div>
      </div>
    </article>
  );
}
