import { AUTH_COOKIE_NAME } from '../config/auth.js';
import { AppError } from '../utils/app-error.js';

function authenticationRequired() {
  return new AppError({
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Autenticazione richiesta.',
  });
}

export function createRequireAuth(tokenService) {
  return function requireAuth(request, _response, next) {
    const token = request.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      next(authenticationRequired());
      return;
    }

    try {
      request.auth = tokenService.verify(token);
      next();
    } catch {
      // Token assenti, scaduti o alterati ricevono la stessa risposta per non offrire indizi.
      next(authenticationRequired());
    }
  };
}
