import { Router } from 'express';
import {
  bookIdParamsSchema,
  createBookSchema,
  searchBooksQuerySchema,
  updateBookSchema,
} from '../schemas/book-schemas.js';
import { asyncHandler } from '../utils/async-handler.js';

export function createBookRouter({
  bookController,
  requireAuth,
  uploadCover,
  parseBookForm,
  requireBookDataOrCover,
  validateBody,
  validateParams,
  validateQuery,
}) {
  const router = Router();

  router.get('/', validateQuery(searchBooksQuerySchema), asyncHandler(bookController.searchBooks));

  router.use(requireAuth);
  router.post(
    '/',
    uploadCover,
    parseBookForm,
    validateBody(createBookSchema),
    asyncHandler(bookController.createBook),
  );
  router.patch(
    '/:id',
    validateParams(bookIdParamsSchema),
    uploadCover,
    parseBookForm,
    requireBookDataOrCover,
    validateBody(updateBookSchema),
    asyncHandler(bookController.updateBook),
  );
  router.delete(
    '/:id',
    validateParams(bookIdParamsSchema),
    asyncHandler(bookController.deleteBook),
  );

  return router;
}
