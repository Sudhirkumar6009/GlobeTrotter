const ImageKit = require('imagekit');
require('dotenv').config();

const hasImageKitConfig = Boolean(
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT
);

let imagekit = null;
if (hasImageKitConfig) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });
  // eslint-disable-next-line no-console
  console.log('[ImageKit] Initialized');
} else {
  // eslint-disable-next-line no-console
  console.warn('[ImageKit] Env vars missing (IMAGEKIT_PUBLIC_KEY / PRIVATE_KEY / URL_ENDPOINT). Using fallback stub; uploads will return placeholder URL.');
}

/**
 * Uploads a file buffer to ImageKit.
 * @param {Buffer} buffer - The image buffer.
 * @param {string} fileName - The name for the uploaded file.
 * @param {string} folder - The folder path in ImageKit.
 * @returns {Promise<string>} - Resolves with the uploaded image URL.
 */
function uploadToImageKit(buffer, fileName, folder = '/') {
  if (!hasImageKitConfig || !imagekit) {
    const placeholder = process.env.FALLBACK_IMAGE_BASE_URL || 'https://placehold.co/800x500?text=Image+Unavailable';
    return Promise.resolve(placeholder);
  }
  return new Promise((resolve, reject) => {
    imagekit.upload(
      {
        file: buffer,
        fileName,
        folder,
        useUniqueFileName: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.url);
      }
    );
  });
}

/**
 * Delete an ImageKit file when only the full URL is available.
 * Uses URL parsing (independent of configured urlEndpoint) to derive path & filename.
 */
async function deleteImageByUrl(fileUrl) {
  if (!fileUrl) throw new Error('URL required');
  let relative;
  try {
    const u = new URL(fileUrl);
    relative = u.pathname.replace(/^\/+/, ''); // e.g. "trips/temp/123_name.jpg"
  } catch {
    throw new Error('Invalid URL');
  }
  const fileName = relative.split('/').pop();

  // Search by filename; filter by matching filePath ending
  if (!hasImageKitConfig || !imagekit) {
    return { skipped: true };
  }
  const results = await imagekit.listFiles({ searchQuery: `name="${fileName}"`, limit: 100 });

  const match = results.find(f =>
    f.filePath.replace(/^\/+/, '') === relative || // exact
    relative.endsWith(f.name) // fallback
  );

  if (!match) throw new Error('File not found for given URL');

  await new Promise((resolve, reject) => {
    imagekit.deleteFile(match.fileId, (err) => (err ? reject(err) : resolve()));
  });

  return { deleted: true, fileId: match.fileId };
}

module.exports = { uploadToImageKit, deleteImageByUrl };
