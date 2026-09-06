import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse, setRoute, TEST_USER } from './test-utils.js';

const CATEGORIES = [
  { id: '3', name: 'Informatica', slug: 'informatica' },
  { id: '1', name: 'Narrativa', slug: 'narrativa' },
];

const BOOK = {
  id: '10',
  ownerId: String(TEST_USER.id),
  title: 'Romanzo di prova',
  author: 'Autrice Fittizia',
  publicationYear: 2021,
  description: 'Una descrizione dimostrativa.',
  isbn: '9780000000010',
  coverPath: null,
  thumbnailPath: null,
  available: true,
  categories: [CATEGORIES[1]],
  createdAt: '2026-09-05T10:00:00.000Z',
  updatedAt: '2026-09-05T10:00:00.000Z',
};

function authenticatedResponse() {
  return apiResponse(200, { data: { user: TEST_USER } });
}

function expectMultipartRequest(callNumber, expectedPath, expectedFields) {
  const [url, options] = window.fetch.mock.calls[callNumber - 1];

  expect(url).toBe('http://localhost:3000/api/v1' + expectedPath);
  expect(options).toMatchObject({ credentials: 'include' });
  expect(options.headers).toBeUndefined();
  expect(options.body).toBeInstanceOf(window.FormData);

  Object.entries(expectedFields).forEach(([field, value]) => {
    expect(options.body.get(field)).toBe(value);
  });
}

describe('personal library', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the empty state and the action to add the first book', async () => {
    setRoute('/my-library');
    window.fetch
      .mockResolvedValueOnce(authenticatedResponse())
      .mockResolvedValueOnce(apiResponse(200, { data: { books: [] } }));

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'La biblioteca è ancora vuota' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'La tua biblioteca' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Aggiungi il primo libro' })).toHaveAttribute(
      'href',
      '/books/new',
    );
  });

  it('validates and creates a book with its selected categories', async () => {
    const createdBook = {
      ...BOOK,
      title: 'Design accessibile',
      publicationYear: 2024,
      description: 'Guida fittizia alle interfacce inclusive.',
      categories: [CATEGORIES[0]],
    };
    setRoute('/books/new');
    window.fetch
      .mockResolvedValueOnce(authenticatedResponse())
      .mockResolvedValueOnce(apiResponse(200, { data: { categories: CATEGORIES } }))
      .mockResolvedValueOnce(apiResponse(201, { data: { book: createdBook } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { books: [createdBook] } }));

    render(<App />);

    window.URL.createObjectURL = vi.fn(() => 'blob:cover-preview');
    window.URL.revokeObjectURL = vi.fn();

    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi libro' }));

    expect(screen.getByText('Titolo obbligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Autore obbligatorio.')).toBeInTheDocument();
    expect(screen.getByText("L'anno di pubblicazione deve essere intero.")).toBeInTheDocument();
    expect(window.fetch).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByLabelText('Titolo'), {
      target: { value: createdBook.title },
    });
    fireEvent.change(screen.getByLabelText('Autore'), {
      target: { value: createdBook.author },
    });
    fireEvent.change(screen.getByLabelText('Anno di pubblicazione'), {
      target: { value: String(createdBook.publicationYear) },
    });
    fireEvent.change(screen.getByLabelText('Descrizione (facoltativa)'), {
      target: { value: createdBook.description },
    });
    fireEvent.change(screen.getByLabelText('ISBN (facoltativo)'), {
      target: { value: createdBook.isbn },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Informatica' }));
    const cover = new window.File(['copertina'], 'copertina.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Copertina (facoltativa)'), {
      target: { files: [cover] },
    });
    expect(screen.getByRole('img', { name: /Anteprima della nuova copertina/ })).toHaveAttribute(
      'src',
      'blob:cover-preview',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi libro' }));

    expect(await screen.findByText('Libro aggiunto alla biblioteca.')).toHaveAttribute(
      'role',
      'status',
    );
    expectMultipartRequest(3, '/books', {
      title: createdBook.title,
      author: createdBook.author,
      publicationYear: String(createdBook.publicationYear),
      description: createdBook.description,
      isbn: createdBook.isbn,
      available: 'true',
      categoryIds: '[3]',
      cover,
    });
  });

  it('loads an owned book and updates all editable fields', async () => {
    const updatedBook = {
      ...BOOK,
      title: 'Romanzo aggiornato',
      available: false,
      categories: [CATEGORIES[0]],
    };
    setRoute('/books/10/edit');
    window.fetch
      .mockResolvedValueOnce(authenticatedResponse())
      .mockResolvedValueOnce(apiResponse(200, { data: { books: [BOOK] } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { categories: CATEGORIES } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { book: updatedBook } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { books: [updatedBook] } }));

    render(<App />);

    expect(await screen.findByDisplayValue(BOOK.title)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Titolo'), {
      target: { value: updatedBook.title },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Narrativa' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Informatica' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Libro disponibile per il prestito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }));

    expect(await screen.findByText('Libro aggiornato correttamente.')).toBeInTheDocument();
    expectMultipartRequest(4, '/books/10', {
      title: updatedBook.title,
      author: BOOK.author,
      publicationYear: String(BOOK.publicationYear),
      description: BOOK.description,
      isbn: BOOK.isbn,
      available: 'false',
      categoryIds: '[3]',
    });
  });

  it('changes availability and requires confirmation before deletion', async () => {
    const unavailableBook = { ...BOOK, available: false };
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    setRoute('/my-library');
    window.fetch
      .mockResolvedValueOnce(authenticatedResponse())
      .mockResolvedValueOnce(apiResponse(200, { data: { books: [BOOK] } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { book: unavailableBook } }))
      .mockResolvedValueOnce(apiResponse(204));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Segna come non disponibile' }));
    expect(await screen.findByText('Non disponibile')).toBeInTheDocument();
    expectMultipartRequest(3, '/books/10', { available: 'false' });

    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(window.fetch).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(await screen.findByText('Libro eliminato dalla biblioteca.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'La biblioteca è ancora vuota' }),
    ).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(window.fetch).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/v1/books/10',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
  });

  it('shows a recoverable error when the library cannot be loaded', async () => {
    setRoute('/my-library');
    window.fetch
      .mockResolvedValueOnce(authenticatedResponse())
      .mockResolvedValueOnce(
        apiResponse(500, {
          error: { code: 'INTERNAL_ERROR', message: 'Biblioteca temporaneamente non disponibile.' },
        }),
      )
      .mockResolvedValueOnce(apiResponse(200, { data: { books: [BOOK] } }));

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Biblioteca non disponibile' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Biblioteca temporaneamente non disponibile.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

    expect(await screen.findByRole('heading', { name: BOOK.title })).toBeInTheDocument();
  });
});
