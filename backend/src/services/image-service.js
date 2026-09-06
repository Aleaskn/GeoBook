import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { AppError } from '../utils/app-error.js';

const FORMAT_MIME_TYPES = new Map([
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);
const GENERATED_IMAGE_PATH = /^\/uploads\/(covers|thumbnails)\/([0-9a-f-]{36}\.webp)$/i;

function invalidCoverError() {
  return new AppError({
    statusCode: 415,
    code: 'INVALID_COVER_IMAGE',
    message: 'Il file caricato non contiene un’immagine valida.',
    details: [{ field: 'cover', message: 'Scegli un file JPEG, PNG o WebP valido.' }],
  });
}

export function createImageService({ uploadDir, uuidFactory = randomUUID } = {}) {
  if (!uploadDir) {
    throw new TypeError('createImageService richiede uploadDir.');
  }

  const storageRoot = path.resolve(uploadDir);
  const coverDirectory = path.join(storageRoot, 'covers');
  const thumbnailDirectory = path.join(storageRoot, 'thumbnails');

  function resolveGeneratedPath(publicPath) {
    const match = GENERATED_IMAGE_PATH.exec(publicPath ?? '');

    if (!match) {
      return null;
    }

    const directory = match[1] === 'covers' ? coverDirectory : thumbnailDirectory;
    const filePath = path.resolve(directory, match[2]);

    // Il controllo sulla directory resta una seconda difesa oltre al nome casuale e alla regex.
    return path.dirname(filePath) === directory ? filePath : null;
  }

  async function deleteImagePaths(publicPaths) {
    const filePaths = [...new Set(publicPaths.map(resolveGeneratedPath).filter(Boolean))];
    await Promise.all(filePaths.map((filePath) => rm(filePath, { force: true })));
  }

  return {
    async processCover(file) {
      if (!file) {
        return null;
      }

      let metadata;

      try {
        const image = sharp(file.buffer, { failOn: 'error' });
        metadata = await image.metadata();
        // stats() forza la decodifica dei pixel e intercetta file con un'intestazione valida ma corrotti.
        await image.stats();
      } catch {
        throw invalidCoverError();
      }

      if (FORMAT_MIME_TYPES.get(metadata.format) !== file.mimetype) {
        throw invalidCoverError();
      }

      await Promise.all([
        mkdir(coverDirectory, { recursive: true }),
        mkdir(thumbnailDirectory, { recursive: true }),
      ]);

      const fileName = `${uuidFactory()}.webp`;
      const coverFilePath = path.join(coverDirectory, fileName);
      const thumbnailFilePath = path.join(thumbnailDirectory, fileName);
      const imagePaths = {
        coverPath: `/uploads/covers/${fileName}`,
        thumbnailPath: `/uploads/thumbnails/${fileName}`,
      };

      try {
        await sharp(file.buffer, { failOn: 'error' })
          .rotate()
          .resize(1200, 1800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(coverFilePath);
        await sharp(file.buffer, { failOn: 'error' })
          .rotate()
          .resize(240, 360, { fit: 'cover' })
          .webp({ quality: 78 })
          .toFile(thumbnailFilePath);
      } catch (error) {
        await deleteImagePaths(Object.values(imagePaths));
        throw error;
      }

      return imagePaths;
    },

    deleteBookImages(book) {
      return deleteImagePaths([book?.coverPath, book?.thumbnailPath]);
    },
  };
}
