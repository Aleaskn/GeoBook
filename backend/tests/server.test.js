import { describe, expect, it, vi } from 'vitest';
import { ConfigurationError } from '../src/config/env.js';
import { startServer } from '../src/server.js';

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgres://geobook:geobook@localhost:5432/geobook',
  JWT_SECRET: 'test-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: '2h',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  UPLOAD_DIR: './storage',
  MAX_UPLOAD_BYTES: '5242880',
  BCRYPT_ROUNDS: '12',
};

describe('server startup', () => {
  it('fails before creating a pool when required environment variables are missing', async () => {
    const poolFactory = vi.fn();

    await expect(startServer({ environment: {}, poolFactory })).rejects.toBeInstanceOf(
      ConfigurationError,
    );
    expect(poolFactory).not.toHaveBeenCalled();
  });

  it('closes the pool when the initial database connection fails', async () => {
    const databaseError = new Error('database offline');
    const pool = {
      query: vi.fn().mockRejectedValue(databaseError),
      end: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      startServer({
        environment: validEnvironment,
        poolFactory: () => pool,
      }),
    ).rejects.toThrow('Connessione iniziale al database non riuscita.');
    expect(pool.end).toHaveBeenCalledOnce();
  });
});
