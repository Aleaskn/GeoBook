import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createInMemoryCatalogRepositories } from './helpers/in-memory-catalog-repositories.js';
import { createInMemoryLoanRequestRepository } from './helpers/in-memory-loan-request-repository.js';
import { createInMemoryUserRepository } from './helpers/in-memory-user-repository.js';

const DEMO_PASSWORD_HASH = '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO';
const timestamp = '2026-09-14T10:00:00.000Z';
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
const users = [
  { id: '1', name: 'Proprietaria Demo', email: 'owner@example.test' },
  { id: '2', name: 'Richiedente Demo', email: 'requester@example.test' },
  { id: '3', name: 'Terza Persona', email: 'outsider@example.test' },
].map((user) => ({
  ...user,
  passwordHash: DEMO_PASSWORD_HASH,
  role: 'USER',
  city: 'Bari',
  publicArea: 'Zona demo',
  shareRadiusKm: 10,
  location: null,
  locationConsentAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}));
const books = [
  {
    id: '10',
    ownerId: '1',
    title: 'Libro disponibile',
    author: 'Autrice Demo',
    publicationYear: 2020,
    thumbnailPath: null,
    available: true,
    categoryIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: '11',
    ownerId: '1',
    title: 'Libro non disponibile',
    author: 'Autore Demo',
    publicationYear: 2021,
    thumbnailPath: null,
    available: false,
    categoryIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

function createTestContext({ loanRequests = [] } = {}) {
  const userRepository = createInMemoryUserRepository(users);
  const catalogRepositories = createInMemoryCatalogRepositories({ books });
  const loanRequestRepository = createInMemoryLoanRequestRepository({
    users,
    books,
    loanRequests,
  });
  const pool = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
  const logger = { error: vi.fn(), log: vi.fn() };
  const app = createApp({
    config: baseConfig,
    pool,
    logger,
    userRepository,
    ...catalogRepositories,
    loanRequestRepository,
  });

  return { app, loanRequestRepository, logger };
}

async function authenticatedAgent(app, email) {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password: 'GeoBookDemo2026!' }).expect(200);
  return agent;
}

async function createPendingRequest(app, message = 'Posso prendere in prestito questo libro?') {
  const requester = await authenticatedAgent(app, 'requester@example.test');
  const response = await requester
    .post('/api/v1/books/10/loan-requests')
    .send({ message })
    .expect(201);
  return { requester, loanRequest: response.body.data.loanRequest };
}

