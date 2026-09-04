import jwt from 'jsonwebtoken';

const JWT_ISSUER = 'geobook-api';
const JWT_AUDIENCE = 'geobook-web';
const ALLOWED_ROLES = new Set(['USER', 'ADMIN']);

export function createTokenService(config) {
  return {
    issue(user) {
      return jwt.sign({ role: user.role }, config.jwtSecret, {
        algorithm: 'HS256',
        subject: String(user.id),
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: config.jwtExpiresIn,
      });
    },

    verify(token) {
      const payload = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      if (
        typeof payload === 'string' ||
        !/^\d+$/.test(payload.sub ?? '') ||
        !ALLOWED_ROLES.has(payload.role)
      ) {
        throw new Error('Payload JWT non valido.');
      }

      return { userId: payload.sub, role: payload.role };
    },
  };
}
