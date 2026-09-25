const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function parsePagination(query) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

// GET /api/dnd5e/monsters?limit=&page=&q=&type=&challenge_rating=
router.get('/monsters', authenticateToken, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const q = String(req.query.q || '').trim();
    const type = req.query.type ? String(req.query.type) : null;
    const challengeRating = req.query.challenge_rating ? String(req.query.challenge_rating) : null;

    const and = [];
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (type) and.push({ type });
    if (challengeRating) and.push({ challengeRating });
    const where = and.length ? { AND: and } : {};

    const [items, total] = await Promise.all([
      prisma.dndMonster.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        take: limit,
        skip,
        select: {
          id: true,
          slug: true,
          name: true,
          nameFr: true,
          size: true,
          type: true,
          typeFr: true,
          challengeRating: true,
          xp: true,
        },
      }),
      prisma.dndMonster.count({ where }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erreur liste monstres dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dnd5e/monsters/:slug
router.get('/monsters/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const item = await prisma.dndMonster.findUnique({ where: { slug } });
    if (!item) return res.status(404).json({ error: 'Monstre non trouvé' });
    res.json({ item });
  } catch (error) {
    console.error('Erreur détail monstre dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/dnd5e/monsters/:slug — retire une entrée du catalogue importé (admin / gm)
router.delete(
  '/monsters/:slug',
  authenticateToken,
  requireRole(['admin', 'gm']),
  async (req, res) => {
    try {
      const { slug } = req.params;
      const existing = await prisma.dndMonster.findUnique({ where: { slug } });
      if (!existing) return res.status(404).json({ error: 'Monstre non trouvé' });
      await prisma.dndMonster.delete({ where: { slug } });
      res.status(204).send();
    } catch (error) {
      console.error('Erreur suppression monstre dnd5e import:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
);

module.exports = router;
