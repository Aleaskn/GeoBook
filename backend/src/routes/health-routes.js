import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createHealthRouter(healthController) {
  const router = Router();

  router.get('/', asyncHandler(healthController.getHealth));

  return router;
}
