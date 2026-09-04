import { Router } from 'express';
import { loginSchema, registerSchema } from '../schemas/auth-schemas.js';
import { asyncHandler } from '../utils/async-handler.js';

export function createAuthRouter({ authController, requireAuth, validateBody }) {
  const router = Router();

  router.post('/register', validateBody(registerSchema), asyncHandler(authController.register));
  router.post('/login', validateBody(loginSchema), asyncHandler(authController.login));
  router.post('/logout', authController.logout);
  router.get('/me', requireAuth, asyncHandler(authController.getMe));

  return router;
}
