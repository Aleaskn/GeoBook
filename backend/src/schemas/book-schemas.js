import { z } from 'zod';
import { ALLOWED_RADIUS_KM } from '../utils/geographic-search.js';

const MIN_PUBLICATION_YEAR = 1450;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_CATEGORIES_PER_BOOK = 20;
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const GEOGRAPHIC_SEARCH_FIELDS = ['lat', 'lon', 'radiusKm'];

const emptyStringToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalCoordinate = (label, minimum, maximum) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number({ error: `${label} deve essere un numero.` })
      .min(minimum, `${label} deve essere almeno ${minimum}.`)
      .max(maximum, `${label} non può superare ${maximum}.`)
      .optional(),
  );

const requiredText = (label, maximumLength) =>
  z
    .string({ error: `${label} obbligatorio.` })
    .trim()
    .min(1, `${label} obbligatorio.`)
    .max(maximumLength, `${label} non può superare ${maximumLength} caratteri.`);

const descriptionSchema = z.union([
  z
    .string({ error: 'La descrizione deve essere una stringa.' })
    .trim()
    .min(1, 'La descrizione non può essere vuota.')
    .max(
      MAX_DESCRIPTION_LENGTH,
      `La descrizione non può superare ${MAX_DESCRIPTION_LENGTH} caratteri.`,
    ),
  z.null(),
]);

const isbnSchema = z.union([
  z
    .string({ error: "L'ISBN deve essere una stringa." })
    .trim()
    .regex(/^[0-9Xx-]{10,20}$/, "L'ISBN deve contenere da 10 a 20 cifre, trattini o X."),
  z.null(),
]);

const publicationYearSchema = z
  .number({ error: "L'anno di pubblicazione deve essere un numero." })
  .int("L'anno di pubblicazione deve essere intero.")
  .min(
    MIN_PUBLICATION_YEAR,
    `L'anno di pubblicazione non può precedere il ${MIN_PUBLICATION_YEAR}.`,
  )
  .max(CURRENT_YEAR, "L'anno di pubblicazione non può essere nel futuro.");

const categoryIdsSchema = z
  .array(z.number().int().positive('Ogni categoria deve avere un identificativo valido.'), {
    error: 'Le categorie devono essere un elenco.',
  })
  .max(
    MAX_CATEGORIES_PER_BOOK,
    `Non è possibile assegnare più di ${MAX_CATEGORIES_PER_BOOK} categorie.`,
  )
  .refine((categoryIds) => new Set(categoryIds).size === categoryIds.length, {
    message: 'Le categorie non possono essere duplicate.',
  });

const bookFields = {
  title: requiredText('Titolo', 200),
  author: requiredText('Autore', 160),
  publicationYear: publicationYearSchema,
  description: descriptionSchema.optional(),
  isbn: isbnSchema.optional(),
  available: z.boolean({ error: 'La disponibilità deve essere un valore booleano.' }).optional(),
  categoryIds: categoryIdsSchema.optional(),
};

export const createBookSchema = z.object(bookFields).strict();

export const updateBookSchema = z
  .object(
    Object.fromEntries(
      Object.entries(bookFields).map(([field, schema]) => [field, schema.optional()]),
    ),
  )
  .strict();

export const bookIdParamsSchema = z
  .object({
    id: z.coerce
      .number({ error: "L'identificativo del libro deve essere un numero." })
      .int("L'identificativo del libro deve essere intero.")
      .positive("L'identificativo del libro deve essere positivo."),
  })
  .strict();

export const searchBooksQuerySchema = z
  .object({
    q: z.preprocess(
      emptyStringToUndefined,
      z
        .string({ error: 'Il testo di ricerca deve essere una stringa.' })
        .trim()
        .max(200, 'Il testo di ricerca non può superare 200 caratteri.')
        .optional(),
    ),
    category: z.preprocess(
      emptyStringToUndefined,
      z
        .string({ error: 'La categoria deve essere una stringa.' })
        .trim()
        .max(90, 'La categoria non può superare 90 caratteri.')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'La categoria non è valida.')
        .optional(),
    ),
    lat: optionalCoordinate('La latitudine', -90, 90),
    lon: optionalCoordinate('La longitudine', -180, 180),
    radiusKm: z.preprocess(
      emptyStringToUndefined,
      z.coerce
        .number({ error: 'Il raggio deve essere un numero.' })
        .int('Il raggio deve essere intero.')
        .refine((value) => ALLOWED_RADIUS_KM.includes(value), {
          message: `Il raggio deve essere uno tra ${ALLOWED_RADIUS_KM.join(', ')} km.`,
        })
        .optional(),
    ),
    page: z.coerce
      .number({ error: 'La pagina deve essere un numero.' })
      .int('La pagina deve essere intera.')
      .positive('La pagina deve essere positiva.')
      .default(1),
    limit: z.coerce
      .number({ error: 'Il limite deve essere un numero.' })
      .int('Il limite deve essere intero.')
      .min(1, 'Il limite deve essere almeno 1.')
      .max(MAX_PAGE_SIZE, `Il limite non può superare ${MAX_PAGE_SIZE}.`)
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict()
  .superRefine((query, context) => {
    const providedFields = GEOGRAPHIC_SEARCH_FIELDS.filter((field) => query[field] !== undefined);

    if (providedFields.length === 0 || providedFields.length === GEOGRAPHIC_SEARCH_FIELDS.length) {
      return;
    }

    GEOGRAPHIC_SEARCH_FIELDS.filter((field) => query[field] === undefined).forEach((field) => {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: 'Latitudine, longitudine e raggio devono essere forniti insieme.',
      });
    });
  });
