import { AppError } from '../utils/app-error.js';
import { toUserDto } from '../utils/user-dto.js';

function authenticationRequired() {
  return new AppError({
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Autenticazione richiesta.',
  });
}

function requireExistingUser(user) {
  if (!user) {
    throw authenticationRequired();
  }

  return user;
}

export function createProfileService(userRepository) {
  return {
    async getProfile(userId) {
      const user = await userRepository.findById(userId);
      return toUserDto(requireExistingUser(user));
    },

    async updateProfile(userId, input) {
      const user = await userRepository.updateProfile(userId, input);
      return toUserDto(requireExistingUser(user));
    },

    async updateLocation(userId, input) {
      const user = await userRepository.updateLocation(userId, input);
      return toUserDto(requireExistingUser(user));
    },

    async deleteLocation(userId) {
      const user = await userRepository.deleteLocation(userId);
      requireExistingUser(user);
    },
  };
}
