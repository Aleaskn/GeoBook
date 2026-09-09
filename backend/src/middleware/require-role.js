import { AppError } from '../utils/app-error.js';

export function requireRole(role) {
  return function authorizeRole(request, _response, next) {
    if (request.auth?.role !== role) {
      next(
        new AppError({
          statusCode: 403,
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Non disponi dei permessi necessari.',
        }),
      );
      return;
    }

    next();
  };
}
