import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse, setRoute, TEST_USER } from './test-utils.js';

vi.mock('chart.js', () => ({
  ArcElement: {},
  BarElement: {},
  CategoryScale: {},
  Chart: { register: vi.fn() },
  Legend: {},
  LinearScale: {},
  Tooltip: {},
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div role="img" aria-label="Grafico a barre delle richieste aggregate per mese" />,
  Doughnut: () => <div role="img" aria-label="Grafico ad anello delle richieste per stato" />,
}));

const ADMIN = { ...TEST_USER, id: 1, name: 'Amministratrice Demo', role: 'ADMIN' };
const STATS = {
  usersCount: 6,
  booksCount: 18,
  loanRequestsCount: 5,
  completedLoansCount: 1,
  loanRequestsByStatus: [
    { status: 'PENDING', count: 1 },
    { status: 'ACCEPTED', count: 1 },
    { status: 'REJECTED', count: 1 },
    { status: 'RETURNED', count: 1 },
    { status: 'CANCELLED', count: 1 },
  ],
  topCategories: [{ id: '1', name: 'Narrativa', slug: 'narrativa', booksCount: 7 }],
  mostViewedBooks: [{ id: '4', title: 'Libro più visto', author: 'Autrice Demo', viewsCount: 8 }],
  loanRequestsByMonth: [{ month: '2026-09', count: 2 }],
};
const ACTIVITY = {
  users: [
    {
      id: '6',
      name: 'Nuovo Utente',
      role: 'USER',
      city: 'Bari',
      publicArea: 'Zona Murat',
      createdAt: '2026-09-15T10:00:00.000Z',
    },
  ],
  books: [
    {
      id: '18',
      title: 'Libro recente',
      author: 'Autore Demo',
      available: true,
      ownerName: 'Nuovo Utente',
      createdAt: '2026-09-15T10:00:00.000Z',
    },
  ],
  loanRequests: [
    {
      id: '5',
      status: 'PENDING',
      createdAt: '2026-09-15T10:00:00.000Z',
      book: { id: '18', title: 'Libro recente' },
      requesterName: 'Richiedente Demo',
      ownerName: 'Nuovo Utente',
    },
  ],
};

describe('admin dashboard', () => {
  beforeEach(() => {
    setRoute('/admin');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders KPI, accessible chart tables and recent activity for an administrator', async () => {
    window.fetch.mockImplementation((url) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(apiResponse(200, { data: { user: ADMIN } }));
      }

      if (url.endsWith('/admin/stats')) {
        return Promise.resolve(apiResponse(200, { data: { stats: STATS } }));
      }

      if (url.endsWith('/admin/recent-activity')) {
        return Promise.resolve(apiResponse(200, { data: { recentActivity: ACTIVITY } }));
      }

      throw new Error(`Richiesta inattesa: ${url}`);
    });

    render(<App />);

    expect(await screen.findByText('Categorie con più libri')).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard amministrativa' }),
    ).toBeVisible();
    const indicators = screen.getByLabelText('Indicatori principali');
    expect(within(indicators).getByText('18')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Grafico ad anello delle richieste per stato' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Grafico a barre delle richieste aggregate per mese' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Valori del grafico delle richieste per stato')).toBeInTheDocument();
    expect(screen.getByText('Valori del grafico delle richieste per mese')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Libro più visto' })).toHaveAttribute(
      'href',
      '/books/4',
    );
    expect(screen.getByText('Nuovo Utente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(JSON.stringify(STATS) + JSON.stringify(ACTIVITY)).not.toContain('@example.test');
  });

  it('blocks a normal user before calling either admin endpoint', async () => {
    window.fetch.mockImplementation((url) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(apiResponse(200, { data: { user: TEST_USER } }));
      }

      throw new Error(`Endpoint amministrativo chiamato da USER: ${url}`);
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Area riservata' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('soltanto agli amministratori');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  it('shows API errors without rendering partial administrative data', async () => {
    window.fetch.mockImplementation((url) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(apiResponse(200, { data: { user: ADMIN } }));
      }

      if (url.endsWith('/admin/stats')) {
        return Promise.resolve(
          apiResponse(500, {
            error: { code: 'INTERNAL_ERROR', message: 'Statistiche non disponibili.' },
          }),
        );
      }

      return Promise.resolve(apiResponse(200, { data: { recentActivity: ACTIVITY } }));
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Dashboard non disponibile' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Statistiche non disponibili.');
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
    expect(screen.queryByText('Categorie con più libri')).not.toBeInTheDocument();
  });
});
