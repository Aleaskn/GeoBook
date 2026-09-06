import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { deleteBook, listMyBooks, updateBook } from '../api/book-api.js';
import { ApiError } from '../api/api-client.js';
import { BookCard } from '../components/BookCard.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import styles from './MyLibraryPage.module.css';

export function MyLibraryPage() {
  const { clearSession } = useAuth();
  const location = useLocation();
  const [libraryState, setLibraryState] = useState({
    status: 'loading',
    books: [],
    error: '',
  });
  const [actionState, setActionState] = useState({ bookId: null, type: null, error: '' });
  const [notice, setNotice] = useState(location.state?.notice ?? '');

  const loadBooks = useCallback(async () => {
    setLibraryState({ status: 'loading', books: [], error: '' });

    try {
      const books = await listMyBooks();
      setLibraryState({ status: 'ready', books, error: '' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      setLibraryState({
        status: 'error',
        books: [],
        error: error.message ?? 'Non è stato possibile caricare la biblioteca.',
      });
    }
  }, [clearSession]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  async function handleToggleAvailability(book) {
    setActionState({ bookId: book.id, type: 'availability', error: '' });
    setNotice('');

    try {
      const updatedBook = await updateBook(book.id, { available: !book.available });
      setLibraryState((current) => ({
        ...current,
        books: current.books.map((candidate) =>
          candidate.id === updatedBook.id ? updatedBook : candidate,
        ),
      }));
      setNotice(
        updatedBook.available
          ? 'Il libro è ora disponibile per il prestito.'
          : 'Il libro non è più disponibile per il prestito.',
      );
      setActionState({ bookId: null, type: null, error: '' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      setActionState({
        bookId: null,
        type: null,
        error: error.message ?? 'Non è stato possibile aggiornare la disponibilità.',
      });
    }
  }

  async function handleDelete(book) {
    const confirmed = window.confirm(
      'Eliminare definitivamente “' + book.title + '” dalla tua biblioteca?',
    );

    if (!confirmed) {
      return;
    }

    setActionState({ bookId: book.id, type: 'delete', error: '' });
    setNotice('');

    try {
      await deleteBook(book.id);
      setLibraryState((current) => ({
        ...current,
        books: current.books.filter((candidate) => candidate.id !== book.id),
      }));
      setNotice('Libro eliminato dalla biblioteca.');
      setActionState({ bookId: null, type: null, error: '' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      setActionState({
        bookId: null,
        type: null,
        error: error.message ?? 'Non è stato possibile eliminare il libro.',
      });
    }
  }

  if (libraryState.status === 'loading') {
    return <PageState title="La tua biblioteca" message="Caricamento dei libri…" />;
  }

  if (libraryState.status === 'error') {
    return (
      <PageState
        title="Biblioteca non disponibile"
        message={libraryState.error}
        kind="error"
        action={{ label: 'Riprova', onClick: loadBooks }}
      />
    );
  }

  const hasPendingAction = actionState.bookId !== null;

  return (
    <section className={styles.container}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Area personale</p>
          <h1>La tua biblioteca</h1>
          <p>Organizza i libri che vuoi condividere con la comunità.</p>
        </div>
        <Link className={styles.addLink} to="/books/new">
          Aggiungi un libro
        </Link>
      </header>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {actionState.error ? (
        <p className={styles.error} role="alert">
          {actionState.error}
        </p>
      ) : null}
      {libraryState.books.length > 0 ? (
        <ul className={styles.bookGrid}>
          {libraryState.books.map((book) => (
            <li key={book.id}>
              <BookCard
                book={book}
                busy={hasPendingAction}
                pendingAction={actionState.bookId === book.id ? actionState.type : null}
                onToggleAvailability={handleToggleAvailability}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      ) : (
        <section className={styles.emptyState} aria-labelledby="empty-library-title">
          <h2 id="empty-library-title">La biblioteca è ancora vuota</h2>
          <p>Aggiungi il primo libro per iniziare a costruire la tua raccolta.</p>
          <Link to="/books/new">Aggiungi il primo libro</Link>
        </section>
      )}
    </section>
  );
}
