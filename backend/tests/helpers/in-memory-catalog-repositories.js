function cloneCategory(category) {
  return { ...category };
}

export function createInMemoryCatalogRepositories({
  categories = [],
  books = [],
  loanBookIds = [],
}) {
  const storedCategories = categories.map(cloneCategory);
  const storedBooks = books.map((book) => ({
    ...book,
    categoryIds: [...(book.categoryIds ?? [])],
  }));
  const booksWithLoans = new Set(loanBookIds.map(String));
  let nextBookId = storedBooks.reduce((maximum, book) => Math.max(maximum, Number(book.id)), 0) + 1;

  function hydrateBook(book) {
    if (!book) {
      return null;
    }

    return {
      ...book,
      categories: book.categoryIds
        .map((categoryId) =>
          storedCategories.find((category) => String(category.id) === String(categoryId)),
        )
        .filter(Boolean)
        .map(cloneCategory)
        .sort((first, second) => first.name.localeCompare(second.name, 'it')),
    };
  }

  const bookRepository = {
    async findByOwnerId(ownerId) {
      return storedBooks
        .filter((book) => String(book.ownerId) === String(ownerId))
        .map(hydrateBook);
    },

    async findById(bookId) {
      return hydrateBook(storedBooks.find((book) => String(book.id) === String(bookId)));
    },

    async create(ownerId, input) {
      const timestamp = new Date().toISOString();
      const book = {
        id: String(nextBookId++),
        ownerId: String(ownerId),
        title: input.title,
        author: input.author,
        publicationYear: input.publicationYear,
        description: input.description ?? null,
        isbn: input.isbn ?? null,
        coverPath: input.coverPath ?? null,
        thumbnailPath: input.thumbnailPath ?? null,
        available: input.available ?? true,
        categoryIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      storedBooks.push(book);
      return { id: book.id };
    },

    async update(bookId, changes) {
      const book = storedBooks.find((candidate) => String(candidate.id) === String(bookId));

      if (!book) {
        return null;
      }

      Object.assign(book, changes, { updatedAt: new Date().toISOString() });
      return { id: book.id };
    },

    async replaceCategories(bookId, categoryIds) {
      const book = storedBooks.find((candidate) => String(candidate.id) === String(bookId));

      if (book) {
        book.categoryIds = [...categoryIds];
      }
    },

    async hasLoanRequests(bookId) {
      return booksWithLoans.has(String(bookId));
    },

    async deleteOwned(bookId, ownerId) {
      const index = storedBooks.findIndex(
        (book) => String(book.id) === String(bookId) && String(book.ownerId) === String(ownerId),
      );

      if (index === -1) {
        return null;
      }

      const [deletedBook] = storedBooks.splice(index, 1);
      return { id: deletedBook.id };
    },

    async withTransaction(operation) {
      return operation(bookRepository);
    },
  };

  const categoryRepository = {
    async findAll() {
      return storedCategories
        .map(cloneCategory)
        .sort((first, second) => first.name.localeCompare(second.name, 'it'));
    },

    async findByIds(categoryIds) {
      return storedCategories
        .filter((category) => categoryIds.some((id) => String(id) === String(category.id)))
        .map(cloneCategory);
    },
  };

  return { bookRepository, categoryRepository };
}
