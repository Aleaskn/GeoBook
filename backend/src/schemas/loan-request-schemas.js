import { z } from 'zod';

const MAX_MESSAGE_LENGTH = 500;

const emptyStringToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const createLoanRequestSchema = z
  .object({
    message: z.preprocess(
      emptyStringToUndefined,
      z
        .string({ error: 'Il messaggio deve essere una stringa.' })
        .trim()
        .max(MAX_MESSAGE_LENGTH, `Il messaggio non può superare ${MAX_MESSAGE_LENGTH} caratteri.`)
        .optional(),
    ),
  })
  .strict();

export const loanRequestDirectionQuerySchema = z
  .object({
    direction: z.enum(['incoming', 'outgoing'], {
      error: 'La direzione deve essere incoming oppure outgoing.',
    }),
  })
  .strict();

export const loanRequestIdParamsSchema = z
  .object({
    id: z.coerce
      .number({ error: "L'identificativo della richiesta deve essere un numero." })
      .int("L'identificativo della richiesta deve essere intero.")
      .positive("L'identificativo della richiesta deve essere positivo."),
  })
  .strict();

export const updateLoanRequestStatusSchema = z
  .object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'RETURNED', 'CANCELLED'], {
      error: 'Lo stato richiesto non è valido.',
    }),
  })
  .strict();
