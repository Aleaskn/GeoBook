import { AppError } from '../utils/app-error.js';

export function createHealthService(healthRepository) {
  return {
    async getStatus() {
      try {
        await healthRepository.ping();
      } catch (error) {
        // I dettagli della connessione non devono attraversare il confine pubblico dell'API.
        throw new AppError({
          statusCode: 500,
          code: 'DATABASE_UNAVAILABLE',
          message: 'Il servizio non e temporaneamente disponibile.',
          cause: error,
        });
      }

      return {
        status: 'ok',
        database: 'reachable',
      };
    },
  };
}
