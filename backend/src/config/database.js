import pg from 'pg';

const { Pool } = pg;

export function createDatabasePool(config) {
  return new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });
}
