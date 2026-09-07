import PropTypes from 'prop-types';
import { resolveApiAssetUrl } from '../api/api-client.js';
import styles from './SearchResultCard.module.css';

export function SearchResultCard({ book }) {
  const hasCover = book.thumbnailPath && !book.thumbnailPath.endsWith('/placeholder-cover.svg');

  return (
    <article className={styles.card}>
      <img
        className={styles.cover}
        src={resolveApiAssetUrl(book.thumbnailPath)}
        alt={hasCover ? `Copertina di ${book.title}` : ''}
      />
      <div className={styles.content}>
        <p className={styles.author}>{book.author}</p>
        <h3>{book.title}</h3>
        <dl className={styles.metadata}>
          <div>
            <dt>Anno</dt>
            <dd>{book.publicationYear}</dd>
          </div>
          <div>
            <dt>Zona</dt>
            <dd>{book.publicArea}</dd>
          </div>
        </dl>
        <div className={styles.categories} aria-label="Categorie">
          {book.categories.length > 0 ? (
            book.categories.map((category) => <span key={category.id}>{category.name}</span>)
          ) : (
            <span className={styles.noCategory}>Nessuna categoria</span>
          )}
        </div>
      </div>
    </article>
  );
}

SearchResultCard.propTypes = {
  book: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    author: PropTypes.string.isRequired,
    publicationYear: PropTypes.number.isRequired,
    thumbnailPath: PropTypes.string.isRequired,
    publicArea: PropTypes.string.isRequired,
    categories: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    ).isRequired,
  }).isRequired,
};
