import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { createAuthCookieOptions, createClearedAuthCookieOptions } from './config/auth.js';
import { createAuthController } from './controllers/auth-controller.js';
import { createBookController } from './controllers/book-controller.js';
import { createCategoryController } from './controllers/category-controller.js';
import { createHealthController } from './controllers/health-controller.js';
import { createProfileController } from './controllers/profile-controller.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { createRequireAuth } from './middleware/require-auth.js';
import { requestId } from './middleware/request-id.js';
import { validateBody, validateParams } from './middleware/validate.js';
import { createBookRepository } from './repositories/book-repository.js';
import { createCategoryRepository } from './repositories/category-repository.js';
import { createHealthRepository } from './repositories/health-repository.js';
import { createUserRepository } from './repositories/user-repository.js';
import { createAuthRouter } from './routes/auth-routes.js';
import { createBookRouter } from './routes/book-routes.js';
import { createCategoryRouter } from './routes/category-routes.js';
import { createHealthRouter } from './routes/health-routes.js';
import { createMyBookRouter } from './routes/my-book-routes.js';
import { createProfileRouter } from './routes/profile-routes.js';
import { createAuthService } from './services/auth-service.js';
import { createBookService } from './services/book-service.js';
import { createCategoryService } from './services/category-service.js';
import { createHealthService } from './services/health-service.js';
import { createProfileService } from './services/profile-service.js';
import { createTokenService } from './services/token-service.js';
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
          message: 'Troppe richieste. Riprova più tardi.',
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

export function createApp({
  config,
  pool,
  logger = console,
  userRepository,
  bookRepository,
  categoryRepository,
}) {
  if (!config || !pool) {
    throw new TypeError('createApp richiede config e pool.');
  }

  const app = express();
  const healthRepository = createHealthRepository(pool);
  const healthService = createHealthService(healthRepository);
  const healthController = createHealthController(healthService);
  const resolvedUserRepository = userRepository ?? createUserRepository(pool);
  const tokenService = createTokenService(config);
  const authService = createAuthService({
    userRepository: resolvedUserRepository,
    tokenService,
    bcryptRounds: config.bcryptRounds,
  });
  const profileService = createProfileService(resolvedUserRepository);
  const resolvedBookRepository = bookRepository ?? createBookRepository(pool);
  const resolvedCategoryRepository = categoryRepository ?? createCategoryRepository(pool);
  const bookService = createBookService({
    bookRepository: resolvedBookRepository,
    categoryRepository: resolvedCategoryRepository,
  });
  const categoryService = createCategoryService(resolvedCategoryRepository);
  const authController = createAuthController({
    authService,
    authCookieOptions: createAuthCookieOptions(config),
    clearedCookieOptions: createClearedAuthCookieOptions(config),
  });
  const profileController = createProfileController(profileService);
  const bookController = createBookController(bookService);
  const categoryController = createCategoryController(categoryService);
  const requireAuth = createRequireAuth(tokenService);

  app.disable('x-powered-by');
  // Il request ID precede gli altri middleware affinché anche gli errori iniziali siano tracciabili.
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
  app.use(cookieParser());

  app.use('/api/v1/health', createHealthRouter(healthController));
  app.use('/api/v1/categories', createCategoryRouter(categoryController));
  app.use('/api/v1/auth', createAuthRouter({ authController, requireAuth, validateBody }));
  app.use('/api/v1/profile', createProfileRouter({ profileController, requireAuth, validateBody }));
  app.use('/api/v1/me/books', createMyBookRouter({ bookController, requireAuth }));
  app.use(
    '/api/v1/books',
    createBookRouter({ bookController, requireAuth, validateBody, validateParams }),
  );

  app.use(notFound);
  app.use(createErrorHandler({ logger }));

  return app;
}
