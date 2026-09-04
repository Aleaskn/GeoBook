import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/api-client.js';
import { FormField } from '../components/FormField.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getFieldErrors } from '../utils/form-errors.js';
import { hasValidationErrors, validateRegistration } from '../utils/validation.js';
import styles from './AuthPage.module.css';

const INITIAL_VALUES = { name: '', email: '', password: '', city: '', publicArea: '' };

export function RegisterPage() {
  const { register } = useAuth();
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
    const validationErrors = validateRegistration(values);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setRequestState({ pending: true, error: '' });

    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        city: values.city.trim(),
        publicArea: values.publicArea.trim(),
      });
      navigate('/profile', {
        replace: true,
        state: { notice: 'Registrazione completata. Benvenuto in GeoBook!' },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(getFieldErrors(error.details));
      }

      setRequestState({
        pending: false,
        error: error.message ?? 'Non è stato possibile completare la registrazione.',
      });
    }
  }

  return (
    <section className={styles.card}>
      <h1>Crea il tuo account</h1>
      <p className={styles.introduction}>
        Inserisci i dati necessari. La zona pubblica sarà mostrata al posto dell’indirizzo preciso.
      </p>
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <FormField
          id="register-name"
          name="name"
          label="Nome"
          autoComplete="name"
          maxLength="100"
          value={values.name}
          error={errors.name}
          onChange={handleChange}
        />
        <FormField
          id="register-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          maxLength="255"
          value={values.email}
          error={errors.email}
          onChange={handleChange}
        />
        <FormField
          id="register-password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
        />
        <FormField
          id="register-city"
          name="city"
          label="Città"
          autoComplete="address-level2"
          maxLength="100"
          value={values.city}
          error={errors.city}
          onChange={handleChange}
        />
        <FormField
          id="register-public-area"
          name="publicArea"
          label="Zona pubblica"
          autoComplete="address-level3"
          maxLength="150"
          value={values.publicArea}
          error={errors.publicArea}
          onChange={handleChange}
        />
        {requestState.error ? (
          <p className={styles.formError} role="alert">
            {requestState.error}
          </p>
        ) : null}
        <button className={styles.submitButton} type="submit" disabled={requestState.pending}>
          {requestState.pending ? 'Registrazione in corso…' : 'Registrati'}
        </button>
      </form>
      <p className={styles.alternateAction}>
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </section>
  );
}
