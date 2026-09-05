import { AppError } from '../utils/app-error.js';

function validationError(issues) {
  return new AppError({
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message: 'I dati inviati non sono validi.',
    details: issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    })),
  });
}

export function validateBody(schema) {
  return function bodyValidator(request, _response, next) {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(validationError(result.error.issues));
      return;
    }

    request.validatedBody = result.data;
    next();
  };
}

export function validateParams(schema) {
  return function paramsValidator(request, _response, next) {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      next(validationError(result.error.issues));
      return;
    }

    request.validatedParams = result.data;
    next();
  };
}
