import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
      message: 'deve usare il protocollo postgres o postgresql',
    }),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^[1-9]\d*[smhd]$/),
  FRONTEND_ORIGIN: z
    .string()
    .url()
    .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'deve usare il protocollo http o https',
    }),
  UPLOAD_DIR: z.string().trim().min(1),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15),
});

export class ConfigurationError extends Error {
  constructor(details) {
    super('Configurazione ambiente non valida.');
    this.name = 'ConfigurationError';
    this.code = 'ENV_VALIDATION_ERROR';
    this.details = details;
  }
}

export function loadConfig(environment = process.env) {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'environment',
      message: issue.message,
    }));

    throw new ConfigurationError(details);
  }

  const values = result.data;

  return Object.freeze({
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    jwtSecret: values.JWT_SECRET,
    jwtExpiresIn: values.JWT_EXPIRES_IN,
    frontendOrigin: values.FRONTEND_ORIGIN,
    uploadDir: values.UPLOAD_DIR,
    maxUploadBytes: values.MAX_UPLOAD_BYTES,
    bcryptRounds: values.BCRYPT_ROUNDS,
    rateLimitWindowMs: 15 * 60 * 1000,
    rateLimitMax: 100,
  });
}
