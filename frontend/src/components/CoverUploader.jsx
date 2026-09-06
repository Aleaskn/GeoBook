import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { resolveApiAssetUrl } from '../api/api-client.js';
import styles from './CoverUploader.module.css';

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function CoverUploader({ currentCoverPath, bookTitle, selectedFile, error, onChange }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = window.URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => window.URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function handleChange(event) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      onChange(null, '');
      return;
    }

    if (!ALLOWED_COVER_TYPES.has(file.type)) {
      event.target.value = '';
      onChange(null, 'La copertina deve essere un file JPEG, PNG o WebP.');
      return;
    }

    if (file.size > MAX_COVER_BYTES) {
      event.target.value = '';
      onChange(null, 'La copertina non può superare 5 MiB.');
      return;
    }

    onChange(file, '');
  }

  const hasCurrentCover = currentCoverPath && !currentCoverPath.endsWith('/placeholder-cover.svg');
  const imageSource = previewUrl || resolveApiAssetUrl(currentCoverPath);
  const descriptionId = 'book-cover-help';
  const errorId = 'book-cover-error';

  return (
    <div className={styles.uploader}>
      <div className={styles.control}>
        <label htmlFor="book-cover">Copertina (facoltativa)</label>
        <input
          id="book-cover"
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
          aria-invalid={error ? 'true' : undefined}
          onChange={handleChange}
        />
        <p id={descriptionId}>JPEG, PNG o WebP, massimo 5 MiB.</p>
        {error ? (
          <span className={styles.error} id={errorId}>
            {error}
          </span>
        ) : null}
      </div>
      <figure className={styles.preview}>
        <img
          src={imageSource}
          alt={
            selectedFile
              ? `Anteprima della nuova copertina di ${bookTitle || 'questo libro'}`
              : hasCurrentCover
                ? `Copertina attuale di ${bookTitle || 'questo libro'}`
                : ''
          }
        />
        <figcaption>
          {selectedFile
            ? `Anteprima: ${selectedFile.name}`
            : hasCurrentCover
              ? 'Copertina attuale'
              : 'Nessuna copertina caricata'}
        </figcaption>
      </figure>
    </div>
  );
}

CoverUploader.propTypes = {
  currentCoverPath: PropTypes.string,
  bookTitle: PropTypes.string,
  selectedFile: PropTypes.instanceOf(window.File),
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
