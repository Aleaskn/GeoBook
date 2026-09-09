const LOAN_REQUEST_SELECTION = `
  SELECT lr.id,
         lr.book_id AS "bookId",
         lr.requester_id AS "requesterId",
         lr.owner_id AS "ownerId",
         lr.status,
         lr.message,
         lr.created_at AS "createdAt",
         lr.responded_at AS "respondedAt",
         lr.returned_at AS "returnedAt",
         b.title AS "bookTitle",
         b.author AS "bookAuthor",
         b.thumbnail_path AS "thumbnailPath",
         b.available AS "bookAvailable",
         requester.name AS "requesterName",
         owner.name AS "ownerName"
  FROM loan_requests lr
  JOIN books b ON b.id = lr.book_id
  JOIN users requester ON requester.id = lr.requester_id
  JOIN users owner ON owner.id = lr.owner_id`;

const PARTICIPANT_COLUMNS = {
  incoming: 'lr.owner_id',
  outgoing: 'lr.requester_id',
};

function createLoanRequestQueries(queryable) {
  return {
    async findBookByIdForUpdate(bookId) {
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

    async create(bookId, requesterId, ownerId, message) {
      const result = await queryable.query(
        `INSERT INTO loan_requests (book_id, requester_id, owner_id, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [bookId, requesterId, ownerId, message ?? null],
      );

      return result.rows[0];
    },

    async findById(loanRequestId) {
      const result = await queryable.query(
        `${LOAN_REQUEST_SELECTION}
         WHERE lr.id = $1`,
        [loanRequestId],
      );

      return result.rows[0] ?? null;
    },

    async findByIdForUpdate(loanRequestId) {
      const result = await queryable.query(
        `${LOAN_REQUEST_SELECTION}
         WHERE lr.id = $1
         FOR UPDATE OF lr, b`,
        [loanRequestId],
      );

      return result.rows[0] ?? null;
    },

    async findByParticipant(userId, direction) {
      // La colonna deriva esclusivamente dalla allowlist, mai dalla query dell'utente.
      const participantColumn = PARTICIPANT_COLUMNS[direction];
      const result = await queryable.query(
        `${LOAN_REQUEST_SELECTION}
         WHERE ${participantColumn} = $1
         ORDER BY lr.created_at DESC, lr.id DESC`,
        [userId],
      );

      return result.rows;
    },

    async updateStatus(loanRequestId, currentStatus, nextStatus) {
      const result = await queryable.query(
        `UPDATE loan_requests
         SET status = $3::loan_status,
             responded_at = CASE
               WHEN status = 'PENDING' THEN CURRENT_TIMESTAMP
               ELSE responded_at
             END,
             returned_at = CASE
               WHEN $3::loan_status = 'RETURNED'::loan_status THEN CURRENT_TIMESTAMP
               ELSE NULL
             END
         WHERE id = $1 AND status = $2
         RETURNING id`,
        [loanRequestId, currentStatus, nextStatus],
      );

      return result.rows[0] ?? null;
    },

    async setBookAvailability(bookId, available) {
      const result = await queryable.query(
        `UPDATE books
         SET available = $2
         WHERE id = $1
         RETURNING id`,
        [bookId, available],
      );

      return result.rows[0] ?? null;
    },
  };
}

export function createLoanRequestRepository(pool) {
  const queries = createLoanRequestQueries(pool);

  return {
    ...queries,

    async withTransaction(operation) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const result = await operation(createLoanRequestQueries(client));
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
