import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { resolveApiAssetUrl } from '../api/api-client.js';
import { StatusBadge } from './StatusBadge.jsx';
import styles from './LoanRequestCard.module.css';

function formatDate(value) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function StatusActions({ direction, status, pending, onTransition }) {
  if (direction === 'incoming' && status === 'PENDING') {
    return (
      <div className={styles.actions} aria-label="Azioni sulla richiesta">
        <button type="button" disabled={pending} onClick={() => onTransition('ACCEPTED')}>
          Accetta
        </button>
        <button
          className={styles.secondaryAction}
          type="button"
          disabled={pending}
          onClick={() => onTransition('REJECTED')}
        >
          Rifiuta
        </button>
      </div>
    );
  }

  if (direction === 'incoming' && status === 'ACCEPTED') {
    return (
      <div className={styles.actions} aria-label="Azioni sulla richiesta">
        <button type="button" disabled={pending} onClick={() => onTransition('RETURNED')}>
          Conferma restituzione
        </button>
      </div>
    );
  }

  if (direction === 'outgoing' && status === 'PENDING') {
    return (
      <div className={styles.actions} aria-label="Azioni sulla richiesta">
        <button
          className={styles.secondaryAction}
          type="button"
          disabled={pending}
          onClick={() => onTransition('CANCELLED')}
        >
          Annulla richiesta
        </button>
      </div>
    );
  }

  return null;
}

StatusActions.propTypes = {
  direction: PropTypes.oneOf(['incoming', 'outgoing']).isRequired,
  status: PropTypes.string.isRequired,
  pending: PropTypes.bool.isRequired,
  onTransition: PropTypes.func.isRequired,
};

export function LoanRequestCard({ loanRequest, direction, pending, onTransition }) {
  const counterpart = direction === 'incoming' ? loanRequest.requester : loanRequest.owner;

  return (
    <article className={styles.card} aria-labelledby={`loan-request-${loanRequest.id}`}>
      <img
        className={styles.cover}
        src={resolveApiAssetUrl(loanRequest.book.thumbnailPath)}
        alt=""
      />
      <div className={styles.content}>
        <StatusBadge status={loanRequest.status} />
        <h3 id={`loan-request-${loanRequest.id}`}>
          <Link to={`/books/${loanRequest.book.id}`}>{loanRequest.book.title}</Link>
        </h3>
        <p className={styles.author}>{loanRequest.book.author}</p>
        <dl className={styles.details}>
          <div>
            <dt>{direction === 'incoming' ? 'Richiedente' : 'Proprietario'}</dt>
            <dd>{counterpart.name}</dd>
          </div>
          <div>
            <dt>Inviata</dt>
            <dd>{formatDate(loanRequest.createdAt)}</dd>
          </div>
        </dl>
        {loanRequest.message ? (
          <p className={styles.message}>
            <span>Messaggio</span>
            {loanRequest.message}
          </p>
        ) : null}
        <StatusActions
          direction={direction}
          status={loanRequest.status}
          pending={pending}
          onTransition={(status) => onTransition(loanRequest, status)}
        />
      </div>
    </article>
  );
}

LoanRequestCard.propTypes = {
  loanRequest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'RETURNED'])
      .isRequired,
    message: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    book: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      author: PropTypes.string.isRequired,
      thumbnailPath: PropTypes.string.isRequired,
    }).isRequired,
    requester: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired,
    owner: PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired })
      .isRequired,
  }).isRequired,
  direction: PropTypes.oneOf(['incoming', 'outgoing']).isRequired,
  pending: PropTypes.bool.isRequired,
  onTransition: PropTypes.func.isRequired,
};
