export function createHealthRepository(pool) {
  return {
    async ping() {
      await pool.query('SELECT 1');
    },
  };
}
