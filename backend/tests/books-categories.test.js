import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createInMemoryCatalogRepositories } from './helpers/in-memory-catalog-repositories.js';
import { createInMemoryUserRepository } from './helpers/in-memory-user-repository.js';

const DEMO_PASSWORD_HASH = '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO';
const baseConfig = {
  nodeEnv: 'test',
  frontendOrigin: 'http://localhost:5173',
  jwtSecret: 'test-secret-with-at-least-32-characters',
  jwtExpiresIn: '2h',
  bcryptRounds: 10,
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
};
const timestamp = '2026-09-04T10:00:00.000Z';
const categories = [
  { id: '2', name: 'Informatica', slug: 'informatica' },
  { id: '1', name: 'Narrativa', slug: 'narrativa' },
];
const users = [
  {
    id: '1',
    name: 'Proprietaria Demo',
    email: 'owner@example.test',
    passwordHash: DEMO_PASSWORD_HASH,
    role: 'USER',
    city: 'Bari',
    publicArea: 'Zona Murat',
    shareRadiusKm: 10,
    location: null,
    locationConsentAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: '2',
    name: 'Altro Proprietario',
    email: 'other@example.test',
    passwordHash: DEMO_PASSWORD_HASH,
    role: 'USER',
    city: 'Bari',
    publicArea: 'Zona Carrassi',
    shareRadiusKm: 10,
    location: null,
    locationConsentAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];
const books = [
  {
    id: '1',
    ownerId: '1',
    title: 'Libro della proprietaria',
    author: 'Autrice Demo',
    publicationYear: 2020,
    description: null,
    isbn: null,
    coverPath: null,
    thumbnailPath: null,
    available: true,
    categoryIds: ['1'],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: '2',
    ownerId: '2',
    title: 'Libro altrui',
    author: 'Autore Demo',
    publicationYear: 2021,
    description: null,
    isbn: null,
    coverPath: null,
    thumbnailPath: null,
    available: true,
    categoryIds: ['2'],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: '3',
    ownerId: '1',
    title: 'Libro con richiesta',
    author: 'Autrice Demo',
    publicationYear: 2019,
    description: null,
    isbn: null,
    coverPath: null,
    thumbnailPath: null,
    available: false,
    categoryIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

function createTestContext() {
  const userRepository = createInMemoryUserRepository(users);
  const catalogRepositories = createInMemoryCatalogRepositories({
    categories,
    books,
    loanBookIds: ['3'],
  });
  const pool = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
  const app = createApp({
    config: baseConfig,
    pool,
    logger: { error: vi.fn(), log: vi.fn() },
    userRepository,
    ...catalogRepositories,
  });

  return { app, ...catalogRepositories };
}

async function authenticatedAgent(app, email = 'owner@example.test') {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password: 'GeoBookDemo2026!' }).expect(200);
  return agent;
}

describe('categories and books API', () => {
  it('lists categories publicly while protecting personal book operations', async () => {
    const { app } = createTestContext();
    const response = await request(app).get('/api/v1/categories').expect(200);

    expect(response.body.data.categories).toEqual([
      { id: '2', name: 'Informatica', slug: 'informatica' },
      { id: '1', name: 'Narrativa', slug: 'narrativa' },
    ]);
    await request(app).get('/api/v1/me/books').expect(401);
    await request(app)
      .post('/api/v1/books')
      .send({ title: 'Non autorizzato', author: 'Test', publicationYear: 2020 })
      .expect(401);
  });

  it('creates, lists, updates and deletes a book owned by the authenticated user', async () => {
    const { app } = createTestContext();
    const agent = await authenticatedAgent(app);

    const initialList = await agent.get('/api/v1/me/books').expect(200);
    expect(initialList.body.data.books).toHaveLength(2);

    const created = await agent
      .post('/api/v1/books')
      .send({
        title: '  API accessibili  ',
        author: 'Autrice Fittizia',
        publicationYear: 2024,
        description: 'Un volume dimostrativo.',
        isbn: '978-0-00-000001-1',
        categoryIds: [1, 2],
      })
      .expect(201);

    expect(created.body.data.book).toMatchObject({
      ownerId: '1',
      title: 'API accessibili',
      available: true,
      categories: [
        { id: '2', name: 'Informatica', slug: 'informatica' },
        { id: '1', name: 'Narrativa', slug: 'narrativa' },
      ],
    });
    const bookId = created.body.data.book.id;

    const updated = await agent
      .patch(`/api/v1/books/${bookId}`)
      .send({ title: 'API accessibili aggiornate', available: false, categoryIds: [] })
      .expect(200);
    expect(updated.body.data.book).toMatchObject({
      id: bookId,
      title: 'API accessibili aggiornate',
      available: false,
      categories: [],
    });

    const updatedList = await agent.get('/api/v1/me/books').expect(200);
    expect(updatedList.body.data.books.some((book) => book.id === bookId)).toBe(true);

    await agent.delete(`/api/v1/books/${bookId}`).expect(204);
    const finalList = await agent.get('/api/v1/me/books').expect(200);
    expect(finalList.body.data.books.some((book) => book.id === bookId)).toBe(false);
  });

  it('validates years, category duplicates, identifiers and existing categories', async () => {
    const { app } = createTestContext();
    const agent = await authenticatedAgent(app);

    const futureYear = await agent
      .post('/api/v1/books')
      .send({ title: 'Libro futuro', author: 'Autore Demo', publicationYear: 2999 })
      .expect(400);
    expect(futureYear.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(futureYear.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'publicationYear' }),
    );

    const duplicateCategories = await agent
      .post('/api/v1/books')
      .send({
        title: 'Categorie duplicate',
        author: 'Autrice Demo',
        publicationYear: 2020,
        categoryIds: [1, 1],
      })
      .expect(400);
    expect(duplicateCategories.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'categoryIds' }),
    );

    const unknownCategory = await agent
      .post('/api/v1/books')
      .send({
        title: 'Categoria assente',
        author: 'Autore Demo',
        publicationYear: 2020,
        categoryIds: [999],
      })
      .expect(400);
    expect(unknownCategory.body.error.code).toBe('INVALID_CATEGORIES');

    await agent.patch('/api/v1/books/not-a-number').send({ available: false }).expect(400);
    await agent.patch('/api/v1/books/1').send({}).expect(400);
  });

  it('returns 403 when a user modifies or deletes another owner’s book', async () => {
    const { app } = createTestContext();
    const agent = await authenticatedAgent(app);

    const update = await agent.patch('/api/v1/books/2').send({ available: false }).expect(403);
    const deletion = await agent.delete('/api/v1/books/2').expect(403);

    expect(update.body.error.code).toBe('BOOK_FORBIDDEN');
    expect(deletion.body.error.code).toBe('BOOK_FORBIDDEN');
  });

  it('returns 404 for an absent book and preserves books with loan history', async () => {
    const { app } = createTestContext();
    const agent = await authenticatedAgent(app);

    const missing = await agent.patch('/api/v1/books/999').send({ available: false }).expect(404);
    expect(missing.body.error.code).toBe('BOOK_NOT_FOUND');

    const conflict = await agent.delete('/api/v1/books/3').expect(409);
    expect(conflict.body.error.code).toBe('BOOK_HAS_LOAN_REQUESTS');
  });
});
