import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createCategoryRouter(categoryController) {
  const router = Router();

  router.get('/', asyncHandler(categoryController.listCategories));

  return router;
}
