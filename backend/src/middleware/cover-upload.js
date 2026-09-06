import multer from 'multer';
import { AppError } from '../utils/app-error.js';

const ALLOWED_COVER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function createCoverUpload({ maxUploadBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxUploadBytes,
      files: 1,
      fields: 20,
    },
    fileFilter(_request, file, callback) {
      if (!ALLOWED_COVER_MIME_TYPES.has(file.mimetype)) {
        callback(
          new AppError({
            statusCode: 415,
            code: 'UNSUPPORTED_COVER_TYPE',
            message: 'La copertina deve essere un file JPEG, PNG o WebP.',
            details: [{ field: 'cover', message: 'Formato copertina non supportato.' }],
          }),
        );
        return;
      }

      callback(null, true);
    },
  }).single('cover');
}
