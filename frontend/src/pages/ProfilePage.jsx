import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError } from '../api/api-client.js';
import {
  deleteProfileLocation,
  getProfile,
  updateProfile,
  updateProfileLocation,
} from '../api/profile-api.js';
import { FormField } from '../components/FormField.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { focusFirstInvalidField, getFieldErrors } from '../utils/form-errors.js';
import {
  hasValidationErrors,
  parseCoordinate,
  validateProfile,
  validateProfileLocation,
} from '../utils/validation.js';
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

const EMPTY_LOCATION = { lat: '', lon: '', consent: false };

export function ProfilePage() {
  const { clearSession, updateUser } = useAuth();
  const location = useLocation();
  const [profileState, setProfileState] = useState({ status: 'loading', profile: null, error: '' });
  const [values, setValues] = useState(EMPTY_PROFILE);
  const [errors, setErrors] = useState({});
  const [saveState, setSaveState] = useState({ pending: false, error: '', success: '' });
  const [locationValues, setLocationValues] = useState(EMPTY_LOCATION);
  const [locationErrors, setLocationErrors] = useState({});
  const [locationState, setLocationState] = useState({
    pending: false,
    error: '',
    success: '',
  });

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

  function handleLocationChange(event) {
    const { checked, name, type, value } = event.target;
    setLocationValues((currentValues) => ({
      ...currentValues,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setLocationErrors((currentErrors) => ({ ...currentErrors, [name]: '' }));
    setLocationState({ pending: false, error: '', success: '' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const validationErrors = validateProfile(values);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      focusFirstInvalidField(form, validationErrors);
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
        const fieldErrors = getFieldErrors(error.details);
        setErrors(fieldErrors);
        focusFirstInvalidField(form, fieldErrors);
      }

      setSaveState({
        pending: false,
        error: error.message ?? 'Non è stato possibile aggiornare il profilo.',
        success: '',
      });
    }
  }

  async function handleLocationSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const validationErrors = validateProfileLocation(locationValues);

    if (hasValidationErrors(validationErrors)) {
      setLocationErrors(validationErrors);
      focusFirstInvalidField(form, validationErrors);
      return;
    }

    setLocationState({ pending: true, error: '', success: '' });

    try {
      const profile = await updateProfileLocation({
        lat: parseCoordinate(locationValues.lat),
        lon: parseCoordinate(locationValues.lon),
        consent: true,
      });
      setProfileState({ status: 'ready', profile, error: '' });
      setValues({ ...profile, shareRadiusKm: String(profile.shareRadiusKm) });
      updateUser(profile);
      // Le coordinate precise non restano nei campi dopo l'invio e non tornano mai nel DTO.
      setLocationValues(EMPTY_LOCATION);
      setLocationErrors({});
      setLocationState({
        pending: false,
        error: '',
        success: 'Posizione e consenso salvati correttamente.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      if (error instanceof ApiError) {
        const fieldErrors = getFieldErrors(error.details);
        setLocationErrors(fieldErrors);
        focusFirstInvalidField(form, fieldErrors);
      }

      setLocationState({
        pending: false,
        error: error.message ?? 'Non è stato possibile salvare la posizione.',
        success: '',
      });
    }
  }

  async function handleLocationDelete() {
    if (!window.confirm('Vuoi revocare il consenso ed eliminare la posizione precisa salvata?')) {
      return;
    }

    setLocationState({ pending: true, error: '', success: '' });

    try {
      await deleteProfileLocation();
      const profile = { ...profileState.profile, locationConsentAt: null };
      setProfileState({ status: 'ready', profile, error: '' });
      setValues((currentValues) => ({ ...currentValues, locationConsentAt: null }));
      updateUser(profile);
      setLocationValues(EMPTY_LOCATION);
      setLocationErrors({});
      setLocationState({
        pending: false,
        error: '',
        success: 'Consenso revocato e posizione eliminata.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }

      setLocationState({
        pending: false,
        error: error.message ?? 'Non è stato possibile revocare il consenso.',
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
      <section className={styles.locationInfo} aria-labelledby="profile-location-information">
        <h2 id="profile-location-information">Coordinate e consenso</h2>
        <p>
          Inserisci le coordinate del punto da usare per la ricerca per distanza. Puoi copiarle da
          un servizio di mappe cercando la tua zona e selezionando un punto rappresentativo: non è
          necessario indicare l’indirizzo di casa.
        </p>
        <p>
          Lo stato “Posizione precisa” qui sopra conferma se il consenso è attivo. GeoBook conserva
          il punto preciso come dato interno protetto, ma ricerca, filtro per raggio, distanze
          pubbliche e marker usano esclusivamente una posizione approssimata. Vicino al limite del
          raggio, l’approssimazione può quindi includere o escludere un libro rispetto alla distanza
          dal punto preciso.
        </p>
        <form className={styles.locationForm} noValidate onSubmit={handleLocationSubmit}>
          <div className={styles.coordinateFields}>
            <FormField
              id="profile-latitude"
              name="lat"
              label="Latitudine"
              type="text"
              inputMode="decimal"
              placeholder="41.1171"
              value={locationValues.lat}
              error={locationErrors.lat}
              onChange={handleLocationChange}
            />
            <FormField
              id="profile-longitude"
              name="lon"
              label="Longitudine"
              type="text"
              inputMode="decimal"
              placeholder="16.8719"
              value={locationValues.lon}
              error={locationErrors.lon}
              onChange={handleLocationChange}
            />
          </div>
          <div className={styles.consentField}>
            <input
              id="profile-location-consent"
              name="consent"
              type="checkbox"
              checked={locationValues.consent}
              aria-describedby={
                locationErrors.consent ? 'profile-location-consent-error' : undefined
              }
              aria-invalid={locationErrors.consent ? 'true' : undefined}
              onChange={handleLocationChange}
            />
            <label htmlFor="profile-location-consent">
              Acconsento al salvataggio della posizione precisa; ricerca e distanze pubbliche
              useranno una sua versione approssimata.
            </label>
          </div>
          {locationErrors.consent ? (
            <span className={styles.fieldError} id="profile-location-consent-error">
              {locationErrors.consent}
            </span>
          ) : null}
          {locationState.error ? (
            <p className={styles.formError} role="alert">
              {locationState.error}
            </p>
          ) : null}
          {locationState.success ? (
            <p className={styles.success} role="status">
              {locationState.success}
            </p>
          ) : null}
          <div className={styles.locationActions}>
            <button className={styles.submitButton} type="submit" disabled={locationState.pending}>
              {locationState.pending ? 'Salvataggio…' : 'Salva posizione'}
            </button>
            {values.locationConsentAt ? (
              <button
                className={styles.deleteLocationButton}
                type="button"
                disabled={locationState.pending}
                onClick={handleLocationDelete}
              >
                Revoca consenso ed elimina posizione
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </section>
  );
}
