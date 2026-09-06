import { z } from 'zod';

const MIN_PUBLICATION_YEAR = 1450;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_CATEGORIES_PER_BOOK = 20;
const CURRENT_YEAR = new Date().getFullYear();

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
