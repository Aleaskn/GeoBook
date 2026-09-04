import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse, setRoute, TEST_USER } from './test-utils.js';

const AUTHENTICATION_ERROR = {
  error: { code: 'AUTHENTICATION_REQUIRED', message: 'Autenticazione richiesta.' },
};

describe('authentication flows', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects an anonymous visitor from the protected profile route', async () => {
    setRoute('/profile');
    window.fetch.mockResolvedValueOnce(apiResponse(401, AUTHENTICATION_ERROR));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Accedi a GeoBook' })).toBeInTheDocument();
    expect(screen.getByText('Effettua l’accesso per aprire questa pagina.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(window.location.pathname).toBe('/login');
  });

  it('validates login fields before contacting the login endpoint', async () => {
    setRoute('/login');
    window.fetch.mockResolvedValueOnce(apiResponse(401, AUTHENTICATION_ERROR));

    render(<App />);

    await screen.findByRole('heading', { name: 'Accedi a GeoBook' });
    fireEvent.click(screen.getByRole('button', { name: 'Accedi' }));

    expect(screen.getByText('Email obbligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Password obbligatoria.')).toBeInTheDocument();
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  it('logs in with a credentialed request and opens the profile', async () => {
    setRoute('/login');
    window.fetch
      .mockResolvedValueOnce(apiResponse(401, AUTHENTICATION_ERROR))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }));

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: TEST_USER.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'PasswordDemo1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Accedi' }));

    expect(await screen.findByDisplayValue(TEST_USER.name)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Il tuo profilo' })).toBeInTheDocument();
    expect(screen.getByText('Accesso effettuato.')).toHaveAttribute('role', 'status');
    expect(window.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: TEST_USER.email, password: 'PasswordDemo1!' }),
      }),
    );
  });

  it('registers a complete account and preserves the public-area privacy wording', async () => {
    setRoute('/register');
    window.fetch
      .mockResolvedValueOnce(apiResponse(401, AUTHENTICATION_ERROR))
      .mockResolvedValueOnce(apiResponse(201, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }));

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: TEST_USER.name } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: TEST_USER.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'PasswordDemo1!' } });
    fireEvent.change(screen.getByLabelText('Città'), { target: { value: TEST_USER.city } });
    fireEvent.change(screen.getByLabelText('Zona pubblica'), {
      target: { value: TEST_USER.publicArea },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrati' }));

    expect(
      await screen.findByText('Registrazione completata. Benvenuto in GeoBook!'),
    ).toHaveAttribute('role', 'status');
    expect(window.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/auth/register',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('ends the authenticated session through the logout control', async () => {
    setRoute('/');
    window.fetch
      .mockResolvedValueOnce(apiResponse(200, { data: { user: TEST_USER } }))
      .mockResolvedValueOnce(apiResponse(204));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Esci' }));

    expect(await screen.findByText('Disconnessione completata.')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });
});
