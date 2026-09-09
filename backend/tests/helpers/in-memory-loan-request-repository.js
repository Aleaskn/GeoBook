function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createInMemoryLoanRequestRepository({ users = [], books = [], loanRequests = [] }) {
  const storedUsers = users.map(clone);
  const storedBooks = books.map(clone);
  const storedLoanRequests = loanRequests.map(clone);
  let nextLoanRequestId =
    storedLoanRequests.reduce((maximum, request) => Math.max(maximum, Number(request.id)), 0) + 1;
  let failNextStatusUpdate = false;

  function hydrateLoanRequest(loanRequest) {
    if (!loanRequest) {
      return null;
    }

    const book = storedBooks.find(
      (candidate) => String(candidate.id) === String(loanRequest.bookId),
    );
    const requester = storedUsers.find(
      (candidate) => String(candidate.id) === String(loanRequest.requesterId),
    );
    const owner = storedUsers.find(
      (candidate) => String(candidate.id) === String(loanRequest.ownerId),
    );

    return {
      ...clone(loanRequest),
      bookTitle: book.title,
      bookAuthor: book.author,
      thumbnailPath: book.thumbnailPath ?? null,
      bookAvailable: book.available,
      requesterName: requester.name,
      ownerName: owner.name,
    };
  }

  const repository = {
    async findBookByIdForUpdate(bookId) {
      const book = storedBooks.find((candidate) => String(candidate.id) === String(bookId));
      return book ? clone(book) : null;
    },

    async create(bookId, requesterId, ownerId, message) {
      const duplicate = storedLoanRequests.some(
        (loanRequest) =>
          String(loanRequest.bookId) === String(bookId) &&
          String(loanRequest.requesterId) === String(requesterId) &&
          loanRequest.status === 'PENDING',
      );

      if (duplicate) {
        const error = new Error('duplicate pending loan request');
        error.code = '23505';
        throw error;
      }

      const loanRequest = {
        id: String(nextLoanRequestId++),
        bookId: String(bookId),
        requesterId: String(requesterId),
        ownerId: String(ownerId),
        status: 'PENDING',
        message: message ?? null,
        createdAt: new Date().toISOString(),
        respondedAt: null,
        returnedAt: null,
      };
      storedLoanRequests.push(loanRequest);
      return { id: loanRequest.id };
    },

    async findById(loanRequestId) {
      return hydrateLoanRequest(
        storedLoanRequests.find((candidate) => String(candidate.id) === String(loanRequestId)),
      );
    },

    async findByIdForUpdate(loanRequestId) {
      return repository.findById(loanRequestId);
    },

    async findByParticipant(userId, direction) {
      const participantField = direction === 'incoming' ? 'ownerId' : 'requesterId';
      return storedLoanRequests
        .filter((loanRequest) => String(loanRequest[participantField]) === String(userId))
        .sort((first, second) => {
          const dateDifference = new Date(second.createdAt) - new Date(first.createdAt);
          return dateDifference || Number(second.id) - Number(first.id);
        })
        .map(hydrateLoanRequest);
    },

    async updateStatus(loanRequestId, currentStatus, nextStatus) {
      if (failNextStatusUpdate) {
        failNextStatusUpdate = false;
        throw new Error('simulated status update failure');
      }

      const loanRequest = storedLoanRequests.find(
        (candidate) =>
          String(candidate.id) === String(loanRequestId) && candidate.status === currentStatus,
      );

      if (!loanRequest) {
        return null;
      }

      const timestamp = new Date().toISOString();
      loanRequest.status = nextStatus;
      loanRequest.respondedAt = loanRequest.respondedAt ?? timestamp;
      loanRequest.returnedAt = nextStatus === 'RETURNED' ? timestamp : null;
      return { id: loanRequest.id };
    },

    async setBookAvailability(bookId, available) {
      const book = storedBooks.find((candidate) => String(candidate.id) === String(bookId));
      if (!book) {
        return null;
      }
      book.available = available;
      return { id: book.id };
    },

    async withTransaction(operation) {
      const booksSnapshot = clone(storedBooks);
      const loanRequestsSnapshot = clone(storedLoanRequests);
      const nextIdSnapshot = nextLoanRequestId;

      try {
        return await operation(repository);
      } catch (error) {
        storedBooks.splice(0, storedBooks.length, ...booksSnapshot);
        storedLoanRequests.splice(0, storedLoanRequests.length, ...loanRequestsSnapshot);
        nextLoanRequestId = nextIdSnapshot;
        throw error;
      }
    },

    getBook(bookId) {
      return clone(storedBooks.find((candidate) => String(candidate.id) === String(bookId)));
    },

    getLoanRequests() {
      return storedLoanRequests.map(clone);
    },

    failNextUpdate() {
      failNextStatusUpdate = true;
    },
  };

  return repository;
}
