export function createAdminRepository(pool) {
  return {
    async getStats() {
      const [summary, statuses, categories, books, months] = await Promise.all([
        pool.query(
          `SELECT (SELECT COUNT(*)::integer FROM users) AS "usersCount",
                  (SELECT COUNT(*)::integer FROM books) AS "booksCount",
                  (SELECT COUNT(*)::integer FROM loan_requests) AS "loanRequestsCount",
                  (SELECT COUNT(*)::integer
                   FROM loan_requests
                   WHERE status = 'RETURNED') AS "completedLoansCount"`,
        ),
        pool.query(
          `SELECT status::text AS status, COUNT(*)::integer AS count
           FROM loan_requests
           GROUP BY status
           ORDER BY status`,
        ),
        pool.query(
          `SELECT c.id, c.name, c.slug, COUNT(bc.book_id)::integer AS "booksCount"
           FROM categories c
           JOIN book_categories bc ON bc.category_id = c.id
           GROUP BY c.id
           ORDER BY "booksCount" DESC, c.name, c.id
           LIMIT $1`,
          [5],
        ),
        pool.query(
          `SELECT b.id, b.title, b.author, COUNT(bv.id)::integer AS "viewsCount"
           FROM books b
           JOIN book_views bv ON bv.book_id = b.id
           GROUP BY b.id
           ORDER BY "viewsCount" DESC, b.title, b.id
           LIMIT $1`,
          [5],
        ),
        pool.query(
          `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                  COUNT(*)::integer AS count
           FROM loan_requests
           GROUP BY DATE_TRUNC('month', created_at)
           ORDER BY DATE_TRUNC('month', created_at)`,
        ),
      ]);

      return {
        summary: summary.rows[0],
        statuses: statuses.rows,
        categories: categories.rows,
        books: books.rows,
        months: months.rows,
      };
    },

    async getRecentActivity(limit) {
      const [users, books, loanRequests] = await Promise.all([
        pool.query(
          `SELECT id, name, role, city, public_area AS "publicArea",
                  created_at AS "createdAt"
           FROM users
           ORDER BY created_at DESC, id DESC
           LIMIT $1`,
          [limit],
        ),
        pool.query(
          `SELECT b.id, b.title, b.author, b.available,
                  b.created_at AS "createdAt", owner.name AS "ownerName"
           FROM books b
           JOIN users owner ON owner.id = b.owner_id
           ORDER BY b.created_at DESC, b.id DESC
           LIMIT $1`,
          [limit],
        ),
        pool.query(
          `SELECT lr.id, lr.status, lr.created_at AS "createdAt",
                  b.id AS "bookId", b.title AS "bookTitle",
                  requester.name AS "requesterName", owner.name AS "ownerName"
           FROM loan_requests lr
           JOIN books b ON b.id = lr.book_id
           JOIN users requester ON requester.id = lr.requester_id
           JOIN users owner ON owner.id = lr.owner_id
           ORDER BY lr.created_at DESC, lr.id DESC
           LIMIT $1`,
          [limit],
        ),
      ]);

      return {
        users: users.rows,
        books: books.rows,
        loanRequests: loanRequests.rows,
      };
    },
  };
}
