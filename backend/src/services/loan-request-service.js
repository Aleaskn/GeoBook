import { AppError } from '../utils/app-error.js';
import { toLoanRequestDto } from '../utils/loan-request-dto.js';

const OWNER_TRANSITIONS = new Set(['ACCEPTED', 'REJECTED', 'RETURNED']);
const REQUIRED_CURRENT_STATUS = {
  ACCEPTED: 'PENDING',
  REJECTED: 'PENDING',
  CANCELLED: 'PENDING',
  RETURNED: 'ACCEPTED',
};

function loanRequestNotFound() {
  return new AppError({
    statusCode: 404,
    code: 'LOAN_REQUEST_NOT_FOUND',
    message: 'Richiesta di prestito non trovata.',
  });
}

function loanRequestForbidden() {
  return new AppError({
    statusCode: 403,
    code: 'LOAN_REQUEST_FORBIDDEN',
    message: 'Non sei autorizzato a modificare questa richiesta.',
  });
}

function invalidTransition() {
  return new AppError({
    statusCode: 409,
    code: 'INVALID_LOAN_REQUEST_TRANSITION',
    message: 'La transizione richiesta non è consentita dallo stato attuale.',
  });
}

function bookNotAvailable() {
  return new AppError({
    statusCode: 409,
    code: 'BOOK_NOT_AVAILABLE',
    message: 'Il libro non è disponibile per una richiesta di prestito.',
  });
}

function assertAuthorizedActor(loanRequest, userId, nextStatus) {
  const actorId = OWNER_TRANSITIONS.has(nextStatus) ? loanRequest.ownerId : loanRequest.requesterId;

  if (String(actorId) !== String(userId)) {
    throw loanRequestForbidden();
  }
}

export function createLoanRequestService(loanRequestRepository) {
  return {
    async createLoanRequest(userId, bookId, input) {
      try {
        return await loanRequestRepository.withTransaction(async (transactionRepository) => {
          const book = await transactionRepository.findBookByIdForUpdate(bookId);

          if (!book) {
            throw new AppError({
              statusCode: 404,
              code: 'BOOK_NOT_FOUND',
              message: 'Libro non trovato.',
            });
          }

          if (String(book.ownerId) === String(userId)) {
            throw new AppError({
              statusCode: 409,
              code: 'OWN_BOOK_LOAN_REQUEST',
              message: 'Non puoi richiedere in prestito un libro di tua proprietà.',
            });
          }

          if (!book.available) {
            throw bookNotAvailable();
          }

          const created = await transactionRepository.create(
            bookId,
            userId,
            book.ownerId,
            input.message,
          );
          const loanRequest = await transactionRepository.findById(created.id);
          return toLoanRequestDto(loanRequest);
        });
      } catch (error) {
        if (error?.code === '23505') {
          throw new AppError({
            statusCode: 409,
            code: 'PENDING_LOAN_REQUEST_EXISTS',
            message: 'Hai già una richiesta in attesa per questo libro.',
          });
        }

        throw error;
      }
    },

    async listLoanRequests(userId, direction) {
      const loanRequests = await loanRequestRepository.findByParticipant(userId, direction);
      return loanRequests.map(toLoanRequestDto);
    },

    async updateLoanRequestStatus(userId, loanRequestId, nextStatus) {
      return loanRequestRepository.withTransaction(async (transactionRepository) => {
        const loanRequest = await transactionRepository.findByIdForUpdate(loanRequestId);

        if (!loanRequest) {
          throw loanRequestNotFound();
        }

        assertAuthorizedActor(loanRequest, userId, nextStatus);

        const requiredCurrentStatus = REQUIRED_CURRENT_STATUS[nextStatus];
        if (loanRequest.status !== requiredCurrentStatus) {
          throw invalidTransition();
        }

        if (nextStatus === 'ACCEPTED') {
          if (!loanRequest.bookAvailable) {
            throw bookNotAvailable();
          }
          await transactionRepository.setBookAvailability(loanRequest.bookId, false);
        }

        if (nextStatus === 'RETURNED') {
          await transactionRepository.setBookAvailability(loanRequest.bookId, true);
        }

        const updated = await transactionRepository.updateStatus(
          loanRequestId,
          loanRequest.status,
          nextStatus,
        );

        if (!updated) {
          throw invalidTransition();
        }

        return toLoanRequestDto(await transactionRepository.findById(loanRequestId));
      });
    },
  };
}
