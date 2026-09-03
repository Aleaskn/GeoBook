export class AppError extends Error {
  constructor({ statusCode, code, message, details = [], cause }) {
    super(message, { cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
