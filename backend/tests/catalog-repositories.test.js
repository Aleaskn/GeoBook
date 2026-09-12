import { describe, expect, it, vi } from 'vitest';
import { createBookRepository } from '../src/repositories/book-repository.js';
import { createCategoryRepository } from '../src/repositories/category-repository.js';

describe('catalog repositories', () => {
  it('parameterizes catalog filters and applies stable pagination ordering', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: 3 }] })
      .mockResolvedValueOnce({ rows: [{ id: '12', title: 'Titolo prova' }] });
    const repository = createBookRepository({ query });
    const maliciousQuery = "romanzo' OR TRUE --";

    await expect(
      repository.search({
        q: maliciousQuery,
        category: 'narrativa',
        page: 2,
        limit: 10,
      }),
    ).resolves.toEqual({ books: [{ id: '12', title: 'Titolo prova' }], total: 3 });

    const [countSql, countParameters] = query.mock.calls[0];
    const [searchSql, searchParameters] = query.mock.calls[1];
    expect(countSql).toContain('POSITION(LOWER($1) IN LOWER(b.title))');
    expect(countSql).toContain('filtered_c.slug = $2');
    expect(searchSql).toContain('ORDER BY b.created_at DESC, b.id DESC');
    expect(searchSql).toContain('LIMIT $3');
    expect(searchSql).toContain('OFFSET $4');
    expect(countSql).not.toContain(maliciousQuery);
    expect(searchSql).not.toContain(maliciousQuery);
    expect(countParameters).toEqual([maliciousQuery, 'narrativa']);
    expect(searchParameters).toEqual([maliciousQuery, 'narrativa', 10, 10]);
  });

  it('uses the same approximate public point for radius, distance and marker', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '12',
            distanceKm: 0.8,
            approximateLat: 41.12,
            approximateLon: 16.87,
          },
        ],
      });
    const repository = createBookRepository({ query });

    await repository.search({
      q: 'reti',
      category: 'informatica',
      lat: 41.1171,
      lon: 16.8719,
      radiusKm: 1,
      page: 1,
      limit: 12,
    });

    const [countSql, countParameters] = query.mock.calls[0];
    const [searchSql, searchParameters] = query.mock.calls[1];
    expect(countSql).toContain('u.location_consent_at IS NOT NULL');
    expect(countSql).toContain('ST_DWithin(ST_SetSRID(');
    expect(searchSql).toContain('ST_Distance(ST_SetSRID(');
    expect(searchSql).toContain('ST_Y(u.location::geometry)::numeric');
    expect(searchSql).toContain('ST_X(u.location::geometry)::numeric');
    expect(countSql).not.toContain('ST_DWithin(u.location');
    expect(searchSql).not.toContain('ST_Distance(u.location');
    expect(searchSql).toContain('LIMIT $6');
    expect(searchSql).toContain('OFFSET $7');
    expect(countSql).not.toMatch(/41\.1171|16\.8719/);
    expect(searchSql).not.toMatch(/41\.1171|16\.8719/);
    expect(countParameters).toEqual(['reti', 'informatica', 16.8719, 41.1171, 1_000]);
    expect(searchParameters).toEqual(['reti', 'informatica', 16.8719, 41.1171, 1_000, 12, 0]);
  });

  it('uses the approximate public point for the detail distance', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: '12', distanceKm: 0.8 }],
    });
    const repository = createBookRepository({ query });

    await expect(repository.findPublicById('12', { lat: 41.1171, lon: 16.8719 })).resolves.toEqual({
      id: '12',
      distanceKm: 0.8,
    });

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('WHERE b.id = $1');
    expect(sql).toContain('ST_Distance(ST_SetSRID(');
    expect(sql).toContain('ST_Y(u.location::geometry)::numeric');
    expect(sql).toContain('ST_X(u.location::geometry)::numeric');
    expect(sql).not.toContain('ST_Distance(u.location');
    expect(sql).toContain('u.location_consent_at IS NOT NULL');
    expect(sql).not.toMatch(/41\.1171|16\.8719/);
    expect(parameters).toEqual(['12', 16.8719, 41.1171]);
  });

  it('records an anonymous view only when the book exists', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '31' }] });
    const repository = createBookRepository({ query });

    await expect(repository.recordView('12')).resolves.toEqual({ id: '31' });

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO book_views (book_id, viewer_id)');
    expect(sql).toContain('SELECT id, NULL');
    expect(parameters).toEqual(['12']);
  });

  it('keeps book values separate from dynamic update SQL', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '12' }] });
    const repository = createBookRepository({ query });
    const maliciousTitle = "Titolo', owner_id = 99 --";

    await expect(
      repository.update('12', { title: maliciousTitle, available: false, ignoredField: 'ignored' }),
    ).resolves.toEqual({ id: '12' });

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('SET title = $2, available = $3');
    expect(sql).not.toContain(maliciousTitle);
    expect(sql).not.toContain('ignoredField');
    expect(parameters).toEqual(['12', maliciousTitle, false]);
  });

  it('locks a book before checking for an accepted loan', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: '12', ownerId: '1', available: false }] })
      .mockResolvedValueOnce({ rows: [{ hasAcceptedLoan: true }] });
    const repository = createBookRepository({ query });

    await expect(repository.findByIdForUpdate('12')).resolves.toMatchObject({ id: '12' });
    await expect(repository.hasAcceptedLoan('12')).resolves.toBe(true);

    expect(query.mock.calls[0][0]).toContain('FROM books');
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[0][1]).toEqual(['12']);
    expect(query.mock.calls[1][0]).toContain("status = 'ACCEPTED'");
    expect(query.mock.calls[1][1]).toEqual(['12']);
  });

  it('passes category identifiers as one parameterized PostgreSQL array', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = createCategoryRepository({ query });

    await repository.findByIds([2, 5]);

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('id = ANY($1::bigint[])');
    expect(parameters).toEqual([[2, 5]]);
    expect(sql).not.toMatch(/\b2\b|\b5\b/);
  });

  it('commits successful book operations and always releases the client', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query, release: vi.fn() };
    const repository = createBookRepository({ connect: vi.fn().mockResolvedValue(client) });

    await expect(repository.withTransaction(async () => 'done')).resolves.toBe('done');

    expect(query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT']);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back failed book operations and always releases the client', async () => {
    const operationError = new Error('write failed');
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query, release: vi.fn() };
    const repository = createBookRepository({ connect: vi.fn().mockResolvedValue(client) });

    await expect(
      repository.withTransaction(async () => {
        throw operationError;
      }),
    ).rejects.toBe(operationError);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
