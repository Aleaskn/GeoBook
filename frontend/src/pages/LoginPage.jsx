import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/api-client.js';
import { FormField } from '../components/FormField.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { focusFirstInvalidField, getFieldErrors } from '../utils/form-errors.js';
import { hasValidationErrors, validateLogin } from '../utils/validation.js';
import styles from './AuthPage.module.css';

const INITIAL_VALUES = { email: '', password: '' };

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [requestState, setRequestState] = useState({ pending: false, error: '' });

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setRequestState((currentState) => ({ ...currentState, error: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const validationErrors = validateLogin(values);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      focusFirstInvalidField(form, validationErrors);
      return;
    }

    setRequestState({ pending: true, error: '' });

    try {
      await login({ email: values.email.trim(), password: values.password });
      // Accettiamo solo percorsi locali generati dal router, mai destinazioni esterne.
      const requestedPath = location.state?.from;
      const destination =
        typeof requestedPath === 'string' && requestedPath.startsWith('/')
          ? requestedPath
          : '/profile';
      navigate(destination, { replace: true, state: { notice: 'Accesso effettuato.' } });
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = getFieldErrors(error.details);
        setErrors(fieldErrors);
        focusFirstInvalidField(form, fieldErrors);
      }

      setRequestState({
        pending: false,
        error: error.message ?? 'Non è stato possibile effettuare l’accesso.',
      });
    }
  }

  return (
    <section className={styles.card}>
      <h1>Accedi a GeoBook</h1>
      <p className={styles.introduction}>Riprendi la gestione della tua biblioteca personale.</p>
      {location.state?.notice ? (
        <p className={styles.notice} role="status">
          {location.state.notice}
        </p>
      ) : null}
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <FormField
          id="login-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={handleChange}
        />
        <FormField
          id="login-password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
        />
        {requestState.error ? (
          <p className={styles.formError} role="alert">
            {requestState.error}
          </p>
        ) : null}
        <button className={styles.submitButton} type="submit" disabled={requestState.pending}>
          {requestState.pending ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>
      <p className={styles.alternateAction}>
        Non hai un account? <Link to="/register">Registrati</Link>
      </p>
    </section>
  );
}
