const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Liste des utilisateurs (admin/gm) pour assigner un propriétaire de personnage
router.get('/', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: { username: 'asc' },
    });

    res.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role_name: u.role?.name ?? null,
        is_active: u.isActive,
        created_at: u.createdAt,
        updated_at: u.updatedAt,
      })),
      count: users.length,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const MAX_DICE_FAVORITES = 30;

function sanitizeDiceFavorites(raw) {
  if (!Array.isArray(raw) || raw.length > MAX_DICE_FAVORITES) return null;
  const out = [];
  for (const f of raw) {
    const id = typeof f?.id === 'string' ? f.id.trim().slice(0, 40) : '';
    const name = typeof f?.name === 'string' ? f.name.trim().slice(0, 40) : '';
    const notation = typeof f?.notation === 'string' ? f.notation.trim().slice(0, 64) : '';
    const label = typeof f?.label === 'string' ? f.label.trim().slice(0, 200) : '';
    if (!id || !name || !notation) return null;
    out.push(label ? { id, name, notation, label } : { id, name, notation });
  }
  return out;
}

// Jets favoris de l'utilisateur connecté (session live)
router.get('/me/dice-favorites', authenticateToken, async (req, res) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { diceFavorites: true } });
    res.json({ success: true, favorites: Array.isArray(u?.diceFavorites) ? u.diceFavorites : [] });
  } catch (error) {
    console.error('Erreur GET dice-favorites:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/me/dice-favorites', authenticateToken, async (req, res) => {
  try {
    const favorites = sanitizeDiceFavorites(req.body?.favorites);
    if (!favorites) {
      return res.status(400).json({ error: `Favoris invalides (max ${MAX_DICE_FAVORITES}, nom et notation requis)` });
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { diceFavorites: favorites } });
    res.json({ success: true, favorites });
  } catch (error) {
    console.error('Erreur PUT dice-favorites:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

