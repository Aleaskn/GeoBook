import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

const baseConfig = {
  nodeEnv: 'test',
  frontendOrigin: 'http://localhost:5173',
  jwtSecret: 'test-secret-with-at-least-32-characters',
  jwtExpiresIn: '2h',
  bcryptRounds: 10,
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
};

function createTestApp({
  query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  config,
} = {}) {
  const pool = { query };
  const logger = { error: vi.fn(), log: vi.fn() };
  const app = createApp({ config: { ...baseConfig, ...config }, pool, logger });

  return { app, logger, query };
}

describe('GeoBook API foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a database-backed health response with security and CORS headers', async () => {
    const { app, query } = createTestApp();
    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', baseConfig.frontendOrigin)
      .expect(200);

    expect(response.body).toEqual({
      data: { status: 'ok', database: 'reachable' },
    });
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.headers['access-control-allow-origin']).toBe(baseConfig.frontendOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('does not grant CORS access to a different origin', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://not-allowed.example')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns the uniform error contract when the database is unavailable', async () => {
    const databaseError = new Error('connection refused');
    const { app, logger } = createTestApp({ query: vi.fn().mockRejectedValue(databaseError) });
    const response = await request(app).get('/api/v1/health').expect(500);

    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Il servizio non è temporaneamente disponibile.',
        details: [],
        requestId: response.headers['x-request-id'],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('connection refused');
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('returns the uniform error contract for unknown routes', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/v1/not-found').expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Risorsa non trovata.',
        details: [],
        requestId: response.headers['x-request-id'],
      },
    });
  });

  it('normalizes malformed JSON errors', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/v1/not-found')
      .set('Content-Type', 'application/json')
      .send('{"invalid":')
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'INVALID_JSON',
      message: 'Il corpo JSON non è valido.',
      requestId: response.headers['x-request-id'],
    });
  });

  it('uses the uniform error contract when the rate limit is exceeded', async () => {
    const { app } = createTestApp({ config: { rateLimitMax: 2 } });

    await request(app).get('/api/v1/health').expect(200);
    await request(app).get('/api/v1/health').expect(200);
    const response = await request(app).get('/api/v1/health').expect(429);

    expect(response.body.error).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      details: [],
      requestId: response.headers['x-request-id'],
    });
  });
});
