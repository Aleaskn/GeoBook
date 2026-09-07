function toIsoString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

const PLACEHOLDER_COVER_PATH = '/uploads/placeholder-cover.svg';

export function toCategoryDto(category) {
  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
  };
}

export function toBookDto(book) {
  // L'allowlist mantiene fuori dal contratto eventuali colonne interne aggiunte in futuro.
  return {
    id: String(book.id),
    ownerId: String(book.ownerId),
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    description: book.description,
    isbn: book.isbn,
    coverPath: book.coverPath ?? PLACEHOLDER_COVER_PATH,
    thumbnailPath: book.thumbnailPath ?? PLACEHOLDER_COVER_PATH,
    available: book.available,
    categories: (book.categories ?? []).map(toCategoryDto),
    createdAt: toIsoString(book.createdAt),
    updatedAt: toIsoString(book.updatedAt),
  };
}

export function toPublicBookDto(book) {
  // Il catalogo espone soltanto la zona dichiarata pubblica, mai identità o posizione precisa.
  return {
    id: String(book.id),
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    thumbnailPath: book.thumbnailPath ?? PLACEHOLDER_COVER_PATH,
    available: book.available,
    publicArea: book.publicArea,
    categories: (book.categories ?? []).map(toCategoryDto),
  };
}
