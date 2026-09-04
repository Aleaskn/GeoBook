import { z } from 'zod';

const ALLOWED_SHARE_RADII = new Set([1, 5, 10, 20]);
const shareRadiusSchema = z
  .number({ error: 'Il raggio di condivisione deve essere un numero.' })
  .int('Il raggio di condivisione deve essere intero.')
  .refine((radius) => ALLOWED_SHARE_RADII.has(radius), {
    message: 'Il raggio di condivisione deve essere 1, 5, 10 o 20 km.',
  });

export const profileUpdateSchema = z
  .object({
    name: z
      .string({ error: 'Il nome deve essere una stringa.' })
      .trim()
      .min(2, 'Il nome deve contenere almeno 2 caratteri.')
      .max(100, 'Il nome non può superare 100 caratteri.')
      .optional(),
    city: z
      .string({ error: 'La città deve essere una stringa.' })
      .trim()
      .min(2, 'La città deve contenere almeno 2 caratteri.')
      .max(100, 'La città non può superare 100 caratteri.')
      .optional(),
    publicArea: z
      .string({ error: 'La zona pubblica deve essere una stringa.' })
      .trim()
      .min(2, 'La zona pubblica deve contenere almeno 2 caratteri.')
      .max(150, 'La zona pubblica non può superare 150 caratteri.')
      .optional(),
    shareRadiusKm: shareRadiusSchema.optional(),
  })
  .strict()
  .refine((profile) => Object.keys(profile).length > 0, {
    message: 'Specificare almeno un campo da modificare.',
  });

export const locationSchema = z
  .object({
    lat: z
      .number({ error: 'La latitudine deve essere un numero.' })
      .min(-90, 'Latitudine non valida.')
      .max(90, 'Latitudine non valida.'),
    lon: z
      .number({ error: 'La longitudine deve essere un numero.' })
      .min(-180, 'Longitudine non valida.')
      .max(180, 'Longitudine non valida.'),
    consent: z.literal(true, {
      error: 'Il consenso esplicito è obbligatorio per salvare la posizione.',
    }),
  })
  .strict();
