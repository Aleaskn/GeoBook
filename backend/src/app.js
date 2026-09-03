import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { createHealthController } from './controllers/health-controller.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { requestId } from './middleware/request-id.js';
import { createHealthRepository } from './repositories/health-repository.js';
import { createHealthRouter } from './routes/health-routes.js';
import { createHealthService } from './services/health-service.js';
import { AppError } from './utils/app-error.js';

function createRateLimiter(config) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_request, _response, next) {
      next(
        new AppError({
          statusCode: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Troppe richieste. Riprova piu tardi.',
        }),
      );
    },
  });
}

function createCorsOriginValidator(frontendOrigin) {
  return function validateOrigin(origin, callback) {
    // Client da terminale o server-to-server possono non inviare Origin; un browser deve invece
    // corrispondere esattamente al frontend configurato.
    const isAllowed = !origin || origin === frontendOrigin;
    callback(null, isAllowed);
  };
}

export function createApp({ config, pool, logger = console }) {
  if (!config || !pool) {
    throw new TypeError('createApp richiede config e pool.');
  }

  const app = express();
  const healthRepository = createHealthRepository(pool);
  const healthService = createHealthService(healthRepository);
  const healthController = createHealthController(healthService);

  app.disable('x-powered-by');
  // Il request ID precede gli altri middleware affinche anche gli errori iniziali siano tracciabili.
  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin: createCorsOriginValidator(config.frontendOrigin),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(createRateLimiter(config));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1/health', createHealthRouter(healthController));

  app.use(notFound);
  app.use(createErrorHandler({ logger }));

  return app;
}
