import { AppError } from '../utils/app-error.js';

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
