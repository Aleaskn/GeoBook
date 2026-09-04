export const AUTH_COOKIE_NAME = 'geobook_session';

const EXPIRATION_UNIT_IN_MILLISECONDS = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function expirationToMilliseconds(expiration) {
  const value = Number.parseInt(expiration.slice(0, -1), 10);
  const unit = expiration.at(-1);

  return value * EXPIRATION_UNIT_IN_MILLISECONDS[unit];
}

export function createAuthCookieOptions(config) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
    maxAge: expirationToMilliseconds(config.jwtExpiresIn),
  };
}

export function createClearedAuthCookieOptions(config) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  };
}
