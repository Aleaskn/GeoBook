import PropTypes from 'prop-types';
import styles from './PageState.module.css';

export function PageState({ title, message, kind = 'status', action }) {
  const isError = kind === 'error';

  return (
    <section className={styles.container} aria-live={isError ? undefined : 'polite'}>
      <h1>{title}</h1>
      <p role={isError ? 'alert' : 'status'}>{message}</p>
      {action ? (
        <button className={styles.action} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </section>
  );
}

PageState.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  kind: PropTypes.oneOf(['status', 'error']),
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  }),
};
