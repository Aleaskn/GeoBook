import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createImageService } from '../src/services/image-service.js';
import { createInMemoryCatalogRepositories } from './helpers/in-memory-catalog-repositories.js';
import { createInMemoryUserRepository } from './helpers/in-memory-user-repository.js';

const DEMO_PASSWORD_HASH = '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO';
const timestamp = '2026-09-06T10:00:00.000Z';
const user = {
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
};

let temporaryDirectory;
let uploadDirectory;

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'geobook-images-'));
  uploadDirectory = path.join(temporaryDirectory, 'storage');
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

function createTestContext({ maxUploadBytes = 5_242_880, bookRepository } = {}) {
  const catalogRepositories = createInMemoryCatalogRepositories({
    categories: [{ id: '1', name: 'Narrativa', slug: 'narrativa' }],
  });
  const logger = { error: vi.fn(), log: vi.fn() };
  const app = createApp({
    config: {
      nodeEnv: 'test',
      frontendOrigin: 'http://localhost:5173',
      jwtSecret: 'test-secret-with-at-least-32-characters',
      jwtExpiresIn: '2h',
      bcryptRounds: 10,
      uploadDir: uploadDirectory,
      maxUploadBytes,
      rateLimitWindowMs: 60_000,
      rateLimitMax: 100,
    },
    pool: { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) },
    logger,
    userRepository: createInMemoryUserRepository([user]),
    bookRepository: bookRepository ?? catalogRepositories.bookRepository,
    categoryRepository: catalogRepositories.categoryRepository,
  });

  return { app, logger, bookRepository: bookRepository ?? catalogRepositories.bookRepository };
}

async function authenticatedAgent(app) {
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: 'GeoBookDemo2026!' })
    .expect(200);
  return agent;
}

async function createPngBuffer({ width = 640, height = 960, color = '#b65f45' } = {}) {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .png()
    .toBuffer();
}

function attachBookFields(testRequest, title = 'Libro illustrato') {
  return testRequest
    .field('title', title)
    .field('author', 'Autrice Fittizia')
    .field('publicationYear', '2024')
    .field('description', '')
    .field('isbn', '')
    .field('available', 'true')
    .field('categoryIds', '[1]');
}

function localFilePath(publicPath) {
  return path.join(uploadDirectory, publicPath.slice('/uploads/'.length));
}

