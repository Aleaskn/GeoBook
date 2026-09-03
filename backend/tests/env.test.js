import { describe, expect, it } from 'vitest';
import { ConfigurationError, loadConfig } from '../src/config/env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgres://geobook:geobook@localhost:5432/geobook',
  JWT_SECRET: 'test-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: '2h',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  UPLOAD_DIR: './storage',
  MAX_UPLOAD_BYTES: '5242880',
  BCRYPT_ROUNDS: '12',
};

describe('environment configuration', () => {
  it('validates and normalizes all backend settings', () => {
    const config = loadConfig(validEnvironment);

    expect(config).toMatchObject({
      nodeEnv: 'test',
      port: 3001,
      databaseUrl: validEnvironment.DATABASE_URL,
      frontendOrigin: validEnvironment.FRONTEND_ORIGIN,
      maxUploadBytes: 5_242_880,
      bcryptRounds: 12,
      rateLimitMax: 100,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('reports missing required variables without exposing their values', () => {
    expect.assertions(4);

    try {
      loadConfig({});
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.code).toBe('ENV_VALIDATION_ERROR');
      expect(error.details.map((detail) => detail.field)).toContain('DATABASE_URL');
      expect(error.message).not.toContain(validEnvironment.JWT_SECRET);
    }
  });

  it.each([
    ['PORT', '70000'],
    ['DATABASE_URL', 'https://example.test/database'],
    ['FRONTEND_ORIGIN', 'ftp://localhost'],
  ])('rejects an invalid %s value', (field, value) => {
    expect(() => loadConfig({ ...validEnvironment, [field]: value })).toThrow(ConfigurationError);
  });
});
