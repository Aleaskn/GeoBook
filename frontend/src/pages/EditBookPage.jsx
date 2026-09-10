import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listCategories, listMyBooks, updateBook } from '../api/book-api.js';
import { ApiError } from '../api/api-client.js';
import { BookForm } from '../components/BookForm.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import styles from './BookEditorPage.module.css';

export function EditBookPage() {
  const { clearSession } = useAuth();
  const { id: bookId } = useParams();
  const navigate = useNavigate();
  const [editorState, setEditorState] = useState({
    status: 'loading',
    book: null,
    categories: [],
    error: '',
  });

  const loadEditor = useCallback(async () => {
    if (!/^\d+$/.test(bookId)) {
      setEditorState({ status: 'not-found', book: null, categories: [], error: '' });
      return;
    }

    setEditorState({ status: 'loading', book: null, categories: [], error: '' });

    try {
      // L'elenco personale garantisce che l'editor non usi il DTO pubblico di un libro altrui.
      const [books, categories] = await Promise.all([listMyBooks(), listCategories()]);
      const book = books.find((candidate) => candidate.id === bookId);

      setEditorState({
        status: book ? 'ready' : 'not-found',
        book: book ?? null,
        categories,
        error: '',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      setEditorState({
        status: 'error',
        book: null,
        categories: [],
        error: error.message ?? 'Non è stato possibile caricare il libro.',
      });
    }
  }, [bookId, clearSession]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  async function handleSubmit(changes) {
    try {
      await updateBook(bookId, changes);
      navigate('/my-library', {
        replace: true,
        state: { notice: 'Libro aggiornato correttamente.' },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
      }

      throw error;
    }
  }

  if (editorState.status === 'loading') {
    return <PageState title="Modifica libro" message="Caricamento del libro…" />;
  }

  if (editorState.status === 'error') {
    return (
      <PageState
        title="Libro non disponibile"
        message={editorState.error}
        kind="error"
        action={{ label: 'Riprova', onClick: loadEditor }}
      />
    );
  }

  if (editorState.status === 'not-found') {
    return (
      <PageState
        title="Libro non trovato"
        message="Il libro non esiste oppure non appartiene alla tua biblioteca."
      />
    );
  }

  return (
    <section className={styles.container}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>La tua biblioteca</p>
        <h1>Modifica libro</h1>
        <p>Aggiorna metadati, copertina, categorie e disponibilità del volume.</p>
      </header>
      <BookForm
        book={editorState.book}
        categories={editorState.categories}
        submitLabel="Salva modifiche"
        pendingLabel="Salvataggio…"
        onSubmit={handleSubmit}
      />
    </section>
  );
}
