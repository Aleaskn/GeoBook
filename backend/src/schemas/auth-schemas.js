import { Buffer } from 'node:buffer';
import { z } from 'zod';

const emailSchema = z
  .string({ error: 'Email obbligatoria.' })
  .trim()
  .max(255, "L'email non può superare 255 caratteri.")
  .email('Email non valida.')
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string({ error: 'Password obbligatoria.' })
  .min(8, 'La password deve contenere almeno 8 caratteri.')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'La password non può superare 72 byte.',
  });

export const registerSchema = z
  .object({
    name: z
      .string({ error: 'Nome obbligatorio.' })
      .trim()
      .min(2, 'Il nome deve contenere almeno 2 caratteri.')
      .max(100, 'Il nome non può superare 100 caratteri.'),
    email: emailSchema,
    password: passwordSchema,
    city: z
      .string({ error: 'Città obbligatoria.' })
      .trim()
      .min(2, 'La città deve contenere almeno 2 caratteri.')
      .max(100, 'La città non può superare 100 caratteri.'),
    publicArea: z
      .string({ error: 'Zona pubblica obbligatoria.' })
      .trim()
      .min(2, 'La zona pubblica deve contenere almeno 2 caratteri.')
      .max(150, 'La zona pubblica non può superare 150 caratteri.'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();
