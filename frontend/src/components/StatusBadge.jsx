import PropTypes from 'prop-types';
import styles from './StatusBadge.module.css';

const STATUS_LABELS = {
  PENDING: 'In attesa',
  ACCEPTED: 'Accettata',
  REJECTED: 'Rifiutata',
  CANCELLED: 'Annullata',
  RETURNED: 'Restituito',
};

export function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status.toLowerCase()]}`}>
      Stato: {STATUS_LABELS[status]}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(Object.keys(STATUS_LABELS)).isRequired,
};