async function listGeneratedFiles() {
  const files = [];

  for (const directoryName of ['covers', 'thumbnails']) {
    try {
      const names = await readdir(path.join(uploadDirectory, directoryName));
      files.push(...names.map((name) => `${directoryName}/${name}`));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return files;
}

describe('book cover uploads', () => {
  it('creates WebP cover and thumbnail, replaces them and removes them with the book', async () => {
    const { app } = createTestContext();
    const agent = await authenticatedAgent(app);
    const firstImage = await createPngBuffer();
    const createdResponse = await attachBookFields(agent.post('/api/v1/books'))
      .attach('cover', firstImage, { filename: 'copertina.png', contentType: 'image/png' })
      .expect(201);
    const createdBook = createdResponse.body.data.book;

    expect(createdBook.coverPath).toMatch(/^\/uploads\/covers\/[0-9a-f-]{36}\.webp$/);
    expect(createdBook.thumbnailPath).toMatch(/^\/uploads\/thumbnails\/[0-9a-f-]{36}\.webp$/);

    const coverMetadata = await sharp(localFilePath(createdBook.coverPath)).metadata();
    const thumbnailMetadata = await sharp(localFilePath(createdBook.thumbnailPath)).metadata();
    expect(coverMetadata).toMatchObject({ format: 'webp', width: 640, height: 960 });
    expect(thumbnailMetadata).toMatchObject({ format: 'webp', width: 240, height: 360 });

    await request(app)
      .get(createdBook.thumbnailPath)
      .expect('Content-Type', /image\/webp/)
      .expect('Cross-Origin-Resource-Policy', 'cross-origin')
      .expect(200);

    const secondImage = await createPngBuffer({ color: '#486b57' });
    const updatedResponse = await agent
      .patch(`/api/v1/books/${createdBook.id}`)
      .field('title', 'Libro illustrato aggiornato')
      .attach('cover', secondImage, { filename: 'nuova.png', contentType: 'image/png' })
      .expect(200);
    const updatedBook = updatedResponse.body.data.book;

    expect(updatedBook.coverPath).not.toBe(createdBook.coverPath);
    await expect(access(localFilePath(createdBook.coverPath))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(access(localFilePath(createdBook.thumbnailPath))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(access(localFilePath(updatedBook.coverPath))).resolves.toBeUndefined();

    await agent.delete(`/api/v1/books/${createdBook.id}`).expect(204);
    await expect(listGeneratedFiles()).resolves.toEqual([]);
  });

  it('serves the placeholder for books without a cover', async () => {
    const { app } = createTestContext();
    const agent = await authenticatedAgent(app);
    const response = await attachBookFields(agent.post('/api/v1/books')).expect(201);

    expect(response.body.data.book).toMatchObject({
      coverPath: '/uploads/placeholder-cover.svg',
      thumbnailPath: '/uploads/placeholder-cover.svg',
    });
    await request(app)
      .get('/uploads/placeholder-cover.svg')
      .expect('Content-Type', /image\/svg\+xml/)
      .expect(200);
  });

  it('rejects unsupported, corrupt and oversized files with the expected status codes', async () => {
    const { app } = createTestContext({ maxUploadBytes: 100 });
    const agent = await authenticatedAgent(app);

    const unsupported = await attachBookFields(agent.post('/api/v1/books'))
      .attach('cover', Buffer.from('testo'), {
        filename: 'copertina.txt',
        contentType: 'text/plain',
      })
      .expect(415);
    expect(unsupported.body.error.code).toBe('UNSUPPORTED_COVER_TYPE');

    const corrupt = await attachBookFields(agent.post('/api/v1/books'))
      .attach('cover', Buffer.from('non è un png'), {
        filename: 'copertina.png',
        contentType: 'image/png',
      })
      .expect(415);
    expect(corrupt.body.error.code).toBe('INVALID_COVER_IMAGE');

    const oversized = await attachBookFields(agent.post('/api/v1/books'))
      .attach('cover', await createPngBuffer(), {
        filename: 'grande.png',
        contentType: 'image/png',
      })
      .expect(413);
    expect(oversized.body.error.code).toBe('COVER_TOO_LARGE');
    await expect(listGeneratedFiles()).resolves.toEqual([]);
  });

  it('removes generated files when the database transaction fails', async () => {
    const repositories = createInMemoryCatalogRepositories({
      categories: [{ id: '1', name: 'Narrativa', slug: 'narrativa' }],
    });
    repositories.bookRepository.withTransaction = vi
      .fn()
      .mockRejectedValue(new Error('database unavailable'));
    const { app } = createTestContext({ bookRepository: repositories.bookRepository });
    const agent = await authenticatedAgent(app);

    await attachBookFields(agent.post('/api/v1/books'))
      .attach('cover', await createPngBuffer(), {
        filename: 'copertina.png',
        contentType: 'image/png',
      })
      .expect(500);

    await expect(listGeneratedFiles()).resolves.toEqual([]);
  });

  it('never resolves untrusted public paths outside the upload directories', async () => {
    const outsideFile = path.join(temporaryDirectory, 'keep.txt');
    await writeFile(outsideFile, 'preserva');
    const imageService = createImageService({ uploadDir: uploadDirectory });

    await imageService.deleteBookImages({
      coverPath: '/uploads/covers/../../keep.txt',
      thumbnailPath: '/uploads/thumbnails/not-generated.webp',
    });

    await expect(readFile(outsideFile, 'utf8')).resolves.toBe('preserva');
  });
});
