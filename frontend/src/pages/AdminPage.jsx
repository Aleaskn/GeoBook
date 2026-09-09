import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getAdminStats, getRecentActivity } from '../api/admin-api.js';
import { AdminCharts } from '../components/AdminCharts.jsx';
import { PageState } from '../components/PageState.jsx';
import styles from './AdminPage.module.css';

const STATUS_LABELS = {
  PENDING: 'In attesa',
  ACCEPTED: 'Accettata',
  REJECTED: 'Rifiutata',
  RETURNED: 'Restituita',
  CANCELLED: 'Annullata',
};
const ROLE_LABELS = {
  USER: 'Utente',
  ADMIN: 'Amministratore',
};

function formatDate(value) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function RankingTables({ stats }) {
  return (
    <section className={styles.rankings} aria-label="Classifiche del catalogo">
      <article className={styles.panel}>
        <h2>Categorie con più libri</h2>
        {stats.topCategories.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">Libri</th>
              </tr>
            </thead>
            <tbody>
              {stats.topCategories.map((category) => (
                <tr key={category.id}>
                  <th scope="row">{category.name}</th>
                  <td>{category.booksCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>Nessuna categoria associata ai libri.</p>
        )}
      </article>

      <article className={styles.panel}>
        <h2>Libri più visualizzati</h2>
        {stats.mostViewedBooks.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Libro</th>
                <th scope="col">Visualizzazioni</th>
              </tr>
            </thead>
            <tbody>
              {stats.mostViewedBooks.map((book) => (
                <tr key={book.id}>
                  <th scope="row">
                    <Link to={`/books/${book.id}`}>{book.title}</Link>
                    <span>{book.author}</span>
                  </th>
                  <td>{book.viewsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>Nessun libro è stato ancora visualizzato.</p>
        )}
      </article>
    </section>
  );
}

RankingTables.propTypes = {
  stats: PropTypes.shape({
    topCategories: PropTypes.array.isRequired,
    mostViewedBooks: PropTypes.array.isRequired,
  }).isRequired,
};

function RecentActivity({ activity }) {
  return (
    <section className={styles.activity} aria-labelledby="recent-activity-title">
      <h2 id="recent-activity-title">Attività recente</h2>
      <div className={styles.activityGrid}>
        <article className={styles.activityCard}>
          <h3>Utenti</h3>
          {activity.users.length > 0 ? (
            <ul>
              {activity.users.map((user) => (
                <li key={user.id}>
                  <strong>{user.name}</strong>
                  <span>
                    {ROLE_LABELS[user.role]} · {user.publicArea}, {user.city} ·{' '}
                    {formatDate(user.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Nessun utente recente.</p>
          )}
        </article>

        <article className={styles.activityCard}>
          <h3>Libri</h3>
          {activity.books.length > 0 ? (
            <ul>
              {activity.books.map((book) => (
                <li key={book.id}>
                  <Link to={`/books/${book.id}`}>{book.title}</Link>
                  <span>
                    {book.ownerName} · {book.available ? 'Disponibile' : 'Non disponibile'} ·{' '}
                    {formatDate(book.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Nessun libro recente.</p>
          )}
        </article>

        <article className={styles.activityCard}>
          <h3>Richieste</h3>
          {activity.loanRequests.length > 0 ? (
            <ul>
              {activity.loanRequests.map((request) => (
                <li key={request.id}>
                  <Link to={`/books/${request.book.id}`}>{request.book.title}</Link>
                  <span>
                    {request.requesterName} → {request.ownerName} · {STATUS_LABELS[request.status]}{' '}
                    · {formatDate(request.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Nessuna richiesta recente.</p>
          )}
        </article>
      </div>
    </section>
  );
}

RecentActivity.propTypes = {
  activity: PropTypes.shape({
    users: PropTypes.array.isRequired,
    books: PropTypes.array.isRequired,
    loanRequests: PropTypes.array.isRequired,
  }).isRequired,
};

export function AdminPage() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    status: 'loading',
    stats: null,
    activity: null,
    error: '',
  });

  useEffect(() => {
    const controller = new window.AbortController();

    async function loadDashboard() {
      setState({ status: 'loading', stats: null, activity: null, error: '' });

      try {
        const [stats, activity] = await Promise.all([
          getAdminStats({ signal: controller.signal }),
          getRecentActivity({ signal: controller.signal }),
        ]);
        setState({ status: 'ready', stats, activity, error: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({
            status: 'error',
            stats: null,
            activity: null,
            error: error.message ?? 'Non è stato possibile caricare la dashboard.',
          });
        }
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [revision]);

  if (state.status === 'loading') {
    return <PageState title="Dashboard amministrativa" message="Caricamento delle statistiche…" />;
  }

  if (state.status === 'error') {
    return (
      <PageState
        title="Dashboard non disponibile"
        message={state.error}
        kind="error"
        action={{ label: 'Riprova', onClick: () => setRevision((current) => current + 1) }}
      />
    );
  }

  const { stats, activity } = state;

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Amministrazione</p>
        <h1>Dashboard amministrativa</h1>
        <p>Una sintesi dei dati operativi di GeoBook, senza informazioni personali superflue.</p>
      </header>

      <dl className={styles.kpis} aria-label="Indicatori principali">
        <div>
          <dt>Utenti</dt>
          <dd>{stats.usersCount}</dd>
        </div>
        <div>
          <dt>Libri</dt>
          <dd>{stats.booksCount}</dd>
        </div>
        <div>
          <dt>Richieste totali</dt>
          <dd>{stats.loanRequestsCount}</dd>
        </div>
        <div>
          <dt>Prestiti completati</dt>
          <dd>{stats.completedLoansCount}</dd>
        </div>
      </dl>

      <AdminCharts
        loanRequestsByStatus={stats.loanRequestsByStatus}
        loanRequestsByMonth={stats.loanRequestsByMonth}
      />
      <RankingTables stats={stats} />
      <RecentActivity activity={activity} />
    </div>
  );
}
