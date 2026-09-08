import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse, setRoute } from './test-utils.js';

const leafletMocks = vi.hoisted(() => {
  const mapInstance = {
    fitBounds: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(),
  };
  const markerLayer = { clearLayers: vi.fn() };
  markerLayer.addTo = vi.fn(() => markerLayer);
  const tileLayer = { addTo: vi.fn(() => tileLayer) };

  return {
    map: vi.fn(() => mapInstance),
    mapInstance,
    markerLayer,
    layerGroup: vi.fn(() => markerLayer),
    tileLayer: vi.fn(() => tileLayer),
    circleMarker: vi.fn(() => {
      const marker = {
        addTo: vi.fn(() => marker),
        bindPopup: vi.fn(() => marker),
      };
      return marker;
    }),
    latLngBounds: vi.fn((positions) => ({ positions })),
  };
});

vi.mock('leaflet', () => ({
  default: {
    map: leafletMocks.map,
    layerGroup: leafletMocks.layerGroup,
    tileLayer: leafletMocks.tileLayer,
    circleMarker: leafletMocks.circleMarker,
    latLngBounds: leafletMocks.latLngBounds,
  },
}));

const AUTHENTICATION_ERROR = {
  error: { code: 'AUTHENTICATION_REQUIRED', message: 'Autenticazione richiesta.' },
};
const CATEGORIES = [{ id: '1', name: 'Narrativa', slug: 'narrativa' }];
const MAP_BOOK = {
  id: '10',
  title: 'Romanzo di prova',
  author: 'Autrice Fittizia',
  publicationYear: 2021,
  thumbnailPath: '/uploads/placeholder-cover.svg',
  available: true,
  publicArea: 'Zona Murat',
  categories: CATEGORIES,
  distanceKm: 0.8,
  approximateLocation: { lat: 41.12, lon: 16.87 },
};
const DETAIL_BOOK = {
  id: '10',
  title: 'Romanzo di prova',
  author: 'Autrice Fittizia',
  publicationYear: 2021,
  description: 'Una storia dimostrativa.',
  isbn: '9780000000010',
  coverPath: '/uploads/placeholder-cover.svg',
  available: true,
  publicArea: 'Zona Murat',
  categories: CATEGORIES,
  distanceKm: 0.8,
};

function commonResponse(url) {
  if (url.endsWith('/auth/me')) {
    return apiResponse(401, AUTHENTICATION_ERROR);
  }

  if (url.endsWith('/categories')) {
    return apiResponse(200, { data: { categories: CATEGORIES } });
  }

  return null;
}

describe('map and public book detail', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the same geographic results in the list and on the map', async () => {
    setRoute('/map?lat=41.1171&lon=16.8719&radiusKm=5&category=narrativa');
    window.fetch.mockImplementation((url) => {
      const response = commonResponse(url);
      if (response) {
        return Promise.resolve(response);
      }

      if (url.includes('/books?')) {
        return Promise.resolve(
          apiResponse(200, {
            data: {
              books: [MAP_BOOK],
              meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
            },
          }),
        );
      }

      throw new Error(`Richiesta inattesa: ${url}`);
    });

    render(<App />);

    expect(await screen.findByRole('link', { name: MAP_BOOK.title })).toHaveAttribute(
      'href',
      '/books/10?lat=41.1171&lon=16.8719&radiusKm=5&category=narrativa',
    );
    expect(screen.getByText('0,8 km')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Mappa dei risultati con posizioni approssimate' }),
    ).toBeInTheDocument();
    expect(leafletMocks.circleMarker).toHaveBeenCalledTimes(1);
    expect(leafletMocks.circleMarker).toHaveBeenCalledWith(
      [41.12, 16.87],
      expect.objectContaining({ radius: 9 }),
    );
    expect(window.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/books?category=narrativa&lat=41.1171&lon=16.8719&radiusKm=5&limit=50',
      expect.objectContaining({ signal: expect.any(window.AbortSignal) }),
    );
  });

  it('shows instructions before coordinates and an empty state after a search', async () => {
    setRoute('/map');
    window.fetch.mockImplementation((url) => {
      const response = commonResponse(url);
      if (response) {
        return Promise.resolve(response);
      }

      throw new Error(`Richiesta inattesa: ${url}`);
    });

    const { unmount } = render(<App />);
    expect(
      await screen.findByText(
        'Inserisci latitudine e longitudine per avviare la ricerca geografica.',
      ),
    ).toBeInTheDocument();
    expect(window.fetch.mock.calls.every(([url]) => !url.includes('/books?'))).toBe(true);
    unmount();

    setRoute('/map?lat=41.1171&lon=16.8719&radiusKm=1');
    window.fetch.mockImplementation((url) => {
      const response = commonResponse(url);
      if (response) {
        return Promise.resolve(response);
      }

      return Promise.resolve(
        apiResponse(200, {
          data: { books: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } },
        }),
      );
    });
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Nessun libro nella zona' }),
    ).toBeInTheDocument();
  });

  it('loads a public detail, records one view per browser session and shows public data', async () => {
    setRoute('/books/10?lat=41.1171&lon=16.8719');
    window.fetch.mockImplementation((url) => {
      const response = commonResponse(url);
      if (response) {
        return Promise.resolve(response);
      }

      if (url.endsWith('/books/10/view')) {
        return Promise.resolve(apiResponse(201, { data: { recorded: true } }));
      }

      if (url.includes('/books/10?')) {
        return Promise.resolve(apiResponse(200, { data: { book: DETAIL_BOOK } }));
      }

      throw new Error(`Richiesta inattesa: ${url}`);
    });

    const firstRender = render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: DETAIL_BOOK.title })).toBeVisible();
    expect(screen.getByText('Una storia dimostrativa.')).toBeInTheDocument();
    expect(screen.getByText('Distanza indicativa')).toBeInTheDocument();
    expect(screen.getByText('Disponibile per una richiesta')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('geobook:viewed-book:10')).toBe('recorded');
    expect(window.fetch.mock.calls.filter(([url]) => url.endsWith('/books/10/view'))).toHaveLength(
      1,
    );

    firstRender.unmount();
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: DETAIL_BOOK.title });
    await waitFor(() => {
      expect(
        window.fetch.mock.calls.filter(([url]) => url.endsWith('/books/10/view')),
      ).toHaveLength(1);
    });
  });

  it('renders the backend error when a detail is unavailable', async () => {
    setRoute('/books/999');
    window.fetch.mockImplementation((url) => {
      const response = commonResponse(url);
      if (response) {
        return Promise.resolve(response);
      }

      return Promise.resolve(
        apiResponse(404, {
          error: { code: 'BOOK_NOT_FOUND', message: 'Libro non trovato.' },
        }),
      );
    });

    render(<App />);
    const message = await screen.findByText('Libro non trovato.');
    expect(message).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
  });
});
