import bcrypt from 'bcrypt';
import { AppError } from '../utils/app-error.js';
import { toUserDto } from '../utils/user-dto.js';

// Il confronto fittizio riduce la differenza temporale tra email assente e password errata.
const DUMMY_PASSWORD_HASH = '$2a$12$PVqRxthAp3hJeQRGVvXSP.ZYr3lF8VHIO37fCt9NaCq5HL7lzjUUO';

function invalidCredentials() {
  return new AppError({
    statusCode: 401,
    code: 'INVALID_CREDENTIALS',
    message: 'Email o password non valide.', // Risposta neutra: non rivela quale credenziale è errata.
  });
}

function authenticationRequired() {
  return new AppError({
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Autenticazione richiesta.',
  });
}

export function createAuthService({ userRepository, tokenService, bcryptRounds }) {
  return {
    async register(input) {
      const passwordHash = await bcrypt.hash(input.password, bcryptRounds);
      let user;

      try {
        user = await userRepository.create({ ...input, passwordHash });
      } catch (error) {
        if (error?.code === '23505') {
          throw new AppError({
            statusCode: 409,
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'Esiste già un account associato a questa email.',
          });
        }

        throw error;
      }

      return {
        token: tokenService.issue(user),
        user: toUserDto(user),
      };
    },

    async login({ email, password }) {
      const user = await userRepository.findAuthenticationByEmail(email);
      const passwordMatches = await bcrypt.compare(
        password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );

      if (!user || !passwordMatches) {
        throw invalidCredentials();
      }

      return {
        token: tokenService.issue(user),
        user: toUserDto(user),
      };
    },

    async getCurrentUser(userId) {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw authenticationRequired();
      }

      return toUserDto(user);
    },
  };
}
