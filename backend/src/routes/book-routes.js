import { Router } from 'express';
import {
  bookDetailQuerySchema,
  bookIdParamsSchema,
  createBookSchema,
  searchBooksQuerySchema,
  updateBookSchema,
} from '../schemas/book-schemas.js';
import { createLoanRequestSchema } from '../schemas/loan-request-schemas.js';
import { asyncHandler } from '../utils/async-handler.js';

export function createBookRouter({
  bookController,
  loanRequestController,
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
  router.get(
    '/:id',
    validateParams(bookIdParamsSchema),
    validateQuery(bookDetailQuerySchema),
    asyncHandler(bookController.getBook),
  );
  router.post(
    '/:id/view',
    validateParams(bookIdParamsSchema),
    asyncHandler(bookController.recordBookView),
  );

  router.use(requireAuth);
  router.post(
    '/:id/loan-requests',
    validateParams(bookIdParamsSchema),
    validateBody(createLoanRequestSchema),
    asyncHandler(loanRequestController.createLoanRequest),
  );
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
