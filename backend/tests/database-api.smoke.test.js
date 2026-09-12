import pg from 'pg';
import request from 'supertest';
import { URL } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

const { Pool } = pg;

const TEST_DATABASE_NAME = 'geobook_test';
const RUN_DATABASE_SMOKE_TESTS = process.env.RUN_DATABASE_SMOKE_TESTS === 'true';
const TEST_PASSWORD = 'GeoBookDemo2026!';
const TEST_PASSWORD_HASH = '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO';
const TEST_EMAIL = 'postgis-smoke-owner@example.test';
const TEST_BOOK_TITLE = 'Smoke test PostGIS isolato';

const databaseDescribe = RUN_DATABASE_SMOKE_TESTS ? describe : describe.skip;

function requireIsolatedDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL è obbligatoria per gli smoke test PostgreSQL/PostGIS.');
  }

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      `Gli smoke test accettano soltanto il database sacrificabile "${TEST_DATABASE_NAME}".`,
    );
  }

  return databaseUrl;
}

describe('database smoke test isolation', () => {
  it('accepts only the dedicated test database name', () => {
    const testUrl = 'postgresql://geobook:geobook@localhost:5432/geobook_test';
    const developmentUrl = 'postgresql://geobook:geobook@localhost:5432/geobook';

    expect(requireIsolatedDatabaseUrl(testUrl)).toBe(testUrl);
    expect(() => requireIsolatedDatabaseUrl(developmentUrl)).toThrow(
      'Gli smoke test accettano soltanto il database sacrificabile "geobook_test".',
    );
  });
});

databaseDescribe('API with real PostgreSQL/PostGIS', () => {
  let pool;
  let client;
  let app;
  let ownerId;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: requireIsolatedDatabaseUrl(),
      connectionTimeoutMillis: 5_000,
      max: 2,
    });

    // Il nome viene verificato anche sulla connessione effettiva prima di qualsiasi scrittura.
    const databaseCheck = await pool.query(
      `SELECT current_database() AS "databaseName",
              EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'postgis'
              ) AS "hasPostgis"`,
    );
    expect(databaseCheck.rows[0]).toEqual({
      databaseName: TEST_DATABASE_NAME,
      hasPostgis: true,
    });
  });

  beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (
         name, email, password_hash, role, city, public_area,
         location, share_radius_km, location_consent_at
       )
       VALUES (
         'Proprietaria smoke test', $1, $2, 'USER', 'Bari', 'Zona test',
         ST_SetSRID(ST_MakePoint(16.8719, 41.1171), 4326)::geography,
         5, CURRENT_TIMESTAMP
       )
       RETURNING id`,
      [TEST_EMAIL, TEST_PASSWORD_HASH],
    );
    ownerId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO books (owner_id, title, author, publication_year, available)
       VALUES ($1, $2, 'Autrice smoke test', 2024, TRUE)`,
      [ownerId, TEST_BOOK_TITLE],
    );

    app = createApp({
      config: {
        nodeEnv: 'test',
        frontendOrigin: 'http://localhost:5173',
        jwtSecret: 'database-smoke-test-secret-at-least-32-characters',
        jwtExpiresIn: '2h',
        bcryptRounds: 10,
        uploadDir: './storage',
        maxUploadBytes: 5_242_880,
        rateLimitWindowMs: 60_000,
        rateLimitMax: 100,
      },
      pool: client,
      logger: { error: vi.fn(), log: vi.fn() },
    });
  });

  afterEach(async () => {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
        client = undefined;
      }
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('filters a real PostGIS result using its approximate public point', async () => {
    const response = await request(app)
      .get('/api/v1/books')
      .query({ q: TEST_BOOK_TITLE, lat: 41.1171, lon: 16.8719, radiusKm: 1, limit: 10 })
      .expect(200);

    expect(response.body.data).toMatchObject({
      books: [
        {
          title: TEST_BOOK_TITLE,
          distanceKm: 0.4,
          approximateLocation: { lat: 41.12, lon: 16.87 },
        },
      ],
      meta: { total: 1 },
    });
  });

  it('revokes consent through the API and removes the owner from spatial results', async () => {
    const owner = request.agent(app);
    await owner
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const beforeRevocation = await request(app)
      .get('/api/v1/books')
      .query({ q: TEST_BOOK_TITLE, lat: 41.12, lon: 16.87, radiusKm: 1, limit: 10 })
      .expect(200);
    expect(beforeRevocation.body.data.meta.total).toBe(1);

    await owner.delete('/api/v1/profile/location').expect(204);

    const afterRevocation = await request(app)
      .get('/api/v1/books')
      .query({ q: TEST_BOOK_TITLE, lat: 41.12, lon: 16.87, radiusKm: 1, limit: 10 })
      .expect(200);
    expect(afterRevocation.body.data).toMatchObject({ books: [], meta: { total: 0 } });

    const storedLocation = await client.query(
      `SELECT location IS NULL AS "locationCleared",
              location_consent_at IS NULL AS "consentCleared"
       FROM users
       WHERE id = $1`,
      [ownerId],
    );
    expect(storedLocation.rows[0]).toEqual({ locationCleared: true, consentCleared: true });
  });
});
