import { describe, expect, it, vi } from 'vitest';
import { createLoanRequestRepository } from '../src/repositories/loan-request-repository.js';

describe('loan request repository', () => {
  it('parameterizes creation and participant lists without selecting contact or location data', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: '31' }] })
      .mockResolvedValueOnce({ rows: [{ id: '31', status: 'PENDING' }] });
    const repository = createLoanRequestRepository({ query });
    const message = "Messaggio', status = 'ACCEPTED' --";

    await expect(repository.create('10', '2', '1', message)).resolves.toEqual({ id: '31' });
    await expect(repository.findByParticipant('1', 'incoming')).resolves.toEqual([
      { id: '31', status: 'PENDING' },
    ]);

    const [createSql, createParameters] = query.mock.calls[0];
    const [listSql, listParameters] = query.mock.calls[1];
    expect(createSql).toContain('VALUES ($1, $2, $3, $4)');
    expect(createSql).not.toContain(message);
    expect(createParameters).toEqual(['10', '2', '1', message]);
    expect(listSql).toContain('WHERE lr.owner_id = $1');
    expect(listSql).toContain('ORDER BY lr.created_at DESC, lr.id DESC');
    expect(listSql).not.toMatch(/\.email|\.location/);
    expect(listParameters).toEqual(['1']);
  });

  it('locks workflow rows and parameterizes status and availability updates', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: '10', ownerId: '1', available: true }] })
      .mockResolvedValueOnce({ rows: [{ id: '31', status: 'PENDING' }] })
      .mockResolvedValueOnce({ rows: [{ id: '10' }] })
      .mockResolvedValueOnce({ rows: [{ id: '31' }] });
    const repository = createLoanRequestRepository({ query });

    await repository.findBookByIdForUpdate('10');
    await repository.findByIdForUpdate('31');
    await repository.setBookAvailability('10', false);
    await repository.updateStatus('31', 'PENDING', 'ACCEPTED');

    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[0][1]).toEqual(['10']);
    expect(query.mock.calls[1][0]).toContain('FOR UPDATE OF lr, b');
    expect(query.mock.calls[1][1]).toEqual(['31']);
    expect(query.mock.calls[2][0]).toContain('SET available = $2');
    expect(query.mock.calls[2][1]).toEqual(['10', false]);
    expect(query.mock.calls[3][0]).toContain('WHERE id = $1 AND status = $2');
    expect(query.mock.calls[3][0]).toContain('SET status = $3::loan_status');
    expect(query.mock.calls[3][0]).toContain("$3::loan_status = 'RETURNED'::loan_status");
    expect(query.mock.calls[3][1]).toEqual(['31', 'PENDING', 'ACCEPTED']);
  });

  it('commits successful operations and rolls back failures, always releasing the client', async () => {
    const successQuery = vi.fn().mockResolvedValue({ rows: [] });
    const successClient = { query: successQuery, release: vi.fn() };
    const successRepository = createLoanRequestRepository({
      connect: vi.fn().mockResolvedValue(successClient),
    });

    await expect(successRepository.withTransaction(async () => 'done')).resolves.toBe('done');
    expect(successQuery.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT']);
    expect(successClient.release).toHaveBeenCalledOnce();

    const operationError = new Error('write failed');
    const failedQuery = vi.fn().mockResolvedValue({ rows: [] });
    const failedClient = { query: failedQuery, release: vi.fn() };
    const failedRepository = createLoanRequestRepository({
      connect: vi.fn().mockResolvedValue(failedClient),
    });

    await expect(
      failedRepository.withTransaction(async () => {
        throw operationError;
      }),
    ).rejects.toBe(operationError);
    expect(failedQuery.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
    expect(failedClient.release).toHaveBeenCalledOnce();
  });
});
