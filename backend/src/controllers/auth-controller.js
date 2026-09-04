import { AUTH_COOKIE_NAME } from '../config/auth.js';

export function createAuthController({ authService, authCookieOptions, clearedCookieOptions }) {
  function startSession(response, result, statusCode) {
    response.cookie(AUTH_COOKIE_NAME, result.token, authCookieOptions);
    response.status(statusCode).json({ data: { user: result.user } });
  }

  return {
    async register(request, response) {
      const result = await authService.register(request.validatedBody);
      startSession(response, result, 201);
    },

    async login(request, response) {
      const result = await authService.login(request.validatedBody);
      startSession(response, result, 200);
    },

    logout(_request, response) {
      response.clearCookie(AUTH_COOKIE_NAME, clearedCookieOptions).status(204).send();
    },

    async getMe(request, response) {
      const user = await authService.getCurrentUser(request.auth.userId);
      response.status(200).json({ data: { user } });
    },
  };
}
