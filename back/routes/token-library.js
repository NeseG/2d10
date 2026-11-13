// Bibliothèque de jetons commune : lecture pour tout utilisateur connecté, import et suppression par MJ / admin.
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { TOKEN_LIBRARY_ROOT, tokenImageUploadMiddleware, tokenImageUrl } = require('../lib/image-upload');

const router = express.Router();
const SIZES = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);

const format = (t) => ({ id: t.id, name: t.name, category: t.category, size: t.size, scale: t.scale, url: tokenImageUrl(t.fileKey), source_path: t.sourcePath });
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const removeFile = (key) => fs.unlink(path.join(TOKEN_LIBRARY_ROOT, path.basename(key))).catch(() => {});

// Liste complète (quelques milliers de lignes courtes au plus) : le filtre se fait côté client.
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const rows = await prisma.tokenImage.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json({ success: true, tokens: rows.map(format) });
  } catch (error) {
    console.error('Erreur liste bibliothèque de jetons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/** Ajout ou remplacement (même `source_path`) d'une image. Champs : image, name, category, size, scale, source_path. */
router.post('/', authenticateToken, requireRole(['admin', 'gm']), tokenImageUploadMiddleware, async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Image manquante' });
  try {
    const name = text(req.body?.name, 120);
    const sourcePath = text(req.body?.source_path, 500) || `upload/${file.filename}`;
    const size = SIZES.has(req.body?.size) ? req.body.size : 'medium';
    const category = text(req.body?.category, 120) || null;
    const scale = Math.min(5, Math.max(0.5, Number.parseFloat(req.body?.scale) || 1));
    if (!name) {
      await removeFile(file.filename);
      return res.status(400).json({ error: 'Nom manquant' });
    }
    const prev = await prisma.tokenImage.findUnique({ where: { sourcePath } });
    const row = await prisma.tokenImage.upsert({
      where: { sourcePath },
      create: { name, category, size, scale, sourcePath, fileKey: file.filename },
      update: { name, category, size, scale, fileKey: file.filename },
    });
    if (prev && prev.fileKey !== file.filename) await removeFile(prev.fileKey);
    res.json({ success: true, token: format(row) });
  } catch (error) {
    await removeFile(file.filename);
    console.error('Erreur import jeton:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const row = await prisma.tokenImage.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: 'Jeton introuvable' });
    await prisma.tokenImage.delete({ where: { id } });
    await removeFile(row.fileKey);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression jeton:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
