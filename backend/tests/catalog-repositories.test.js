import { describe, expect, it, vi } from 'vitest';
import { createBookRepository } from '../src/repositories/book-repository.js';
import { createCategoryRepository } from '../src/repositories/category-repository.js';

describe('catalog repositories', () => {
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
