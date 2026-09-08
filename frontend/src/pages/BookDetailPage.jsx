import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getBook, recordBookView } from '../api/book-api.js';
import { resolveApiAssetUrl } from '../api/api-client.js';
import { PageState } from '../components/PageState.jsx';
import styles from './BookDetailPage.module.css';

const VIEW_SESSION_KEY_PREFIX = 'geobook:viewed-book:';

export function BookDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const serializedSearch = searchParams.toString();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: 'loading', book: null, error: '' });

  useEffect(() => {
    const activeParams = new window.URLSearchParams(serializedSearch);
    const lat = activeParams.get('lat');
    const lon = activeParams.get('lon');
    const coordinates = lat !== null && lon !== null ? { lat, lon } : {};
    const controller = new window.AbortController();

    async function loadBook() {
      setState({ status: 'loading', book: null, error: '' });

      try {
        const book = await getBook(id, coordinates, { signal: controller.signal });
        const viewKey = `${VIEW_SESSION_KEY_PREFIX}${book.id}`;

        // Una chiave di sessione evita incrementi ripetuti tornando più volte sullo stesso dettaglio.
        if (window.sessionStorage.getItem(viewKey) !== 'recorded') {
          await recordBookView(book.id, { signal: controller.signal });
          window.sessionStorage.setItem(viewKey, 'recorded');
        }

        setState({ status: 'ready', book, error: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({
            status: 'error',
            book: null,
            error: error.message ?? 'Non è stato possibile caricare il libro.',
          });
        }
      }
    }

    void loadBook();
    return () => controller.abort();
  }, [id, revision, serializedSearch]);

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
          <p className={styles.privacyNote}>
            GeoBook mostra soltanto la zona dichiarata pubblica e, se disponibile, una distanza
            arrotondata. Le coordinate precise del proprietario non vengono esposte.
          </p>
        </div>
      </div>
    </article>
  );
}
