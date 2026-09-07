import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse, setRoute } from './test-utils.js';

const AUTHENTICATION_ERROR = {
  error: { code: 'AUTHENTICATION_REQUIRED', message: 'Autenticazione richiesta.' },
};

const CATEGORIES = [
  { id: '1', name: 'Narrativa', slug: 'narrativa' },
  { id: '2', name: 'Informatica', slug: 'informatica' },
];

const PUBLIC_BOOK = {
  id: '10',
  title: 'Romanzo di prova',
  author: 'Autrice Fittizia',
  publicationYear: 2021,
  thumbnailPath: '/uploads/placeholder-cover.svg',
  available: true,
  publicArea: 'Zona Murat',
  categories: [CATEGORIES[0]],
};

function responseFor(url, bookResponse) {
  if (url.endsWith('/auth/me')) {
    return apiResponse(401, AUTHENTICATION_ERROR);
  }

  if (url.endsWith('/categories')) {
    return apiResponse(200, { data: { categories: CATEGORIES } });
  }

  if (url.includes('/books')) {
    return bookResponse;
  }

  throw new Error(`Richiesta inattesa: ${url}`);
}

describe('book search', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reads filters and pagination from the URL and renders public results', async () => {
    setRoute('/search?q=romanzo&category=narrativa&page=2');
    window.fetch.mockImplementation((url) =>
      Promise.resolve(
        responseFor(
          url,
          apiResponse(200, {
            data: {
              books: [PUBLIC_BOOK],
              meta: { page: 2, limit: 12, total: 13, totalPages: 2 },
            },
          }),
        ),
      ),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { level: 3, name: PUBLIC_BOOK.title })).toBeVisible();
    expect(screen.getByLabelText('Titolo o autore')).toHaveValue('romanzo');
    expect(screen.getByLabelText('Categoria')).toHaveValue('narrativa');
    expect(screen.getByText('Zona Murat')).toBeInTheDocument();
    expect(screen.getByText('Pagina 2 di 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pagina precedente' })).toHaveAttribute(
      'href',
      '/search?q=romanzo&category=narrativa',
    );
    expect(screen.queryByRole('link', { name: 'Pagina successiva' })).not.toBeInTheDocument();
    expect(window.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/books?q=romanzo&category=narrativa&page=2',
      expect.objectContaining({ credentials: 'include', signal: expect.any(window.AbortSignal) }),
    );
  });

  it('writes submitted filters to the URL and returns to the first page', async () => {
    setRoute('/search?page=2');
    window.fetch.mockImplementation((url) =>
      Promise.resolve(
        responseFor(
          url,
          apiResponse(200, {
            data: {
              books: [],
              meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
            },
          }),
        ),
      ),
    );

    render(<App />);

    await screen.findByRole('heading', { level: 3, name: 'Nessun libro trovato' });
    fireEvent.change(screen.getByLabelText('Titolo o autore'), {
      target: { value: '  Italo Calvino  ' },
    });
    fireEvent.change(screen.getByLabelText('Categoria'), {
      target: { value: 'narrativa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cerca' }));

    await waitFor(() => {
      expect(window.location.search).toBe('?q=Italo+Calvino&category=narrativa');
    });
    expect(window.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/books?q=Italo+Calvino&category=narrativa',
      expect.objectContaining({ credentials: 'include', signal: expect.any(window.AbortSignal) }),
    );
  });

  it('shows an empty state and can retry after a search error', async () => {
    let searchAttempts = 0;
    setRoute('/search?q=inesistente');
    window.fetch.mockImplementation((url) => {
      if (!url.includes('/books')) {
        return Promise.resolve(responseFor(url));
      }

      searchAttempts += 1;
      if (searchAttempts === 1) {
        return Promise.resolve(
          apiResponse(500, {
            error: { code: 'INTERNAL_ERROR', message: 'Ricerca temporaneamente non disponibile.' },
          }),
        );
      }

      return Promise.resolve(
        apiResponse(200, {
          data: {
            books: [],
            meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
          },
        }),
      );
    });

    render(<App />);

    const errorMessage = await screen.findByText('Ricerca temporaneamente non disponibile.');
    expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Nessun libro trovato' }),
    ).toBeInTheDocument();
    expect(searchAttempts).toBe(2);
  });
});
