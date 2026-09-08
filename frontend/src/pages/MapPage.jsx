import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listCategories, searchBooks } from '../api/book-api.js';
import { MapResults } from '../components/MapResults.jsx';
import styles from './MapPage.module.css';

const MAP_RESULT_LIMIT = 50;

function createFilterValues(searchParams) {
  return {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    lat: searchParams.get('lat') ?? '',
    lon: searchParams.get('lon') ?? '',
    radiusKm: searchParams.get('radiusKm') ?? '5',
  };
}

function geographicParametersState(searchParams) {
  const values = ['lat', 'lon', 'radiusKm'].map((field) => searchParams.get(field));
  return {
    any: values.some((value) => value !== null && value !== ''),
    complete: values.every((value) => value !== null && value !== ''),
  };
}

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const serializedSearch = searchParams.toString();
  const [filters, setFilters] = useState(() => createFilterValues(searchParams));
  const [categoryState, setCategoryState] = useState({ categories: [], error: '' });
  const [resultState, setResultState] = useState({
    status: 'idle',
    books: [],
    meta: null,
    error: '',
  });
  const [searchRevision, setSearchRevision] = useState(0);

  const loadCategories = useCallback(async () => {
    try {
      const categories = await listCategories();
      setCategoryState({ categories, error: '' });
    } catch (error) {
      setCategoryState({
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
    const geographicState = geographicParametersState(activeParams);
    setFilters(createFilterValues(activeParams));

    if (!geographicState.any) {
      setResultState({ status: 'idle', books: [], meta: null, error: '' });
      return undefined;
    }

    if (!geographicState.complete) {
      setResultState({
        status: 'error',
        books: [],
        meta: null,
        error: 'Latitudine, longitudine e raggio devono essere indicati insieme.',
      });
      return undefined;
    }

    const controller = new window.AbortController();
    const currentFilters = {
      q: activeParams.get('q') || undefined,
      category: activeParams.get('category') || undefined,
      lat: activeParams.get('lat'),
      lon: activeParams.get('lon'),
      radiusKm: activeParams.get('radiusKm'),
      limit: MAP_RESULT_LIMIT,
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
            error: error.message ?? 'Non è stato possibile caricare la mappa.',
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

    Object.entries(filters).forEach(([field, value]) => {
      const normalizedValue = value.trim();
      if (normalizedValue) {
        nextParams.set(field, normalizedValue);
      }
    });

    setSearchParams(nextParams);
  }

  function handleReset() {
    setFilters({ q: '', category: '', lat: '', lon: '', radiusKm: '5' });
    setSearchParams(new window.URLSearchParams());
  }

  return (
    <section className={styles.container}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Catalogo sul territorio</p>
        <h1>Mappa dei libri</h1>
        <p>
          Inserisci il centro della ricerca e visualizza soltanto posizioni pubbliche approssimate.
          Le coordinate usate qui non vengono salvate nel profilo.
        </p>
      </header>

      <form className={styles.filters} aria-label="Filtri della mappa" onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="map-latitude">Latitudine</label>
          <input
            id="map-latitude"
            name="lat"
            type="number"
            min="-90"
            max="90"
            step="any"
            required
            inputMode="decimal"
            value={filters.lat}
            onChange={handleFilterChange}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="map-longitude">Longitudine</label>
          <input
            id="map-longitude"
            name="lon"
            type="number"
            min="-180"
            max="180"
            step="any"
            required
            inputMode="decimal"
            value={filters.lon}
            onChange={handleFilterChange}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="map-radius">Raggio</label>
          <select
            id="map-radius"
            name="radiusKm"
            value={filters.radiusKm}
            onChange={handleFilterChange}
          >
            {[1, 5, 10, 20].map((radius) => (
              <option key={radius} value={radius}>
                {radius} km
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="map-query">Titolo o autore</label>
          <input
            id="map-query"
            name="q"
            type="search"
            maxLength="200"
            value={filters.q}
            onChange={handleFilterChange}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="map-category">Categoria</label>
          <select
            id="map-category"
            name="category"
            value={filters.category}
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
        <div className={styles.actions}>
          <button className={styles.submitButton} type="submit">
            Mostra sulla mappa
          </button>
          <button className={styles.resetButton} type="button" onClick={handleReset}>
            Azzera filtri
          </button>
        </div>
      </form>

      {categoryState.error ? (
        <div className={styles.error} role="alert">
          <p>{categoryState.error}</p>
          <button type="button" onClick={loadCategories}>
            Ricarica categorie
          </button>
        </div>
      ) : null}

      <div className={styles.status} aria-live="polite">
        {resultState.status === 'idle' ? (
          <p>Inserisci latitudine e longitudine per avviare la ricerca geografica.</p>
        ) : null}
        {resultState.status === 'loading' ? <p role="status">Mappa in caricamento…</p> : null}
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
            <h2>Nessun libro nella zona</h2>
            <p>Prova ad ampliare il raggio o a modificare gli altri filtri.</p>
          </div>
        ) : null}
        {resultState.status === 'ready' && resultState.books.length > 0 ? (
          <>
            <p className={styles.resultCount}>
              {resultState.meta.total}{' '}
              {resultState.meta.total === 1 ? 'libro trovato' : 'libri trovati'}
            </p>
            <MapResults
              books={resultState.books}
              detailSearch={serializedSearch ? `?${serializedSearch}` : ''}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