describe('loan request API', () => {
  it('requires authentication and validates request, direction and status inputs', async () => {
    const { app } = createTestContext();

    await request(app).post('/api/v1/books/10/loan-requests').send({}).expect(401);
    await request(app).get('/api/v1/me/loan-requests?direction=incoming').expect(401);
    await request(app)
      .patch('/api/v1/loan-requests/1/status')
      .send({ status: 'ACCEPTED' })
      .expect(401);

    const requester = await authenticatedAgent(app, 'requester@example.test');
    await requester
      .post('/api/v1/books/10/loan-requests')
      .send({ message: 'x'.repeat(501) })
      .expect(400);
    await requester.get('/api/v1/me/loan-requests?direction=sideways').expect(400);
    await requester.patch('/api/v1/loan-requests/1/status').send({ status: 'PENDING' }).expect(400);
  });

  it('covers T07 and T08 while exposing lists only to their participants', async () => {
    const { app, loanRequestRepository } = createTestContext();
    const owner = await authenticatedAgent(app, 'owner@example.test');
    const requester = await authenticatedAgent(app, 'requester@example.test');

    const ownBook = await owner.post('/api/v1/books/10/loan-requests').send({}).expect(409);
    expect(ownBook.body.error.code).toBe('OWN_BOOK_LOAN_REQUEST');
    expect(loanRequestRepository.getLoanRequests()).toHaveLength(0);

    const created = await requester
      .post('/api/v1/books/10/loan-requests')
      .send({ message: '  Richiesta dimostrativa.  ' })
      .expect(201);
    expect(created.body.data.loanRequest).toMatchObject({
      status: 'PENDING',
      message: 'Richiesta dimostrativa.',
      book: { id: '10', title: 'Libro disponibile' },
      requester: { id: '2', name: 'Richiedente Demo' },
      owner: { id: '1', name: 'Proprietaria Demo' },
    });
    expect(JSON.stringify(created.body)).not.toContain('@example.test');

    const duplicate = await requester.post('/api/v1/books/10/loan-requests').send({}).expect(409);
    expect(duplicate.body.error.code).toBe('PENDING_LOAN_REQUEST_EXISTS');
    await requester.post('/api/v1/books/11/loan-requests').send({}).expect(409);

    const incoming = await owner.get('/api/v1/me/loan-requests?direction=incoming').expect(200);
    const outgoing = await requester.get('/api/v1/me/loan-requests?direction=outgoing').expect(200);
    expect(incoming.body.data.loanRequests).toHaveLength(1);
    expect(outgoing.body.data.loanRequests).toEqual(incoming.body.data.loanRequests);

    const outsider = await authenticatedAgent(app, 'outsider@example.test');
    const unrelated = await outsider.get('/api/v1/me/loan-requests?direction=outgoing').expect(200);
    expect(unrelated.body.data.loanRequests).toEqual([]);
  });

  it('covers T09, authorization and availability changes for accept and return', async () => {
    const { app, loanRequestRepository } = createTestContext();
    const { requester, loanRequest } = await createPendingRequest(app);
    const owner = await authenticatedAgent(app, 'owner@example.test');
    const outsider = await authenticatedAgent(app, 'outsider@example.test');

    const forbidden = await outsider
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'ACCEPTED' })
      .expect(403);
    expect(forbidden.body.error.code).toBe('LOAN_REQUEST_FORBIDDEN');
    expect(loanRequestRepository.getLoanRequests()[0].status).toBe('PENDING');

    await requester
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'ACCEPTED' })
      .expect(403);

    const accepted = await owner
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'ACCEPTED' })
      .expect(200);
    expect(accepted.body.data.loanRequest.status).toBe('ACCEPTED');
    expect(accepted.body.data.loanRequest.respondedAt).toEqual(expect.any(String));
    expect(loanRequestRepository.getBook('10').available).toBe(false);

    const invalidCancellation = await requester
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'CANCELLED' })
      .expect(409);
    expect(invalidCancellation.body.error.code).toBe('INVALID_LOAN_REQUEST_TRANSITION');
    expect(loanRequestRepository.getLoanRequests()[0].status).toBe('ACCEPTED');

    const returned = await owner
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'RETURNED' })
      .expect(200);
    expect(returned.body.data.loanRequest).toMatchObject({
      status: 'RETURNED',
      returnedAt: expect.any(String),
    });
    expect(loanRequestRepository.getBook('10').available).toBe(true);

    await owner
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'RETURNED' })
      .expect(409);
    expect(loanRequestRepository.getLoanRequests()[0].status).toBe('RETURNED');
  });

  it('allows only the owner to reject and only the requester to cancel pending requests', async () => {
    const { app } = createTestContext();
    const { requester, loanRequest } = await createPendingRequest(app);
    const owner = await authenticatedAgent(app, 'owner@example.test');

    await owner
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'CANCELLED' })
      .expect(403);
    const cancelled = await requester
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'CANCELLED' })
      .expect(200);
    expect(cancelled.body.data.loanRequest.status).toBe('CANCELLED');

    const second = await requester
      .post('/api/v1/books/10/loan-requests')
      .send({ message: 'Seconda richiesta dopo annullamento.' })
      .expect(201);
    const rejected = await owner
      .patch(`/api/v1/loan-requests/${second.body.data.loanRequest.id}/status`)
      .send({ status: 'REJECTED' })
      .expect(200);
    expect(rejected.body.data.loanRequest.status).toBe('REJECTED');
  });

  it('rolls back book availability when a transition fails inside the transaction', async () => {
    const { app, loanRequestRepository, logger } = createTestContext();
    const { loanRequest } = await createPendingRequest(app);
    const owner = await authenticatedAgent(app, 'owner@example.test');
    loanRequestRepository.failNextUpdate();

    await owner
      .patch(`/api/v1/loan-requests/${loanRequest.id}/status`)
      .send({ status: 'ACCEPTED' })
      .expect(500);

    expect(loanRequestRepository.getBook('10').available).toBe(true);
    expect(loanRequestRepository.getLoanRequests()[0].status).toBe('PENDING');
    expect(logger.error).toHaveBeenCalled();
  });
});
