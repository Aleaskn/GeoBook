import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createInMemoryUserRepository } from './helpers/in-memory-user-repository.js';

const DEMO_PASSWORD_HASH = '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO';
const baseConfig = {
  nodeEnv: 'test',
  frontendOrigin: 'http://localhost:5173',
  jwtSecret: 'test-secret-with-at-least-32-characters',
  jwtExpiresIn: '2h',
  bcryptRounds: 10,
  uploadDir: './storage',
  maxUploadBytes: 5_242_880,
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
};
const registration = {
  name: 'Nuova Lettrice',
  email: 'Reader@Example.Test',
  password: 'UnaPassword2026!',
  city: 'Bari',
  publicArea: 'Quartiere Murat',
};

function createTestContext({ config = {}, initialUsers = [] } = {}) {
  const userRepository = createInMemoryUserRepository(initialUsers);
  const pool = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
  const logger = { error: vi.fn(), log: vi.fn() };
  const app = createApp({
    config: { ...baseConfig, ...config },
    pool,
    logger,
    userRepository,
  });

  return { app, userRepository };
}

function createDemoUser() {
  const timestamp = '2026-09-03T10:00:00.000Z';
  return {
    id: '1',
    name: 'Utente Demo',
    email: 'user1@example.test',
    passwordHash: DEMO_PASSWORD_HASH,
    role: 'USER',
    city: 'Bari',
    publicArea: 'Quartiere Murat',
    shareRadiusKm: 10,
    location: null,
    locationConsentAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('authentication API', () => {
  it('registers a user, hashes the password and starts an HttpOnly session', async () => {
    const { app, userRepository } = createTestContext();
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(201);

    expect(response.body.data.user).toMatchObject({
      id: '1',
      name: registration.name,
      email: registration.email.toLowerCase(),
      role: 'USER',
      shareRadiusKm: 10,
      locationConsentAt: null,
    });
    expect(response.body.data.user).not.toHaveProperty('password');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(response.body.data.user).not.toHaveProperty('location');
    expect(response.body.data.user).not.toHaveProperty('latitude');
    expect(response.body.data.user).not.toHaveProperty('longitude');

    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain('geobook_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=7200');

    const storedUser = userRepository.getPrivateUserByEmail(registration.email);
    expect(storedUser.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(storedUser.passwordHash).not.toContain(registration.password);
  });

  it('rejects a duplicate email case-insensitively', async () => {
    const { app } = createTestContext();

    await request(app).post('/api/v1/auth/register').send(registration).expect(201);
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...registration, email: registration.email.toUpperCase() })
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
      details: [],
    });
  });

  it('uses the same neutral error for an unknown email and a wrong password', async () => {
    const { app } = createTestContext({ initialUsers: [createDemoUser()] });
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'unknown@example.test', password: 'PasswordErrata!' })
      .expect(401);
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user1@example.test', password: 'PasswordErrata!' })
      .expect(401);

    expect(unknown.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email o password non valide.',
    });
    expect(wrongPassword.body.error).toMatchObject({
      code: unknown.body.error.code,
      message: unknown.body.error.message,
    });
  });

  it('logs in with the demo credentials and returns the current user', async () => {
    const { app } = createTestContext({ initialUsers: [createDemoUser()] });
    const agent = request.agent(app);

    await agent
      .post('/api/v1/auth/login')
      .send({ email: 'USER1@EXAMPLE.TEST', password: 'GeoBookDemo2026!' })
      .expect(200);
    const response = await agent.get('/api/v1/auth/me').expect(200);

    expect(response.body.data.user).toMatchObject({
      id: '1',
      email: 'user1@example.test',
      role: 'USER',
    });
  });

  it('denies protected routes without a valid cookie', async () => {
    const { app } = createTestContext();
    const missing = await request(app).get('/api/v1/auth/me').expect(401);
    const altered = await request(app)
      .get('/api/v1/profile')
      .set('Cookie', 'geobook_session=altered-token')
      .expect(401);

    expect(missing.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(altered.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('clears the session cookie on logout', async () => {
    const { app } = createTestContext();
    const agent = request.agent(app);

    await agent.post('/api/v1/auth/register').send(registration).expect(201);
    const response = await agent.post('/api/v1/auth/logout').expect(204);
    expect(response.headers['set-cookie'][0]).toMatch(
      /geobook_session=; Path=\/; Expires=.*; HttpOnly; SameSite=Lax/,
    );
    await agent.get('/api/v1/auth/me').expect(401);
  });

  it('marks cookies as Secure in production', async () => {
    const { app } = createTestContext({ config: { nodeEnv: 'production' } });
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(201);

    expect(response.headers['set-cookie'][0]).toContain('Secure');
  });
});

describe('profile API', () => {
  async function createAuthenticatedContext() {
    const context = createTestContext();
    const agent = request.agent(context.app);
    await agent.post('/api/v1/auth/register').send(registration).expect(201);
    return { ...context, agent };
  }

  it('reads and updates only the authenticated user profile', async () => {
    const { agent } = await createAuthenticatedContext();

    const current = await agent.get('/api/v1/profile').expect(200);
    expect(current.body.data.user.name).toBe(registration.name);

    const updated = await agent
      .patch('/api/v1/profile')
      .send({ name: 'Nome Aggiornato', shareRadiusKm: 20 })
      .expect(200);
    expect(updated.body.data.user).toMatchObject({
      name: 'Nome Aggiornato',
      shareRadiusKm: 20,
    });
  });

  it('rejects an empty profile patch and a radius outside the allowlist', async () => {
    const { agent } = await createAuthenticatedContext();

    const empty = await agent.patch('/api/v1/profile').send({}).expect(400);
    const invalidRadius = await agent
      .patch('/api/v1/profile')
      .send({ shareRadiusKm: 3 })
      .expect(400);

    expect(empty.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalidRadius.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires explicit consent, stores a location and never returns its coordinates', async () => {
    const { agent, userRepository } = await createAuthenticatedContext();
    const withoutConsent = await agent
      .patch('/api/v1/profile/location')
      .send({ lat: 41.1171, lon: 16.8719, consent: false })
      .expect(400);
    expect(withoutConsent.body.error.code).toBe('VALIDATION_ERROR');

    const response = await agent
      .patch('/api/v1/profile/location')
      .send({ lat: 41.1171, lon: 16.8719, consent: true })
      .expect(200);

    expect(response.body.data.user.locationConsentAt).not.toBeNull();
    expect(JSON.stringify(response.body)).not.toMatch(/41\.1171|16\.8719|"lat"|"lon"/);
    expect(userRepository.getPrivateUserByEmail(registration.email).location).toEqual({
      lat: 41.1171,
      lon: 16.8719,
    });
  });

  it('revokes consent and clears the stored location', async () => {
    const { agent, userRepository } = await createAuthenticatedContext();
    await agent
      .patch('/api/v1/profile/location')
      .send({ lat: 41.1171, lon: 16.8719, consent: true })
      .expect(200);

    await agent.delete('/api/v1/profile/location').expect(204);
    const profile = await agent.get('/api/v1/profile').expect(200);

    expect(profile.body.data.user.locationConsentAt).toBeNull();
    const storedUser = userRepository.getPrivateUserByEmail(registration.email);
    expect(storedUser.location).toBeNull();
    expect(storedUser.locationConsentAt).toBeNull();
  });
});
