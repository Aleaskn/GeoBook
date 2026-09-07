import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listCategories, searchBooks } from '../api/book-api.js';
import { SearchResultCard } from '../components/SearchResultCard.jsx';
import styles from './SearchPage.module.css';

function createFilterValues(searchParams) {
  return {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
  };
}

function createPageHref(searchParams, page) {
  const nextParams = new window.URLSearchParams(searchParams);

  if (page <= 1) {
    nextParams.delete('page');
  } else {
    nextParams.set('page', String(page));
  }

  const query = nextParams.toString();
  return '/search' + (query ? `?${query}` : '');
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const serializedSearch = searchParams.toString();
  const [filters, setFilters] = useState(() => createFilterValues(searchParams));
  const [categoryState, setCategoryState] = useState({
    status: 'loading',
    categories: [],
    error: '',
  });
  const [resultState, setResultState] = useState({
    status: 'loading',
    books: [],
    meta: null,
    error: '',
  });
  const [searchRevision, setSearchRevision] = useState(0);

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

  useEffect(() => {
    const activeParams = new window.URLSearchParams(serializedSearch);

    setFilters(createFilterValues(activeParams));
    const controller = new window.AbortController();
    const currentFilters = {
      q: activeParams.get('q') || undefined,
      category: activeParams.get('category') || undefined,
      page: activeParams.get('page') || undefined,
      limit: activeParams.get('limit') || undefined,
    };

    setResultState({ status: 'loading', books: [], meta: null, error: '' });
    searchBooks(currentFilters, { signal: controller.signal })
      .then(({ books, meta }) => {
        setResultState({ status: 'ready', books, meta, error: '' });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResultState({
            status: 'error',
            books: [],
            meta: null,
            error: error.message ?? 'Non è stato possibile cercare i libri.',
          });
        }
      });

    return () => controller.abort();
  }, [searchRevision, serializedSearch]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextParams = new window.URLSearchParams();
    const query = filters.q.trim();

    if (query) {
      nextParams.set('q', query);
    }

    if (filters.category) {
      nextParams.set('category', filters.category);
    }

    setSearchParams(nextParams);
  }

  function handleReset() {
    setFilters({ q: '', category: '' });
    setSearchParams(new window.URLSearchParams());
  }

  const meta = resultState.meta;

  return (
    <section className={styles.container}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Catalogo condiviso</p>
        <h1>Cerca un libro</h1>
        <p>Cerca per titolo o autore e restringi i risultati a una categoria.</p>
      </header>

      <form className={styles.filters} role="search" onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="search-query">Titolo o autore</label>
          <input
            id="search-query"
            name="q"
            type="search"
            maxLength="200"
            value={filters.q}
            onChange={handleFilterChange}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="search-category">Categoria</label>
          <select
            id="search-category"
            name="category"
            value={filters.category}
            disabled={categoryState.status === 'loading'}
            onChange={handleFilterChange}
          >
            <option value="">Tutte le categorie</option>
            {categoryState.categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterActions}>
          <button className={styles.submitButton} type="submit">
            Cerca
          </button>
          <button className={styles.resetButton} type="button" onClick={handleReset}>
            Azzera filtri
          </button>
        </div>
      </form>

      {categoryState.status === 'error' ? (
        <div className={styles.error} role="alert">
          <p>{categoryState.error}</p>
          <button type="button" onClick={loadCategories}>
            Ricarica categorie
          </button>
        </div>
      ) : null}

      <section className={styles.results} aria-labelledby="search-results-title" aria-live="polite">
        <div className={styles.resultHeading}>
          <h2 id="search-results-title">Risultati</h2>
          {resultState.status === 'ready' && meta ? (
            <p>
              {meta.total} {meta.total === 1 ? 'libro trovato' : 'libri trovati'}
            </p>
          ) : null}
        </div>

        {resultState.status === 'loading' ? <p role="status">Ricerca in corso…</p> : null}
        {resultState.status === 'error' ? (
          <div className={styles.error} role="alert">
            <p>{resultState.error}</p>
            <button type="button" onClick={() => setSearchRevision((current) => current + 1)}>
              Riprova
            </button>
          </div>
        ) : null}
        {resultState.status === 'ready' && resultState.books.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Nessun libro trovato</h3>
            <p>Prova a modificare il testo o la categoria selezionata.</p>
            {meta?.total ? (
              <Link to={createPageHref(searchParams, 1)}>Torna alla prima pagina</Link>
            ) : null}
          </div>
        ) : null}
        {resultState.status === 'ready' && resultState.books.length > 0 ? (
          <ul className={styles.resultList}>
            {resultState.books.map((book) => (
              <li key={book.id}>
                <SearchResultCard book={book} />
              </li>
            ))}
          </ul>
        ) : null}

        {resultState.status === 'ready' && meta?.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Paginazione risultati">
            {meta.page > 1 ? (
              <Link rel="prev" to={createPageHref(searchParams, meta.page - 1)}>
                Pagina precedente
              </Link>
            ) : (
              <span />
            )}
            <span>
              Pagina {meta.page} di {meta.totalPages}
            </span>
            {meta.page < meta.totalPages ? (
              <Link rel="next" to={createPageHref(searchParams, meta.page + 1)}>
                Pagina successiva
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </section>
  );
}
