function toPublicRecord(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    city: user.city,
    publicArea: user.publicArea,
    shareRadiusKm: user.shareRadiusKm,
    locationConsentAt: user.locationConsentAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function createInMemoryUserRepository(initialUsers = []) {
  const users = initialUsers.map((user) => ({ ...user }));
  let nextId = users.reduce((maximum, user) => Math.max(maximum, Number(user.id)), 0) + 1;

  return {
    async create({ name, email, passwordHash, city, publicArea }) {
      if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        const duplicateError = new Error('duplicate email');
        duplicateError.code = '23505';
        throw duplicateError;
      }

      const timestamp = new Date().toISOString();
      const user = {
        id: String(nextId++),
        name,
        email,
        passwordHash,
        role: 'USER',
        city,
        publicArea,
        shareRadiusKm: 10,
        location: null,
        locationConsentAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      users.push(user);

      return toPublicRecord(user);
    },

    async findAuthenticationByEmail(email) {
      const user = users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
      return user ? { ...user } : null;
    },

    async findById(userId) {
      const user = users.find((candidate) => String(candidate.id) === String(userId));
      return user ? toPublicRecord(user) : null;
    },

    async updateProfile(userId, input) {
      const user = users.find((candidate) => String(candidate.id) === String(userId));

      if (!user) {
        return null;
      }

      Object.assign(user, input, { updatedAt: new Date().toISOString() });
      return toPublicRecord(user);
    },

    async updateLocation(userId, { lat, lon }) {
      const user = users.find((candidate) => String(candidate.id) === String(userId));

      if (!user) {
        return null;
      }

      user.location = { lat, lon };
      user.locationConsentAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
      return toPublicRecord(user);
    },

    async deleteLocation(userId) {
      const user = users.find((candidate) => String(candidate.id) === String(userId));

      if (!user) {
        return null;
      }

      user.location = null;
      user.locationConsentAt = null;
      user.updatedAt = new Date().toISOString();
      return { id: user.id };
    },

    getPrivateUserByEmail(email) {
      return users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    },
  };
}
