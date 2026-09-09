import { Router } from 'express';
import {
  loanRequestDirectionQuerySchema,
  loanRequestIdParamsSchema,
  updateLoanRequestStatusSchema,
} from '../schemas/loan-request-schemas.js';
import { asyncHandler } from '../utils/async-handler.js';

export function createMyLoanRequestRouter({ loanRequestController, requireAuth, validateQuery }) {
  const router = Router();

  router.use(requireAuth);
  router.get(
    '/',
    validateQuery(loanRequestDirectionQuerySchema),
    asyncHandler(loanRequestController.listLoanRequests),
  );

  return router;
}

export function createLoanRequestRouter({
  loanRequestController,
  requireAuth,
  validateBody,
  validateParams,
}) {
  const router = Router();

  router.use(requireAuth);
  router.patch(
    '/:id/status',
    validateParams(loanRequestIdParamsSchema),
    validateBody(updateLoanRequestStatusSchema),
    asyncHandler(loanRequestController.updateLoanRequestStatus),
  );

  return router;
}
