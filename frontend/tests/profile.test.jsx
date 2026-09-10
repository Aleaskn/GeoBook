import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse, setRoute, TEST_USER } from './test-utils.js';

describe('profile page', () => {
  beforeEach(() => {
    setRoute('/profile');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and updates the editable profile fields', async () => {
    const updatedUser = { ...TEST_USER, name: 'Giulia Bianchi', shareRadiusKm: 20 };
    window.fetch
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: updatedUser } }));

    render(<App />);

    expect(await screen.findByDisplayValue(TEST_USER.name)).toBeInTheDocument();
    expect(screen.getByText('Non condivisa')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Coordinate e consenso' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Latitudine')).toBeInTheDocument();
    expect(screen.getByLabelText('Longitudine')).toBeInTheDocument();
    expect(screen.getByLabelText(/acconsento al salvataggio/i)).toBeInTheDocument();
    expect(screen.getByText(/nei risultati pubblici mostra esclusivamente/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: updatedUser.name } });
    fireEvent.change(screen.getByLabelText('Raggio di condivisione'), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }));

    expect(await screen.findByText('Profilo aggiornato correttamente.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(window.fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/profile',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({
          name: updatedUser.name,
          city: TEST_USER.city,
          publicArea: TEST_USER.publicArea,
          shareRadiusKm: 20,
        }),
      }),
    );
  });

  it('saves coordinates with explicit consent and confirms their revocation', async () => {
    const locatedUser = {
      ...TEST_USER,
      locationConsentAt: '2026-09-16T10:00:00.000Z',
    };
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    window.fetch
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: locatedUser } }))
      .mockResolvedValueOnce(apiResponse(204));

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Latitudine'), {
      target: { value: '41,1171' },
    });
    fireEvent.change(screen.getByLabelText('Longitudine'), {
      target: { value: '16.8719' },
    });
    fireEvent.click(screen.getByLabelText(/acconsento al salvataggio/i));
    fireEvent.click(screen.getByRole('button', { name: 'Salva posizione' }));

    expect(await screen.findByText('Posizione e consenso salvati correttamente.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(window.fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/profile/location',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ lat: 41.1171, lon: 16.8719, consent: true }),
      }),
    );
    expect(screen.getByLabelText('Latitudine')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Revoca consenso ed elimina posizione' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Vuoi revocare il consenso ed eliminare la posizione precisa salvata?',
    );
    expect(await screen.findByText('Consenso revocato e posizione eliminata.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(window.fetch).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/v1/profile/location',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
    expect(screen.getByText('Non condivisa')).toBeInTheDocument();
  });

  it('validates coordinates and explicit consent before contacting the API', async () => {
    window.fetch
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }));

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Latitudine'), {
      target: { value: '91' },
    });
    fireEvent.change(screen.getByLabelText('Longitudine'), {
      target: { value: '181' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salva posizione' }));

    expect(screen.getByText('Latitudine non valida.')).toBeInTheDocument();
    expect(screen.getByText('Longitudine non valida.')).toBeInTheDocument();
    expect(screen.getByText(/devi fornire il consenso esplicito/i)).toBeInTheDocument();
    expect(window.fetch).toHaveBeenCalledTimes(2);
  });

  it('shows a recoverable loading error', async () => {
    window.fetch
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(
        apiResponse(500, {
          error: { code: 'INTERNAL_ERROR', message: 'Servizio temporaneamente non disponibile.' },
        }),
      )
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }));

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Profilo non disponibile' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Servizio temporaneamente non disponibile.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

    expect(await screen.findByDisplayValue(TEST_USER.name)).toBeInTheDocument();
  });
});
