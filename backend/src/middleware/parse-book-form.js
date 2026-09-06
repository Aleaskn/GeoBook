import { AppError } from '../utils/app-error.js';

function parseCategoryIds(value) {
  if (value === undefined) {
    return undefined;
  }

  try {
    const parsed = Array.isArray(value) ? value : JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return value;
    }

    return parsed.map((categoryId) => {
      const normalizedId = Number(categoryId);
      return Number.isInteger(normalizedId) ? normalizedId : categoryId;
    });
  } catch {
    return value;
  }
}

export function parseBookForm(request, _response, next) {
  if (!request.is('multipart/form-data')) {
    next();
    return;
  }

  const body = { ...request.body };

  if (body.publicationYear !== undefined) {
    const publicationYear = Number(body.publicationYear);
    body.publicationYear = Number.isFinite(publicationYear)
      ? publicationYear
      : body.publicationYear;
  }

  if (body.available === 'true' || body.available === 'false') {
    body.available = body.available === 'true';
  }

  if (body.description === '') {
    body.description = null;
  }

  if (body.isbn === '') {
    body.isbn = null;
  }

  body.categoryIds = parseCategoryIds(body.categoryIds);

  if (body.categoryIds === undefined) {
    delete body.categoryIds;
  }

  request.body = body;
  next();
}

export function requireBookDataOrCover(request, _response, next) {
  if (Object.keys(request.body).length > 0 || request.file) {
    next();
    return;
  }

  next(
    new AppError({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'I dati inviati non sono validi.',
      details: [{ field: 'body', message: 'Specificare almeno un campo da modificare.' }],
    }),
  );
}
