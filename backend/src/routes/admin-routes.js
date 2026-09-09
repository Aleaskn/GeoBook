import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createAdminRouter({ adminController, requireAuth, requireAdmin }) {
  const router = Router();

  router.use(requireAuth, requireAdmin);
  router.get('/stats', asyncHandler(adminController.getStats));
  router.get('/recent-activity', asyncHandler(adminController.getRecentActivity));

  return router;
}
