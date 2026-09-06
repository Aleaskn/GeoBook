import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { resolveApiAssetUrl } from '../api/api-client.js';
import styles from './BookCard.module.css';

export function BookCard({ book, busy, pendingAction, onToggleAvailability, onDelete }) {
  const titleId = 'book-' + book.id + '-title';
  const hasCover = book.thumbnailPath && !book.thumbnailPath.endsWith('/placeholder-cover.svg');

  return (
    <article className={styles.card} aria-labelledby={titleId} aria-busy={busy}>
      <img
        className={styles.cover}
        src={resolveApiAssetUrl(book.thumbnailPath)}
        alt={hasCover ? `Copertina di ${book.title}` : ''}
      />
      <div className={styles.heading}>
        <div>
          <p className={styles.author}>{book.author}</p>
          <h2 id={titleId}>{book.title}</h2>
        </div>
        <span className={book.available ? styles.available : styles.unavailable}>
          {book.available ? 'Disponibile' : 'Non disponibile'}
        </span>
      </div>
      <dl className={styles.metadata}>
        <div>
          <dt>Anno</dt>
          <dd>{book.publicationYear}</dd>
        </div>
        {book.isbn ? (
          <div>
            <dt>ISBN</dt>
            <dd>{book.isbn}</dd>
          </div>
        ) : null}
      </dl>
      {book.description ? <p className={styles.description}>{book.description}</p> : null}
      <div className={styles.categories} aria-label="Categorie">
        {book.categories.length > 0 ? (
          book.categories.map((category) => <span key={category.id}>{category.name}</span>)
        ) : (
          <span className={styles.noCategory}>Nessuna categoria</span>
        )}
      </div>
      <div className={styles.actions}>
        <Link className={styles.editLink} to={'/books/' + book.id + '/edit'}>
          Modifica
        </Link>
        <button
          className={styles.availabilityButton}
          type="button"
          disabled={busy}
          onClick={() => onToggleAvailability(book)}
        >
          {pendingAction === 'availability'
            ? 'Aggiornamento…'
            : book.available
              ? 'Segna come non disponibile'
              : 'Segna come disponibile'}
        </button>
        <button
          className={styles.deleteButton}
          type="button"
          disabled={busy}
          onClick={() => onDelete(book)}
        >
          {pendingAction === 'delete' ? 'Eliminazione…' : 'Elimina'}
        </button>
      </div>
    </article>
  );
}

BookCard.propTypes = {
  book: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    author: PropTypes.string.isRequired,
    publicationYear: PropTypes.number.isRequired,
    description: PropTypes.string,
    isbn: PropTypes.string,
    available: PropTypes.bool.isRequired,
    thumbnailPath: PropTypes.string,
    categories: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    ).isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  pendingAction: PropTypes.oneOf(['availability', 'delete']),
  onToggleAvailability: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
