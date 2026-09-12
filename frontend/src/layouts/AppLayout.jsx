import { useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import styles from './AppLayout.module.css';

function navigationClass({ isActive }) {
  return isActive ? `${styles.navigationLink} ${styles.active}` : styles.navigationLink;
}

export function AppLayout() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const mainRef = useRef(null);
  const [logoutState, setLogoutState] = useState({ pending: false, error: '' });

  function handleSkipLink() {
    window.requestAnimationFrame(() => mainRef.current?.focus());
  }

  async function handleLogout() {
    setLogoutState({ pending: true, error: '' });

    try {
      await logout();
      // Il layout resta montato tra logout e login: azzeriamo lo stato prima che il pulsante ricompaia.
      setLogoutState({ pending: false, error: '' });
      navigate('/login', { replace: true, state: { notice: 'Disconnessione completata.' } });
    } catch (error) {
      setLogoutState({
        pending: false,
        error: error.message ?? 'Non è stato possibile terminare la sessione.',
      });
    }
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content" onClick={handleSkipLink}>
        Salta al contenuto principale
      </a>
      <header className={styles.header}>
        <nav className={styles.navigation} aria-label="Navigazione principale">
          <Link className={styles.brand} to="/">
            GeoBook
          </Link>
          <div className={styles.links}>
            <NavLink className={navigationClass} to="/" end>
              Home
            </NavLink>
            <NavLink className={navigationClass} to="/search">
              Cerca
            </NavLink>
            <NavLink className={navigationClass} to="/map">
              Mappa
            </NavLink>
            {status === 'authenticated' ? (
              <>
                <NavLink className={navigationClass} to="/my-library">
                  Biblioteca
                </NavLink>
                <NavLink className={navigationClass} to="/requests">
                  Richieste
                </NavLink>
                <NavLink className={navigationClass} to="/profile">
                  Profilo
                </NavLink>
                {user.role === 'ADMIN' ? (
                  <NavLink className={navigationClass} to="/admin">
                    Dashboard
                  </NavLink>
                ) : null}
                <span className={styles.userName}>{user.name}</span>
                <button
                  className={styles.logoutButton}
                  type="button"
                  disabled={logoutState.pending}
                  onClick={handleLogout}
                >
                  {logoutState.pending ? 'Uscita…' : 'Esci'}
                </button>
              </>
            ) : null}
            {status === 'anonymous' || status === 'error' ? (
              <>
                <NavLink className={navigationClass} to="/login">
                  Accedi
                </NavLink>
                <NavLink className={navigationClass} to="/register">
                  Registrati
                </NavLink>
              </>
            ) : null}
            {status === 'loading' ? (
              <span className={styles.sessionStatus} role="status">
                Verifica sessione…
              </span>
            ) : null}
          </div>
        </nav>
        {logoutState.error ? (
          <p className={styles.headerError} role="alert">
            {logoutState.error}
          </p>
        ) : null}
      </header>
      <main id="main-content" ref={mainRef} className={styles.main} tabIndex="-1">
        <Outlet />
      </main>
    </div>
  );
}
