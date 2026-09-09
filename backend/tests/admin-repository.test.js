import { describe, expect, it, vi } from 'vitest';
import { createAdminRepository } from '../src/repositories/admin-repository.js';

function createPool() {
  return {
    query: vi.fn().mockImplementation((sql) => {
      if (sql.includes('AS "usersCount"')) {
        return Promise.resolve({
          rows: [
            {
              usersCount: 6,
              booksCount: 18,
              loanRequestsCount: 5,
              completedLoansCount: 1,
            },
          ],
        });
      }

      if (sql.includes('GROUP BY status')) {
        return Promise.resolve({ rows: [{ status: 'PENDING', count: 1 }] });
      }

      if (sql.includes('FROM categories c')) {
        return Promise.resolve({ rows: [{ id: '1', name: 'Narrativa', booksCount: 7 }] });
      }

      if (sql.includes('JOIN book_views')) {
        return Promise.resolve({ rows: [{ id: '1', title: 'Libro', viewsCount: 8 }] });
      }

      if (sql.includes("DATE_TRUNC('month'")) {
        return Promise.resolve({ rows: [{ month: '2026-09', count: 2 }] });
      }

      if (sql.includes('FROM users')) {
        return Promise.resolve({ rows: [{ id: '6', name: 'Utente recente' }] });
      }

      if (sql.includes('FROM books b')) {
        return Promise.resolve({ rows: [{ id: '18', title: 'Libro recente' }] });
      }

      return Promise.resolve({ rows: [{ id: '5', status: 'PENDING' }] });
    }),
  };
}

describe('admin repository', () => {
  it('builds every dashboard aggregate without selecting private user fields', async () => {
    const pool = createPool();
    const repository = createAdminRepository(pool);
    const result = await repository.getStats();

    expect(result.summary.usersCount).toBe(6);
    expect(result.statuses).toEqual([{ status: 'PENDING', count: 1 }]);
    expect(result.categories[0].booksCount).toBe(7);
    expect(result.books[0].viewsCount).toBe(8);
    expect(result.months).toEqual([{ month: '2026-09', count: 2 }]);
    expect(pool.query).toHaveBeenCalledTimes(5);

    const queries = pool.query.mock.calls.map(([sql]) => sql).join('\n');
    expect(queries).not.toMatch(/password_hash|\bu\.email\b|\blocation\b/i);
    expect(pool.query.mock.calls.filter(([, params]) => params)).toEqual([
      [expect.any(String), [5]],
      [expect.any(String), [5]],
    ]);
  });

  it('limits and orders all recent activity queries with a parameter', async () => {
    const pool = createPool();
    const repository = createAdminRepository(pool);
    const result = await repository.getRecentActivity(5);

    expect(result.users[0].name).toBe('Utente recente');
    expect(result.books[0].title).toBe('Libro recente');
    expect(result.loanRequests[0].status).toBe('PENDING');
    expect(pool.query).toHaveBeenCalledTimes(3);
    pool.query.mock.calls.forEach(([sql, params]) => {
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT $1');
      expect(params).toEqual([5]);
      expect(sql).not.toMatch(/email|password_hash|\blocation\b/i);
    });
  });
});
