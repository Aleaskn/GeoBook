import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { apiResponse } from './test-utils.js';

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        apiResponse(401, {
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Autenticazione richiesta.' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the initial accessible GeoBook page', async () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Condividi storie con la tua comunità' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigazione principale' })).toBeInTheDocument();
    expect(screen.getByText(/rispetto della tua privacy/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Salta al contenuto principale' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(await screen.findByRole('link', { name: 'Accedi' })).toBeInTheDocument();
  });

  it('moves focus to the main content when the skip link is activated', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Salta al contenuto principale' }));

    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });
});
