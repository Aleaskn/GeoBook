import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError } from '../api/api-client.js';
import { getProfile, updateProfile } from '../api/profile-api.js';
import { FormField } from '../components/FormField.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getFieldErrors } from '../utils/form-errors.js';
import { hasValidationErrors, validateProfile } from '../utils/validation.js';
import styles from './ProfilePage.module.css';

const EMPTY_PROFILE = {
  name: '',
  email: '',
  role: '',
  city: '',
  publicArea: '',
  shareRadiusKm: '10',
  locationConsentAt: null,
};

export function ProfilePage() {
  const { clearSession, updateUser } = useAuth();
  const location = useLocation();
  const [profileState, setProfileState] = useState({ status: 'loading', profile: null, error: '' });
  const [values, setValues] = useState(EMPTY_PROFILE);
  const [errors, setErrors] = useState({});
  const [saveState, setSaveState] = useState({ pending: false, error: '', success: '' });

  const loadProfile = useCallback(async () => {
    setProfileState({ status: 'loading', profile: null, error: '' });

    try {
      const profile = await getProfile();
      setProfileState({ status: 'ready', profile, error: '' });
      setValues({ ...profile, shareRadiusKm: String(profile.shareRadiusKm) });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      setProfileState({
        status: 'error',
        profile: null,
        error: error.message ?? 'Non è stato possibile caricare il profilo.',
      });
    }
  }, [clearSession]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setSaveState({ pending: false, error: '', success: '' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateProfile(values);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSaveState({ pending: true, error: '', success: '' });

    try {
      const profile = await updateProfile({
        name: values.name.trim(),
        city: values.city.trim(),
        publicArea: values.publicArea.trim(),
        shareRadiusKm: Number(values.shareRadiusKm),
      });
      setProfileState({ status: 'ready', profile, error: '' });
      setValues({ ...profile, shareRadiusKm: String(profile.shareRadiusKm) });
      updateUser(profile);
      setSaveState({ pending: false, error: '', success: 'Profilo aggiornato correttamente.' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      if (error instanceof ApiError) {
        setErrors(getFieldErrors(error.details));
      }

      setSaveState({
        pending: false,
        error: error.message ?? 'Non è stato possibile aggiornare il profilo.',
        success: '',
      });
    }
  }

  if (profileState.status === 'loading') {
    return <PageState title="Il tuo profilo" message="Caricamento del profilo…" />;
  }

  if (profileState.status === 'error') {
    return (
      <PageState
        title="Profilo non disponibile"
        message={profileState.error}
        kind="error"
        action={{ label: 'Riprova', onClick: loadProfile }}
      />
    );
  }

  if (!profileState.profile) {
    return (
      <PageState
        title="Profilo non disponibile"
        message="Non sono presenti informazioni per questo account."
      />
    );
  }

  const shareRadiusErrorId = 'profile-share-radius-error';

  return (
    <section className={styles.container}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Area personale</p>
        <h1>Il tuo profilo</h1>
        <p>Aggiorna le informazioni che descrivono pubblicamente la tua zona.</p>
      </header>
      {location.state?.notice ? (
        <p className={styles.notice} role="status">
          {location.state.notice}
        </p>
      ) : null}
      <dl className={styles.accountDetails}>
        <div>
          <dt>Email</dt>
          <dd>{values.email}</dd>
        </div>
        <div>
          <dt>Tipo di account</dt>
          <dd>{values.role === 'ADMIN' ? 'Amministratore' : 'Utente'}</dd>
        </div>
        <div>
          <dt>Posizione precisa</dt>
          <dd>{values.locationConsentAt ? 'Consenso attivo' : 'Non condivisa'}</dd>
        </div>
      </dl>
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <FormField
          id="profile-name"
          name="name"
          label="Nome"
          autoComplete="name"
          maxLength="100"
          value={values.name}
          error={errors.name}
          onChange={handleChange}
        />
        <FormField
          id="profile-city"
          name="city"
          label="Città"
          autoComplete="address-level2"
          maxLength="100"
          value={values.city}
          error={errors.city}
          onChange={handleChange}
        />
        <FormField
          id="profile-public-area"
          name="publicArea"
          label="Zona pubblica"
          autoComplete="address-level3"
          maxLength="150"
          value={values.publicArea}
          error={errors.publicArea}
          onChange={handleChange}
        />
        <div className={styles.field}>
          <label htmlFor="profile-share-radius">Raggio di condivisione</label>
          <select
            id="profile-share-radius"
            name="shareRadiusKm"
            value={values.shareRadiusKm}
            aria-describedby={errors.shareRadiusKm ? shareRadiusErrorId : undefined}
            aria-invalid={errors.shareRadiusKm ? 'true' : undefined}
            onChange={handleChange}
          >
            <option value="1">1 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
          </select>
          {errors.shareRadiusKm ? (
            <span className={styles.fieldError} id={shareRadiusErrorId}>
              {errors.shareRadiusKm}
            </span>
          ) : null}
        </div>
        {saveState.error ? (
          <p className={styles.formError} role="alert">
            {saveState.error}
          </p>
        ) : null}
        {saveState.success ? (
          <p className={styles.success} role="status">
            {saveState.success}
          </p>
        ) : null}
        <button className={styles.submitButton} type="submit" disabled={saveState.pending}>
          {saveState.pending ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </form>
      <p className={styles.privacyNote}>
        La gestione del consenso alla posizione esatta sarà disponibile nella fase geografica; la
        posizione non viene mai mostrata in questa pagina.
      </p>
    </section>
  );
}
