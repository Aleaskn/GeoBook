export function createCategoryRepository(pool) {
  return {
    async findAll() {
      const result = await pool.query(
        `SELECT id, name, slug
         FROM categories
         ORDER BY name ASC, id ASC`,
      );

      return result.rows;
    },

    async findByIds(categoryIds) {
      if (categoryIds.length === 0) {
        return [];
      }

      const result = await pool.query(
        `SELECT id, name, slug
         FROM categories
         WHERE id = ANY($1::bigint[])
         ORDER BY id ASC`,
        [categoryIds],
      );

      return result.rows;
    },
  };
}
