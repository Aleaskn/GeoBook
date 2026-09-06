import { AppError } from '../utils/app-error.js';
import multer from 'multer';

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.type === 'entity.parse.failed') {
    return new AppError({
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'Il corpo JSON non è valido.',
    });
  }

  if (error?.type === 'entity.too.large') {
    return new AppError({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Il corpo della richiesta è troppo grande.',
    });
  }

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new AppError({
      statusCode: 413,
      code: 'COVER_TOO_LARGE',
      message: 'La copertina supera la dimensione massima consentita.',
      details: [{ field: 'cover', message: 'Scegli un file di dimensioni inferiori.' }],
    });
  }

  if (error instanceof multer.MulterError) {
    return new AppError({
      statusCode: 400,
      code: 'INVALID_UPLOAD',
      message: 'Il caricamento della copertina non è valido.',
      details: [{ field: 'cover', message: 'Invia una sola copertina nel campo cover.' }],
    });
  }

  return new AppError({
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Si è verificato un errore inatteso.',
    cause: error,
  });
}

export function createErrorHandler({ logger = console } = {}) {
  return function errorHandler(error, request, response, _next) {
    const normalizedError = normalizeError(error);

    if (normalizedError.statusCode >= 500) {
      // La causa resta nei log locali; il payload pubblico usa sempre messaggi controllati.
      logger.error({
        code: normalizedError.code,
        requestId: request.requestId,
        error: normalizedError.cause ?? error,
      });
    }

    response.status(normalizedError.statusCode).json({
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
        requestId: request.requestId,
      },
    });
  };
}
