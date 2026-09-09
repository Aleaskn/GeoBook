import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createInMemoryUserRepository } from './helpers/in-memory-user-repository.js';

const DEMO_PASSWORD_HASH = '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO';
const timestamp = '2026-09-15T10:00:00.000Z';
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
  { id: '1', name: 'Amministratrice Demo', email: 'admin@example.test', role: 'ADMIN' },
  { id: '2', name: 'Utente Demo', email: 'user@example.test', role: 'USER' },
].map((user) => ({
  ...user,
  passwordHash: DEMO_PASSWORD_HASH,
  city: 'Bari',
  publicArea: 'Zona demo',
  shareRadiusKm: 10,
  location: null,
  locationConsentAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}));

const statsRepositoryResult = {
  summary: {
    usersCount: '6',
    booksCount: '18',
    loanRequestsCount: '5',
    completedLoansCount: '1',
  },
  statuses: [
    { status: 'PENDING', count: '1' },
    { status: 'ACCEPTED', count: '1' },
    { status: 'REJECTED', count: '1' },
    { status: 'RETURNED', count: '1' },
    { status: 'CANCELLED', count: '1' },
  ],
  categories: [{ id: '1', name: 'Narrativa', slug: 'narrativa', booksCount: '7' }],
  books: [{ id: '4', title: 'Libro più visto', author: 'Autrice Demo', viewsCount: '8' }],
  months: [{ month: '2026-09', count: '2' }],
};
const recentActivityRepositoryResult = {
  users: [
    {
      id: '6',
      name: 'Nuovo Utente',
      role: 'USER',
      city: 'Bari',
      publicArea: 'Zona demo',
      createdAt: timestamp,
    },
  ],
  books: [
    {
      id: '18',
      title: 'Libro recente',
      author: 'Autore Demo',
      available: true,
      ownerName: 'Nuovo Utente',
      createdAt: timestamp,
    },
  ],
  loanRequests: [
    {
      id: '5',
      status: 'PENDING',
      createdAt: timestamp,
      bookId: '18',
      bookTitle: 'Libro recente',
      requesterName: 'Richiedente Demo',
      ownerName: 'Nuovo Utente',
    },
  ],
};

function createTestContext() {
  const adminRepository = {
    getStats: vi.fn().mockResolvedValue(statsRepositoryResult),
    getRecentActivity: vi.fn().mockResolvedValue(recentActivityRepositoryResult),
  };
  const logger = { error: vi.fn(), log: vi.fn() };
  const app = createApp({
    config: baseConfig,
    pool: { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) },
    logger,
    userRepository: createInMemoryUserRepository(users),
    adminRepository,
  });

  return { app, adminRepository, logger };
}

async function authenticatedAgent(app, email) {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password: 'GeoBookDemo2026!' }).expect(200);
  return agent;
}

describe('admin API', () => {
  it('requires authentication and the ADMIN role for every endpoint', async () => {
    const { app, adminRepository, logger } = createTestContext();

    await request(app).get('/api/v1/admin/stats').expect(401);
    const user = await authenticatedAgent(app, 'user@example.test');
    const forbidden = await user.get('/api/v1/admin/stats').expect(403);
    await user.get('/api/v1/admin/recent-activity').expect(403);

    expect(forbidden.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(adminRepository.getStats).not.toHaveBeenCalled();
    expect(adminRepository.getRecentActivity).not.toHaveBeenCalled();
    // Gli errori di autorizzazione non registrano payload o dati dell'utente.
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns normalized aggregates to an administrator with security headers', async () => {
    const { app, adminRepository } = createTestContext();
    const admin = await authenticatedAgent(app, 'admin@example.test');
    const response = await admin
      .get('/api/v1/admin/stats')
      .set('Origin', baseConfig.frontendOrigin)
      .expect(200);

    expect(response.body.data.stats).toEqual({
      usersCount: 6,
      booksCount: 18,
      loanRequestsCount: 5,
      completedLoansCount: 1,
      loanRequestsByStatus: [
        { status: 'PENDING', count: 1 },
        { status: 'ACCEPTED', count: 1 },
        { status: 'REJECTED', count: 1 },
        { status: 'RETURNED', count: 1 },
        { status: 'CANCELLED', count: 1 },
      ],
      topCategories: [{ id: '1', name: 'Narrativa', slug: 'narrativa', booksCount: 7 }],
      mostViewedBooks: [
        { id: '4', title: 'Libro più visto', author: 'Autrice Demo', viewsCount: 8 },
      ],
      loanRequestsByMonth: [{ month: '2026-09', count: 2 }],
    });
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['access-control-allow-origin']).toBe(baseConfig.frontendOrigin);
    expect(adminRepository.getStats).toHaveBeenCalledOnce();
  });

  it('returns recent activity without emails, coordinates, hashes or messages', async () => {
    const { app, adminRepository } = createTestContext();
    const admin = await authenticatedAgent(app, 'admin@example.test');
    const response = await admin.get('/api/v1/admin/recent-activity').expect(200);

    expect(response.body.data.recentActivity).toEqual({
      users: recentActivityRepositoryResult.users,
      books: recentActivityRepositoryResult.books,
      loanRequests: [
        {
          id: '5',
          status: 'PENDING',
          createdAt: timestamp,
          book: { id: '18', title: 'Libro recente' },
          requesterName: 'Richiedente Demo',
          ownerName: 'Nuovo Utente',
        },
      ],
    });
    const payload = JSON.stringify(response.body);
    expect(payload).not.toMatch(/email|password|hash|location|latitude|longitude|message/i);
    expect(adminRepository.getRecentActivity).toHaveBeenCalledWith(5);
  });
});
