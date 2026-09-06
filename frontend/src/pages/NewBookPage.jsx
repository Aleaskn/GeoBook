import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBook, listCategories } from '../api/book-api.js';
import { ApiError } from '../api/api-client.js';
import { BookForm } from '../components/BookForm.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import styles from './BookEditorPage.module.css';

export function NewBookPage() {
  const { clearSession } = useAuth();
  const navigate = useNavigate();
  const [categoryState, setCategoryState] = useState({
    status: 'loading',
    categories: [],
    error: '',
  });

  const loadCategories = useCallback(async () => {
    setCategoryState({ status: 'loading', categories: [], error: '' });

    try {
      const categories = await listCategories();
      setCategoryState({ status: 'ready', categories, error: '' });
    } catch (error) {
      setCategoryState({
        status: 'error',
        categories: [],
        error: error.message ?? 'Non è stato possibile caricare le categorie.',
      });
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function handleSubmit(book) {
    try {
      await createBook(book);
      navigate('/my-library', {
        replace: true,
        state: { notice: 'Libro aggiunto alla biblioteca.' },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
      }

      throw error;
    }
  }

  if (categoryState.status === 'loading') {
    return <PageState title="Aggiungi un libro" message="Caricamento delle categorie…" />;
  }

  if (categoryState.status === 'error') {
    return (
      <PageState
        title="Categorie non disponibili"
        message={categoryState.error}
        kind="error"
        action={{ label: 'Riprova', onClick: loadCategories }}
      />
    );
  }

  return (
    <section className={styles.container}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>La tua biblioteca</p>
        <h1>Aggiungi un libro</h1>
        <p>Inserisci le informazioni essenziali e, se vuoi, aggiungi una copertina.</p>
      </header>
      <BookForm
        categories={categoryState.categories}
        submitLabel="Aggiungi libro"
        pendingLabel="Aggiunta…"
        onSubmit={handleSubmit}
      />
    </section>
  );
}
