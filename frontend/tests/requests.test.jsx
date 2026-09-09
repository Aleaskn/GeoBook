import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse, setRoute, TEST_USER } from './test-utils.js';

const BOOK = {
  id: '10',
  title: 'Romanzo di prova',
  author: 'Autrice Fittizia',
  publicationYear: 2021,
  description: 'Una storia dimostrativa.',
  isbn: null,
  coverPath: '/uploads/placeholder-cover.svg',
  available: true,
  publicArea: 'Zona Murat',
  categories: [],
};
const BASE_REQUEST = {
  id: '20',
  status: 'PENDING',
  message: 'Richiesta dimostrativa.',
  createdAt: '2026-09-14T10:00:00.000Z',
  respondedAt: null,
  returnedAt: null,
  book: {
    id: BOOK.id,
    title: BOOK.title,
    author: BOOK.author,
    thumbnailPath: '/uploads/placeholder-cover.svg',
  },
  requester: { id: '2', name: 'Richiedente Demo' },
  owner: { id: String(TEST_USER.id), name: TEST_USER.name },
};

function authenticatedResponse() {
  return apiResponse(200, { data: { user: TEST_USER } });
}

describe('loan request UI', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a request from an available book detail with an accessible message field', async () => {
    setRoute('/books/10');
    window.fetch.mockImplementation((url, options = {}) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(authenticatedResponse());
      }

      if (url.endsWith('/books/10/view')) {
        return Promise.resolve(apiResponse(201, { data: { recorded: true } }));
      }

      if (url.endsWith('/books/10/loan-requests')) {
        return Promise.resolve(
          apiResponse(201, { data: { loanRequest: { ...BASE_REQUEST, message: 'Per favore.' } } }),
        );
      }

      if (url.endsWith('/books/10')) {
        return Promise.resolve(apiResponse(200, { data: { book: BOOK } }));
      }

      throw new Error(`Richiesta inattesa: ${url} ${options.method ?? 'GET'}`);
    });

    render(<App />);

    const message = await screen.findByLabelText('Messaggio facoltativo');
    fireEvent.change(message, { target: { value: '  Per favore.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia richiesta' }));

    const success = await screen.findByText(/Richiesta inviata/);
    expect(success).toHaveAttribute('role', 'status');
    expect(within(success).getByRole('link', { name: 'Richieste' })).toHaveAttribute(
      'href',
      '/requests',
    );
    const requestCall = window.fetch.mock.calls.find(([url]) =>
      url.endsWith('/books/10/loan-requests'),
    );
    expect(requestCall).toBeDefined();
    expect(requestCall[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ message: 'Per favore.' }),
    });
  });

  it('shows only role-valid actions and updates incoming and outgoing requests', async () => {
    const outgoingRequest = {
      ...BASE_REQUEST,
      id: '21',
      requester: { id: String(TEST_USER.id), name: TEST_USER.name },
      owner: { id: '1', name: 'Proprietario Demo' },
    };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    setRoute('/requests');
    window.fetch.mockImplementation((url, options = {}) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(authenticatedResponse());
      }

      if (url.endsWith('/me/loan-requests?direction=incoming')) {
        return Promise.resolve(apiResponse(200, { data: { loanRequests: [BASE_REQUEST] } }));
      }

      if (url.endsWith('/me/loan-requests?direction=outgoing')) {
        return Promise.resolve(apiResponse(200, { data: { loanRequests: [outgoingRequest] } }));
      }

      if (url.endsWith('/loan-requests/20/status')) {
        expect(JSON.parse(options.body)).toEqual({ status: 'ACCEPTED' });
        return Promise.resolve(
          apiResponse(200, {
            data: {
              loanRequest: {
                ...BASE_REQUEST,
                status: 'ACCEPTED',
                respondedAt: '2026-09-14T10:05:00.000Z',
              },
            },
          }),
        );
      }

      if (url.endsWith('/loan-requests/21/status')) {
        expect(JSON.parse(options.body)).toEqual({ status: 'CANCELLED' });
        return Promise.resolve(
          apiResponse(200, {
            data: {
              loanRequest: {
                ...outgoingRequest,
                status: 'CANCELLED',
                respondedAt: '2026-09-14T10:06:00.000Z',
              },
            },
          }),
        );
      }

      throw new Error(`Richiesta inattesa: ${url}`);
    });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 2, name: 'In entrata' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accetta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annulla richiesta' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accetta' }));
    expect(await screen.findByText('Stato: Accettata')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conferma restituzione' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Richiesta accettata');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'In entrata (1)' }), {
      key: 'ArrowRight',
    });
    expect(screen.getByRole('tab', { name: 'In uscita (1)' })).toHaveFocus();
    expect(screen.getByRole('heading', { level: 2, name: 'In uscita' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Annulla richiesta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accetta' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Annulla richiesta' }));
    expect(await screen.findByText('Stato: Annullata')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('renders empty lists and recovers after a loading error', async () => {
    setRoute('/requests');
    let failed = false;
    window.fetch.mockImplementation((url) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(authenticatedResponse());
      }

      if (url.includes('/me/loan-requests?')) {
        if (!failed) {
          failed = true;
          return Promise.resolve(
            apiResponse(500, {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Richieste temporaneamente non disponibili.',
              },
            }),
          );
        }
        return Promise.resolve(apiResponse(200, { data: { loanRequests: [] } }));
      }

      throw new Error(`Richiesta inattesa: ${url}`);
    });

    render(<App />);

    expect(await screen.findByText('Richieste temporaneamente non disponibili.')).toHaveAttribute(
      'role',
      'alert',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByText('Non hai richieste in entrata.')).toHaveAttribute(
      'role',
      'status',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'In uscita (0)' }));
    await waitFor(() => {
      expect(screen.getByText('Non hai ancora inviato richieste.')).toBeInTheDocument();
    });
  });
});
