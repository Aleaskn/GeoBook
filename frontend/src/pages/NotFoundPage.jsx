import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <section className={styles.container}>
      <p className={styles.code}>404</p>
      <h1>Pagina non trovata</h1>
      <p>L’indirizzo richiesto non corrisponde a una pagina di GeoBook.</p>
      <Link to="/">Torna alla homepage</Link>
    </section>
  );
}
