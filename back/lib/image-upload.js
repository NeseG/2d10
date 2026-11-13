const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');

// Images importées (jetons de carte, images d'objets) : réduites dans le navigateur avant l'envoi (shrinkImage).
const TOKEN_LIBRARY_ROOT = path.join(__dirname, '..', 'uploads', 'token-library');
const ITEM_IMAGES_ROOT = path.join(__dirname, '..', 'uploads', 'item-images');
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Map([
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/jpeg', '.jpg'],
]);

/** Middleware multer : un champ `image` enregistré dans `root` sous un nom aléatoire (req.file.filename). */
function imageUploadMiddleware(root) {
  const upload = multer({
    storage: multer.diskStorage({
      destination: async (_req, _file, cb) => {
        try {
          await fs.mkdir(root, { recursive: true });
          cb(null, root);
        } catch (e) {
          cb(e);
        }
      },
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ALLOWED_MIME.get(file.mimetype)}`),
    }),
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
      else cb(new Error('Image non autorisée (PNG, WebP ou JPEG, 2 Mo max)'));
    },
  });

  return function (req, res, next) {
    upload.single('image')(req, res, (err) => {
      if (err) {
        const msg =
          err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
            ? 'Image trop volumineuse (2 Mo max)'
            : err.message || 'Fichier invalide';
        return res.status(400).json({ error: msg });
      }
      next();
    });
  };
}

const tokenImageUploadMiddleware = imageUploadMiddleware(TOKEN_LIBRARY_ROOT);
const itemImageUploadMiddleware = imageUploadMiddleware(ITEM_IMAGES_ROOT);
const tokenImageUrl = (fileKey) => `/uploads/token-library/${fileKey}`;

module.exports = { TOKEN_LIBRARY_ROOT, tokenImageUploadMiddleware, tokenImageUrl, itemImageUploadMiddleware };
