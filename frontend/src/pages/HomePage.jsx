import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import styles from './HomePage.module.css';

export function HomePage() {
  const { status, user } = useAuth();

  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>La tua biblioteca, vicino a te</p>
      <h1>Condividi storie con la tua comunità</h1>
      <p className={styles.introduction}>
        GeoBook ti aiuta a organizzare i tuoi libri e a metterli in circolo nel rispetto della tua
        privacy.
      </p>
      <div className={styles.actions}>
        {status === 'authenticated' ? (
          <Link className={styles.primaryAction} to="/my-library">
            Apri la tua biblioteca{user?.name ? `, ${user.name}` : ''}
          </Link>
        ) : (
          <>
            <Link className={styles.primaryAction} to="/register">
              Crea un account
            </Link>
            <Link className={styles.secondaryAction} to="/login">
              Ho già un account
            </Link>
          </>
        )}
      </div>
      <p className={styles.scopeNote}>
        In questa versione puoi cercare nel catalogo condiviso, gestire il profilo e organizzare i
        libri della tua biblioteca personale.
      </p>
    </section>
  );
}
