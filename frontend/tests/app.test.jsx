import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App.jsx';

describe('App', () => {
  it('renders the initial accessible GeoBook page', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'GeoBook' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigazione principale' })).toBeInTheDocument();
    expect(screen.getByText(/privacy e accessibilita/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Salta al contenuto principale' })).toHaveAttribute(
      'href',
      '#main-content',
    );
  });
});
