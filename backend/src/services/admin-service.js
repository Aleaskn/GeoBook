const LOAN_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'RETURNED', 'CANCELLED'];
const RECENT_ACTIVITY_LIMIT = 5;

function toCount(value) {
  return Number(value ?? 0);
}

function withStringId(record) {
  return { ...record, id: String(record.id) };
}

export function createAdminService(adminRepository) {
  return {
    async getStats() {
      const result = await adminRepository.getStats();
      const statusCounts = new Map(
        result.statuses.map(({ status, count }) => [status, toCount(count)]),
      );

      return {
        usersCount: toCount(result.summary.usersCount),
        booksCount: toCount(result.summary.booksCount),
        loanRequestsCount: toCount(result.summary.loanRequestsCount),
        completedLoansCount: toCount(result.summary.completedLoansCount),
        loanRequestsByStatus: LOAN_STATUSES.map((status) => ({
          status,
          count: statusCounts.get(status) ?? 0,
        })),
        topCategories: result.categories.map((category) => ({
          ...withStringId(category),
          booksCount: toCount(category.booksCount),
        })),
        mostViewedBooks: result.books.map((book) => ({
          ...withStringId(book),
          viewsCount: toCount(book.viewsCount),
        })),
        loanRequestsByMonth: result.months.map((month) => ({
          month: month.month,
          count: toCount(month.count),
        })),
      };
    },

    async getRecentActivity() {
      const result = await adminRepository.getRecentActivity(RECENT_ACTIVITY_LIMIT);

      return {
        users: result.users.map(withStringId),
        books: result.books.map(withStringId),
        loanRequests: result.loanRequests.map((loanRequest) => ({
          id: String(loanRequest.id),
          status: loanRequest.status,
          createdAt: loanRequest.createdAt,
          book: {
            id: String(loanRequest.bookId),
            title: loanRequest.bookTitle,
          },
          requesterName: loanRequest.requesterName,
          ownerName: loanRequest.ownerName,
        })),
      };
    },
  };
}
