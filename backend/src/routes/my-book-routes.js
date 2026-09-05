import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createMyBookRouter({ bookController, requireAuth }) {
  const router = Router();

  router.use(requireAuth);
  router.get('/', asyncHandler(bookController.listOwnedBooks));

  return router;
}
