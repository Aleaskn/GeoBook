import { describe, expect, it, vi } from 'vitest';
import { createUserRepository } from '../src/repositories/user-repository.js';

describe('user repository', () => {
  it('passes registration values separately from the SQL statement', async () => {
    const createdUser = { id: '7', email: 'reader@example.test' };
    const query = vi.fn().mockResolvedValue({ rows: [createdUser] });
    const repository = createUserRepository({ query });
    const input = {
      name: 'Lettrice Test',
      email: 'reader@example.test',
      passwordHash: '$2b$10$hash',
      city: 'Bari',
      publicArea: 'Zona test',
    };

    await expect(repository.create(input)).resolves.toBe(createdUser);
    expect(query.mock.calls[0][0]).not.toContain(input.email);
    expect(query.mock.calls[0][1]).toEqual([
      input.name,
      input.email,
      input.passwordHash,
      input.city,
      input.publicArea,
    ]);
  });

  it('keeps longitude before latitude when constructing the PostGIS point', async () => {
    const updatedUser = { id: '7', locationConsentAt: new Date() };
    const query = vi.fn().mockResolvedValue({ rows: [updatedUser] });
    const repository = createUserRepository({ query });

    await expect(repository.updateLocation('7', { lat: 41.1171, lon: 16.8719 })).resolves.toBe(
      updatedUser,
    );

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('ST_MakePoint($2, $3)');
    expect(parameters).toEqual(['7', 16.8719, 41.1171]);
    expect(sql).not.toMatch(/16\.8719|41\.1171/);
  });

  it('clears both location fields when consent is revoked', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '7' }] });
    const repository = createUserRepository({ query });

    await repository.deleteLocation('7');

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('location = NULL, location_consent_at = NULL');
    expect(parameters).toEqual(['7']);
  });
});
