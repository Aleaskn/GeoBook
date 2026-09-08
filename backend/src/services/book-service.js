import { AppError } from '../utils/app-error.js';
import { toBookDto, toPublicBookDetailDto, toPublicBookDto } from '../utils/book-dto.js';

function bookNotFound() {
  return new AppError({
    statusCode: 404,
    code: 'BOOK_NOT_FOUND',
    message: 'Libro non trovato.',
  });
}

function forbiddenBookOperation() {
  return new AppError({
    statusCode: 403,
    code: 'BOOK_FORBIDDEN',
    message: 'Non sei autorizzato a modificare questo libro.',
  });
}

function bookHasLoanRequests() {
  return new AppError({
    statusCode: 409,
    code: 'BOOK_HAS_LOAN_REQUESTS',
    message: 'Il libro non può essere eliminato perché possiede richieste di prestito.',
  });
}

function requireBookOwner(book, userId) {
  if (!book) {
    throw bookNotFound();
  }

  if (String(book.ownerId) !== String(userId)) {
    throw forbiddenBookOperation();
  }

  return book;
}

export function createBookService({ bookRepository, categoryRepository, imageService, logger }) {
  async function validateCategories(categoryIds) {
    const categories = await categoryRepository.findByIds(categoryIds);

    if (categories.length !== categoryIds.length) {
      throw new AppError({
        statusCode: 400,
        code: 'INVALID_CATEGORIES',
        message: 'Una o più categorie non esistono.',
        details: [{ field: 'categoryIds', message: 'Seleziona soltanto categorie esistenti.' }],
      });
    }
  }

  async function cleanupImages(book) {
    if (!book) {
      return;
    }

    try {
      await imageService.deleteBookImages(book);
    } catch (error) {
      // Un errore di pulizia non deve mascherare l'esito della transazione già conclusa.
      logger.error({ code: 'IMAGE_CLEANUP_FAILED', error });
    }
  }

  return {
    async searchBooks(query) {
      const { books, total } = await bookRepository.search(query);

      return {
        books: books.map(toPublicBookDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
        },
      };
    },

    async listOwnedBooks(userId) {
      const books = await bookRepository.findByOwnerId(userId);
      return books.map(toBookDto);
    },

    async getPublicBook(bookId, query) {
      const book = await bookRepository.findPublicById(bookId, query);

      if (!book) {
        throw bookNotFound();
      }

      return toPublicBookDetailDto(book);
    },

    async recordBookView(bookId) {
      const recordedView = await bookRepository.recordView(bookId);

      if (!recordedView) {
        throw bookNotFound();
      }
    },

    async createBook(userId, input, coverFile) {
      const categoryIds = input.categoryIds ?? [];
      await validateCategories(categoryIds);

      const imagePaths = await imageService.processCover(coverFile);

      try {
        return await bookRepository.withTransaction(async (transactionRepository) => {
          const created = await transactionRepository.create(userId, {
            ...input,
            ...imagePaths,
          });
          await transactionRepository.replaceCategories(created.id, categoryIds);
          const book = await transactionRepository.findById(created.id);
          return toBookDto(book);
        });
      } catch (error) {
        await cleanupImages(imagePaths);
        throw error;
      }
    },

    async updateBook(userId, bookId, input, coverFile) {
      const currentBook = await bookRepository.findById(bookId);
      requireBookOwner(currentBook, userId);

      if (input.categoryIds !== undefined) {
        await validateCategories(input.categoryIds);
      }

      const { categoryIds, ...bookChanges } = input;
      const imagePaths = await imageService.processCover(coverFile);

      try {
        const updatedBook = await bookRepository.withTransaction(async (transactionRepository) => {
          await transactionRepository.update(bookId, {
            ...bookChanges,
            ...imagePaths,
          });

          if (categoryIds !== undefined) {
            await transactionRepository.replaceCategories(bookId, categoryIds);
          }

          const book = await transactionRepository.findById(bookId);

          if (!book) {
            throw bookNotFound();
          }

          return toBookDto(book);
        });

        if (imagePaths) {
          await cleanupImages(currentBook);
        }

        return updatedBook;
      } catch (error) {
        await cleanupImages(imagePaths);
        throw error;
      }
    },

    async deleteBook(userId, bookId) {
      const currentBook = await bookRepository.findById(bookId);
      requireBookOwner(currentBook, userId);

      if (await bookRepository.hasLoanRequests(bookId)) {
        throw bookHasLoanRequests();
      }

      let deletedBook;

      try {
        deletedBook = await bookRepository.deleteOwned(bookId, userId);
      } catch (error) {
        // Il vincolo FK chiude la finestra tra il controllo sopra e un prestito concorrente.
        if (error?.code === '23503') {
          throw bookHasLoanRequests();
        }

        throw error;
      }

      if (!deletedBook) {
        throw bookNotFound();
      }

      await cleanupImages(currentBook);
    },
  };
}
