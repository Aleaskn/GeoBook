const BOOK_SELECTION = `
  SELECT b.id,
         b.owner_id AS "ownerId",
         b.title,
         b.author,
         b.publication_year AS "publicationYear",
         b.description,
         b.isbn,
         b.cover_path AS "coverPath",
         b.thumbnail_path AS "thumbnailPath",
         b.available,
         b.created_at AS "createdAt",
         b.updated_at AS "updatedAt",
         COALESCE(
           JSONB_AGG(
             JSONB_BUILD_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug)
             ORDER BY c.name, c.id
           ) FILTER (WHERE c.id IS NOT NULL),
           '[]'::jsonb
         ) AS categories
  FROM books b
  LEFT JOIN book_categories bc ON bc.book_id = b.id
  LEFT JOIN categories c ON c.id = bc.category_id`;

const UPDATABLE_COLUMNS = {
  title: 'title',
  author: 'author',
  publicationYear: 'publication_year',
  description: 'description',
  isbn: 'isbn',
  available: 'available',
};

function createBookQueries(queryable) {
  return {
    async findByOwnerId(ownerId) {
      const result = await queryable.query(
        `${BOOK_SELECTION}
         WHERE b.owner_id = $1
         GROUP BY b.id
         ORDER BY b.created_at DESC, b.id DESC`,
        [ownerId],
      );

      return result.rows;
    },

    async findById(bookId) {
      const result = await queryable.query(
        `${BOOK_SELECTION}
         WHERE b.id = $1
         GROUP BY b.id`,
        [bookId],
      );

      return result.rows[0] ?? null;
    },

    async create(ownerId, { title, author, publicationYear, description, isbn, available }) {
      const result = await queryable.query(
        `INSERT INTO books (
           owner_id, title, author, publication_year, description, isbn, available
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          ownerId,
          title,
          author,
          publicationYear,
          description ?? null,
          isbn ?? null,
          available ?? true,
        ],
      );

      return result.rows[0];
    },

    async update(bookId, changes) {
      const entries = Object.entries(changes).filter(([field]) => field in UPDATABLE_COLUMNS);

      if (entries.length === 0) {
        return { id: bookId };
      }

      // Le colonne provengono dalla allowlist sopra; soltanto i valori utente diventano parametri.
      const assignments = entries.map(
        ([field], index) => `${UPDATABLE_COLUMNS[field]} = $${index + 2}`,
      );
      const values = entries.map(([, value]) => value);
      const result = await queryable.query(
        `UPDATE books
         SET ${assignments.join(', ')}
         WHERE id = $1
         RETURNING id`,
        [bookId, ...values],
      );

      return result.rows[0] ?? null;
    },

    async replaceCategories(bookId, categoryIds) {
      await queryable.query('DELETE FROM book_categories WHERE book_id = $1', [bookId]);

      if (categoryIds.length > 0) {
        await queryable.query(
          `INSERT INTO book_categories (book_id, category_id)
           SELECT $1, category_id
           FROM UNNEST($2::bigint[]) AS category_id`,
          [bookId, categoryIds],
        );
      }
    },

    async hasLoanRequests(bookId) {
      const result = await queryable.query(
        `SELECT EXISTS (
           SELECT 1
           FROM loan_requests
           WHERE book_id = $1
         ) AS "hasLoanRequests"`,
        [bookId],
      );

      return result.rows[0].hasLoanRequests;
    },

    async deleteOwned(bookId, ownerId) {
      const result = await queryable.query(
        `DELETE FROM books
         WHERE id = $1 AND owner_id = $2
         RETURNING id`,
        [bookId, ownerId],
      );

      return result.rows[0] ?? null;
    },
  };
}

export function createBookRepository(pool) {
  const queries = createBookQueries(pool);

  return {
    ...queries,

    async withTransaction(operation) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const result = await operation(createBookQueries(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
