import { Router } from 'express';
import { bookIdParamsSchema, createBookSchema, updateBookSchema } from '../schemas/book-schemas.js';
import { asyncHandler } from '../utils/async-handler.js';

export function createBookRouter({
  bookController,
  requireAuth,
  uploadCover,
  parseBookForm,
  requireBookDataOrCover,
  validateBody,
  validateParams,
}) {
  const router = Router();

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
