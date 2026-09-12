import {
  APPROXIMATE_COORDINATE_DECIMALS,
  DISTANCE_KM_DECIMALS,
  hasGeographicSearch,
  METERS_PER_KILOMETER,
} from '../utils/geographic-search.js';

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
  coverPath: 'cover_path',
  thumbnailPath: 'thumbnail_path',
};

function createSearchFilter({ q, category, lat, lon, radiusKm }) {
  const conditions = ['b.available = TRUE'];
  const parameters = [];
  let geographicPointExpression = null;

  if (q) {
    parameters.push(q);
    const qParameter = `$${parameters.length}`;
    conditions.push(
      `(POSITION(LOWER(${qParameter}) IN LOWER(b.title)) > 0 OR ` +
        `POSITION(LOWER(${qParameter}) IN LOWER(b.author)) > 0)`,
    );
  }

  if (category) {
    parameters.push(category);
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM book_categories filtered_bc
         JOIN categories filtered_c ON filtered_c.id = filtered_bc.category_id
         WHERE filtered_bc.book_id = b.id
           AND filtered_c.slug = $${parameters.length}
       )`,
    );
  }

  if (hasGeographicSearch({ lat, lon, radiusKm })) {
    parameters.push(lon, lat, radiusKm * METERS_PER_KILOMETER);
    const longitudeParameter = `$${parameters.length - 2}`;
    const latitudeParameter = `$${parameters.length - 1}`;
    const radiusParameter = `$${parameters.length}`;
    geographicPointExpression = `ST_SetSRID(ST_MakePoint(${longitudeParameter}, ${latitudeParameter}), 4326)::geography`;
    conditions.push('u.location_consent_at IS NOT NULL');
    conditions.push('u.location IS NOT NULL');
    conditions.push(`ST_DWithin(u.location, ${geographicPointExpression}, ${radiusParameter})`);
  }

  return {
    whereClause: conditions.join('\n         AND '),
    parameters,
    geographicPointExpression,
  };
}

function createBookQueries(queryable) {
  return {
    async search({ q, category, lat, lon, radiusKm, page, limit }) {
      const { whereClause, parameters, geographicPointExpression } = createSearchFilter({
        q,
        category,
        lat,
        lon,
        radiusKm,
      });
      const geographicSelection = geographicPointExpression
        ? `,
                ROUND(
                  (ST_Distance(u.location, ${geographicPointExpression}) /
                    ${METERS_PER_KILOMETER})::numeric,
                  ${DISTANCE_KM_DECIMALS}
                )::double precision AS "distanceKm",
                ROUND(
                  ST_Y(u.location::geometry)::numeric,
                  ${APPROXIMATE_COORDINATE_DECIMALS}
                )::double precision AS "approximateLat",
                ROUND(
                  ST_X(u.location::geometry)::numeric,
                  ${APPROXIMATE_COORDINATE_DECIMALS}
                )::double precision AS "approximateLon"`
        : '';
      const countResult = await queryable.query(
        `SELECT COUNT(*)::integer AS total
         FROM books b
         JOIN users u ON u.id = b.owner_id
         WHERE ${whereClause}`,
        parameters,
      );
      const limitParameter = `$${parameters.length + 1}`;
      const offsetParameter = `$${parameters.length + 2}`;
      const offset = (page - 1) * limit;
      const result = await queryable.query(
        `SELECT b.id,
                b.title,
                b.author,
                b.publication_year AS "publicationYear",
                b.thumbnail_path AS "thumbnailPath",
                b.available,
                u.public_area AS "publicArea"${geographicSelection},
                COALESCE(
                  JSONB_AGG(
                    JSONB_BUILD_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug)
                    ORDER BY c.name, c.id
                  ) FILTER (WHERE c.id IS NOT NULL),
                  '[]'::jsonb
                ) AS categories
         FROM books b
         JOIN users u ON u.id = b.owner_id
         LEFT JOIN book_categories bc ON bc.book_id = b.id
         LEFT JOIN categories c ON c.id = bc.category_id
         WHERE ${whereClause}
         GROUP BY b.id, u.id
         ORDER BY b.created_at DESC, b.id DESC
         LIMIT ${limitParameter}
         OFFSET ${offsetParameter}`,
        [...parameters, limit, offset],
      );

      return { books: result.rows, total: countResult.rows[0]?.total ?? 0 };
    },

    async findPublicById(bookId, { lat, lon }) {
      const parameters = [bookId];
      let distanceSelection = '';

      if (lat !== undefined && lon !== undefined) {
        parameters.push(lon, lat);
        const pointExpression = 'ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography';
        distanceSelection = `,
          CASE
            WHEN u.location_consent_at IS NOT NULL AND u.location IS NOT NULL THEN
              ROUND(
                (ST_Distance(u.location, ${pointExpression}) /
                  ${METERS_PER_KILOMETER})::numeric,
                ${DISTANCE_KM_DECIMALS}
              )::double precision
            ELSE NULL
          END AS "distanceKm"`;
      }

      const result = await queryable.query(
        `SELECT b.id,
                b.title,
                b.author,
                b.publication_year AS "publicationYear",
                b.description,
                b.isbn,
                b.cover_path AS "coverPath",
                b.available,
                u.public_area AS "publicArea"${distanceSelection},
                COALESCE(
                  JSONB_AGG(
                    JSONB_BUILD_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug)
                    ORDER BY c.name, c.id
                  ) FILTER (WHERE c.id IS NOT NULL),
                  '[]'::jsonb
                ) AS categories
         FROM books b
         JOIN users u ON u.id = b.owner_id
         LEFT JOIN book_categories bc ON bc.book_id = b.id
         LEFT JOIN categories c ON c.id = bc.category_id
         WHERE b.id = $1
         GROUP BY b.id, u.id`,
        parameters,
      );

      return result.rows[0] ?? null;
    },

    async recordView(bookId) {
      const result = await queryable.query(
        `INSERT INTO book_views (book_id, viewer_id)
         SELECT id, NULL
         FROM books
         WHERE id = $1
         RETURNING id`,
        [bookId],
      );

      return result.rows[0] ?? null;
    },

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

    async findByIdForUpdate(bookId) {
      const result = await queryable.query(
        `SELECT id,
                owner_id AS "ownerId",
                available
         FROM books
         WHERE id = $1
         FOR UPDATE`,
        [bookId],
      );

      return result.rows[0] ?? null;
    },

    async create(
      ownerId,
      { title, author, publicationYear, description, isbn, available, coverPath, thumbnailPath },
    ) {
      const result = await queryable.query(
        `INSERT INTO books (
           owner_id, title, author, publication_year, description, isbn, available,
           cover_path, thumbnail_path
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          ownerId,
          title,
          author,
          publicationYear,
          description ?? null,
          isbn ?? null,
          available ?? true,
          coverPath ?? null,
          thumbnailPath ?? null,
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

    async hasAcceptedLoan(bookId) {
      const result = await queryable.query(
        `SELECT EXISTS (
           SELECT 1
           FROM loan_requests
           WHERE book_id = $1 AND status = 'ACCEPTED'
         ) AS "hasAcceptedLoan"`,
        [bookId],
      );

      return result.rows[0].hasAcceptedLoan;
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
