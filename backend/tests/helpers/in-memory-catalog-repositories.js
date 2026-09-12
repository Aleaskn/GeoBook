import {
  APPROXIMATE_COORDINATE_DECIMALS,
  DISTANCE_KM_DECIMALS,
  hasGeographicSearch,
  METERS_PER_KILOMETER,
} from '../../src/utils/geographic-search.js';

const EARTH_RADIUS_METERS = 6_371_000;

function cloneCategory(category) {
  return { ...category };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(first, second) {
  const latitudeDelta = toRadians(second.lat - first.lat);
  const longitudeDelta = toRadians(second.lon - first.lon);
  const firstLatitude = toRadians(first.lat);
  const secondLatitude = toRadians(second.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function roundTo(value, decimalPlaces) {
  return Number(value.toFixed(decimalPlaces));
}

function toPublicLocation(location) {
  return {
    lat: roundTo(location.lat, APPROXIMATE_COORDINATE_DECIMALS),
    lon: roundTo(location.lon, APPROXIMATE_COORDINATE_DECIMALS),
  };
}

export function createInMemoryCatalogRepositories({
  categories = [],
  books = [],
  loanBookIds = [],
  activeLoanBookIds = [],
  getOwnerLocation,
}) {
  const storedCategories = categories.map(cloneCategory);
  const storedBooks = books.map((book) => ({
    ...book,
    categoryIds: [...(book.categoryIds ?? [])],
  }));
  const booksWithLoans = new Set(loanBookIds.map(String));
  const booksWithActiveLoans = new Set(activeLoanBookIds.map(String));
  const recordedViews = [];
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
    async search({ q, category, lat, lon, radiusKm, page, limit }) {
      const normalizedQuery = q?.toLocaleLowerCase('it');
      const geographicSearch = hasGeographicSearch({ lat, lon, radiusKm });
      const matchingBooks = storedBooks
        .filter((book) => book.available)
        .filter(
          (book) =>
            !normalizedQuery ||
            book.title.toLocaleLowerCase('it').includes(normalizedQuery) ||
            book.author.toLocaleLowerCase('it').includes(normalizedQuery),
        )
        .filter((book) => {
          if (!category) {
            return true;
          }

          return book.categoryIds.some((categoryId) => {
            const matchingCategory = storedCategories.find(
              (candidate) => String(candidate.id) === String(categoryId),
            );
            return matchingCategory?.slug === category;
          });
        })
        .map((book) => {
          if (!geographicSearch) {
            return book;
          }

          const owner = getOwnerLocation ? getOwnerLocation(book.ownerId) : book;
          if (!owner?.location || !owner.locationConsentAt) {
            return null;
          }

          const publicLocation = toPublicLocation(owner.location);
          const distanceMeters = calculateDistanceMeters({ lat, lon }, publicLocation);
          if (distanceMeters > radiusKm * METERS_PER_KILOMETER) {
            return null;
          }

          return {
            ...book,
            distanceKm: roundTo(distanceMeters / METERS_PER_KILOMETER, DISTANCE_KM_DECIMALS),
            approximateLat: publicLocation.lat,
            approximateLon: publicLocation.lon,
          };
        })
        .filter(Boolean)
        .sort((first, second) => {
          const dateDifference = new Date(second.createdAt) - new Date(first.createdAt);
          return dateDifference || Number(second.id) - Number(first.id);
        });
      const offset = (page - 1) * limit;

      return {
        books: matchingBooks.slice(offset, offset + limit).map(hydrateBook),
        total: matchingBooks.length,
      };
    },

    async findByOwnerId(ownerId) {
      return storedBooks
        .filter((book) => String(book.ownerId) === String(ownerId))
        .map(hydrateBook);
    },

    async findPublicById(bookId, { lat, lon }) {
      const book = storedBooks.find((candidate) => String(candidate.id) === String(bookId));

      if (!book) {
        return null;
      }

      const hydratedBook = hydrateBook(book);
      if (lat === undefined || lon === undefined) {
        return hydratedBook;
      }

      const owner = getOwnerLocation ? getOwnerLocation(book.ownerId) : book;
      if (!owner?.location || !owner.locationConsentAt) {
        return hydratedBook;
      }

      const distanceMeters = calculateDistanceMeters(
        { lat, lon },
        toPublicLocation(owner.location),
      );
      return {
        ...hydratedBook,
        distanceKm: roundTo(distanceMeters / METERS_PER_KILOMETER, DISTANCE_KM_DECIMALS),
      };
    },

    async recordView(bookId) {
      const book = storedBooks.find((candidate) => String(candidate.id) === String(bookId));

      if (!book) {
        return null;
      }

      const view = { id: String(recordedViews.length + 1), bookId: String(bookId), viewerId: null };
      recordedViews.push(view);
      return view;
    },

    async findById(bookId) {
      return hydrateBook(storedBooks.find((book) => String(book.id) === String(bookId)));
    },

    async findByIdForUpdate(bookId) {
      return bookRepository.findById(bookId);
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

    async hasAcceptedLoan(bookId) {
      return booksWithActiveLoans.has(String(bookId));
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

  return { bookRepository, categoryRepository, recordedViews };
}
