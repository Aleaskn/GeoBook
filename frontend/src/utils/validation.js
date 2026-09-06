const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISBN_PATTERN = /^[0-9Xx-]{10,20}$/;
const ALLOWED_SHARE_RADII = new Set(['1', '5', '10', '20']);
const MIN_PUBLICATION_YEAR = 1450;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_CATEGORIES_PER_BOOK = 20;

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

export function validateBook(values) {
  const title = values.title.trim();
  const author = values.author.trim();
  const description = values.description.trim();
  const isbn = values.isbn.trim();
  const publicationYear = Number(values.publicationYear);

  return {
    title: !title
      ? 'Titolo obbligatorio.'
      : title.length > 200
        ? 'Il titolo non può superare 200 caratteri.'
        : '',
    author: !author
      ? 'Autore obbligatorio.'
      : author.length > 160
        ? "L'autore non può superare 160 caratteri."
        : '',
    publicationYear:
      !values.publicationYear.trim() || !Number.isInteger(publicationYear)
        ? "L'anno di pubblicazione deve essere intero."
        : publicationYear < MIN_PUBLICATION_YEAR
          ? "L'anno di pubblicazione non può precedere il " + MIN_PUBLICATION_YEAR + '.'
          : publicationYear > new Date().getFullYear()
            ? "L'anno di pubblicazione non può essere nel futuro."
            : '',
    description:
      description.length > MAX_DESCRIPTION_LENGTH
        ? 'La descrizione non può superare ' + MAX_DESCRIPTION_LENGTH + ' caratteri.'
        : '',
    isbn: isbn && !ISBN_PATTERN.test(isbn) ? "L'ISBN non è valido." : '',
    categoryIds:
      values.categoryIds.length > MAX_CATEGORIES_PER_BOOK
        ? 'Non puoi selezionare più di ' + MAX_CATEGORIES_PER_BOOK + ' categorie.'
        : '',
  };
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}
