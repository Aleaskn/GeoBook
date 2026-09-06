import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/api-client.js';
import { getFieldErrors } from '../utils/form-errors.js';
import { hasValidationErrors, validateBook } from '../utils/validation.js';
import { FormField } from './FormField.jsx';
import styles from './BookForm.module.css';

function createInitialValues(book) {
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    publicationYear: book?.publicationYear ? String(book.publicationYear) : '',
    description: book?.description ?? '',
    isbn: book?.isbn ?? '',
    available: book?.available ?? true,
    categoryIds: (book?.categories ?? []).map((category) => String(category.id)),
  };
}

function createPayload(values) {
  const description = values.description.trim();
  const isbn = values.isbn.trim();

  return {
    title: values.title.trim(),
    author: values.author.trim(),
    publicationYear: Number(values.publicationYear),
    description: description || null,
    isbn: isbn || null,
    available: values.available,
    categoryIds: values.categoryIds.map(Number),
  };
}

export function BookForm({ book, categories, submitLabel, pendingLabel, onSubmit }) {
  const [values, setValues] = useState(() => createInitialValues(book));
  const [errors, setErrors] = useState({});
  const [submission, setSubmission] = useState({ pending: false, error: '' });

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setSubmission((current) => ({ ...current, error: '' }));
  }

  function handleCategoryChange(event) {
    const { checked, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      categoryIds: checked
        ? [...currentValues.categoryIds, value]
        : currentValues.categoryIds.filter((categoryId) => categoryId !== value),
    }));
    setErrors((currentErrors) => ({ ...currentErrors, categoryIds: '' }));
    setSubmission((current) => ({ ...current, error: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateBook(values);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSubmission({ pending: true, error: '' });

    try {
      await onSubmit(createPayload(values));
      setSubmission({ pending: false, error: '' });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(getFieldErrors(error.details));
      }

      setSubmission({
        pending: false,
        error: error.message ?? 'Non è stato possibile salvare il libro.',
      });
    }
  }

  const descriptionErrorId = 'book-description-error';
  const categoriesErrorId = 'book-categories-error';

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <fieldset className={styles.fields} disabled={submission.pending}>
        <legend className={styles.srOnly}>Informazioni del libro</legend>
        <div className={styles.twoColumns}>
          <FormField
            id="book-title"
            name="title"
            label="Titolo"
            maxLength="200"
            value={values.title}
            error={errors.title}
            onChange={handleChange}
          />
          <FormField
            id="book-author"
            name="author"
            label="Autore"
            maxLength="160"
            value={values.author}
            error={errors.author}
            onChange={handleChange}
          />
        </div>
        <div className={styles.twoColumns}>
          <FormField
            id="book-publication-year"
            name="publicationYear"
            type="number"
            label="Anno di pubblicazione"
            min="1450"
            max={String(new Date().getFullYear())}
            inputMode="numeric"
            value={values.publicationYear}
            error={errors.publicationYear}
            onChange={handleChange}
          />
          <FormField
            id="book-isbn"
            name="isbn"
            label="ISBN (facoltativo)"
            maxLength="20"
            value={values.isbn}
            error={errors.isbn}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="book-description">Descrizione (facoltativa)</label>
          <textarea
            id="book-description"
            name="description"
            rows="6"
            maxLength="5000"
            value={values.description}
            aria-describedby={errors.description ? descriptionErrorId : undefined}
            aria-invalid={errors.description ? 'true' : undefined}
            onChange={handleChange}
          />
          {errors.description ? (
            <span className={styles.fieldError} id={descriptionErrorId}>
              {errors.description}
            </span>
          ) : null}
        </div>
        <fieldset
          className={styles.categories}
          aria-describedby={errors.categoryIds ? categoriesErrorId : undefined}
        >
          <legend>Categorie</legend>
          {categories.length > 0 ? (
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <label className={styles.categoryOption} key={category.id}>
                  <input
                    type="checkbox"
                    value={String(category.id)}
                    checked={values.categoryIds.includes(String(category.id))}
                    onChange={handleCategoryChange}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className={styles.helpText}>Nessuna categoria disponibile.</p>
          )}
          {errors.categoryIds ? (
            <span className={styles.fieldError} id={categoriesErrorId}>
              {errors.categoryIds}
            </span>
          ) : null}
        </fieldset>
        <label className={styles.availability}>
          <input
            name="available"
            type="checkbox"
            checked={values.available}
            onChange={handleChange}
          />
          <span>Libro disponibile per il prestito</span>
        </label>
      </fieldset>
      {submission.error ? (
        <p className={styles.formError} role="alert">
          {submission.error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button className={styles.submitButton} type="submit" disabled={submission.pending}>
          {submission.pending ? pendingLabel : submitLabel}
        </button>
        <Link className={styles.cancelLink} to="/my-library">
          Annulla
        </Link>
      </div>
    </form>
  );
}

const categoryShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
});

BookForm.propTypes = {
  book: PropTypes.shape({
    title: PropTypes.string.isRequired,
    author: PropTypes.string.isRequired,
    publicationYear: PropTypes.number.isRequired,
    description: PropTypes.string,
    isbn: PropTypes.string,
    available: PropTypes.bool.isRequired,
    categories: PropTypes.arrayOf(categoryShape).isRequired,
  }),
  categories: PropTypes.arrayOf(categoryShape).isRequired,
  submitLabel: PropTypes.string.isRequired,
  pendingLabel: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
