import { Router } from 'express';
import { locationSchema, profileUpdateSchema } from '../schemas/profile-schemas.js';
import { asyncHandler } from '../utils/async-handler.js';

export function createProfileRouter({ profileController, requireAuth, validateBody }) {
  const router = Router();

  router.use(requireAuth);
  router.get('/', asyncHandler(profileController.getProfile));
  router.patch(
    '/',
    validateBody(profileUpdateSchema),
    asyncHandler(profileController.updateProfile),
  );
  router.patch(
    '/location',
    validateBody(locationSchema),
    asyncHandler(profileController.updateLocation),
  );
  router.delete('/location', asyncHandler(profileController.deleteLocation));

  return router;
}
