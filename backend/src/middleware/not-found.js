import { AppError } from '../utils/app-error.js';

export function notFound(_request, _response, next) {
  next(
    new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Risorsa non trovata.',
    }),
  );
}
