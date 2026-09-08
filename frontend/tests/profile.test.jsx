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
    expect(screen.getByText('PATCH /api/v1/profile/location')).toBeInTheDocument();
    expect(screen.getByText('DELETE /api/v1/profile/location')).toBeInTheDocument();
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
