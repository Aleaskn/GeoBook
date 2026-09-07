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
