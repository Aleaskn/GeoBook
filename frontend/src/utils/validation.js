const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SHARE_RADII = new Set(['1', '5', '10', '20']);

function validateRequiredText(value, label, maximumLength, requiredMessage) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return requiredMessage;
  }

  if (normalizedValue.length < 2) {
    return `${label} deve contenere almeno 2 caratteri.`;
  }

  if (normalizedValue.length > maximumLength) {
    return `${label} non può superare ${maximumLength} caratteri.`;
  }

  return '';
}

function validateEmail(email) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return 'Email obbligatoria.';
  }

  if (normalizedEmail.length > 255 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Email non valida.';
  }

  return '';
}

function validatePassword(password) {
  if (!password) {
    return 'Password obbligatoria.';
  }

  if (password.length < 8) {
    return 'La password deve contenere almeno 8 caratteri.';
  }

  // bcrypt considera al massimo 72 byte: il controllo replica il vincolo del server.
  if (new window.Blob([password]).size > 72) {
    return 'La password non può superare 72 byte.';
  }

  return '';
}

export function validateLogin(values) {
  return {
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  };
}

export function validateRegistration(values) {
  return {
    name: validateRequiredText(values.name, 'Nome', 100, 'Nome obbligatorio.'),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    city: validateRequiredText(values.city, 'Città', 100, 'Città obbligatoria.'),
    publicArea: validateRequiredText(
      values.publicArea,
      'Zona pubblica',
      150,
      'Zona pubblica obbligatoria.',
    ),
  };
}

export function validateProfile(values) {
  return {
    name: validateRequiredText(values.name, 'Nome', 100, 'Nome obbligatorio.'),
    city: validateRequiredText(values.city, 'Città', 100, 'Città obbligatoria.'),
    publicArea: validateRequiredText(
      values.publicArea,
      'Zona pubblica',
      150,
      'Zona pubblica obbligatoria.',
    ),
    shareRadiusKm: ALLOWED_SHARE_RADII.has(values.shareRadiusKm)
      ? ''
      : 'Seleziona un raggio di condivisione valido.',
  };
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}
