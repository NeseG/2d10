const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');

const CHAT_UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'session-chat');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
]);

function extForMime(mime) {
  return ALLOWED_MIME.get(mime) || null;
}

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      if (Number.isNaN(sessionId)) {
        cb(new Error('Session invalide'));
        return;
      }
      const dir = path.join(CHAT_UPLOAD_ROOT, String(sessionId));
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (_req, file, cb) => {
    const ext = extForMime(file.mimetype) || '.img';
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Image non autorisée (JPEG, PNG, GIF ou WebP, max 5 Mo)'));
  },
});

function chatImageUploadMiddleware(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const msg =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'Image trop volumineuse (5 Mo max)'
          : err.message || 'Fichier invalide';
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

module.exports = {
  CHAT_UPLOAD_ROOT,
  chatImageUploadMiddleware,
  extForMime,
};
