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

function makeUniqueSpellIndex(baseIndex) {
  const safeBase = String(baseIndex || 'spell')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${safeBase}__copy__${suffix}`;
}

// GET /api/dnd5e/spells?limit=&page=&q=&level=&school=
router.get('/spells', authenticateToken, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const q = String(req.query.q || '').trim();
    const level = req.query.level != null ? Number.parseInt(req.query.level, 10) : null;
    const school = req.query.school ? String(req.query.school) : null;

    const and = [];
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { index: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (!Number.isNaN(level) && level != null) and.push({ level });
    if (school) and.push({ school });
    const where = and.length ? { AND: and } : {};

    const [items, total] = await Promise.all([
      prisma.dnd5eSpellImport.findMany({
        where,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        take: limit,
        skip,
        select: {
          id: true,
          index: true,
          name: true,
          level: true,
          school: true,
        },
      }),
      prisma.dnd5eSpellImport.count({ where }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erreur liste spells dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dnd5e/spells/:index
router.get('/spells/:index', authenticateToken, async (req, res) => {
  try {
    const { index } = req.params;
    const item = await prisma.dnd5eSpellImport.findUnique({ where: { index } });
    if (!item) return res.status(404).json({ error: 'Sort non trouvé' });
    res.json({ item });
  } catch (error) {
    console.error('Erreur détail spell dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/dnd5e/characters/:characterId/grimoire
// body: { spell_index: string, is_known?: boolean, is_prepared?: boolean, notes?: string }
router.post(
  '/characters/:characterId/grimoire',
  authenticateToken,
  requireRole(['admin', 'gm']),
  async (req, res) => {
    try {
      const characterId = Number.parseInt(req.params.characterId, 10);
      const spellIndex = String(req.body.spell_index || '').trim();
      const isKnown = req.body.is_known !== undefined ? Boolean(req.body.is_known) : true;
      const isPrepared = req.body.is_prepared !== undefined ? Boolean(req.body.is_prepared) : false;
      const notes = req.body.notes;

      if (Number.isNaN(characterId)) return res.status(400).json({ error: 'ID personnage invalide' });
      if (!spellIndex) return res.status(400).json({ error: 'spell_index requis' });

      const [character, imported] = await Promise.all([
        prisma.character.findFirst({ where: { id: characterId, isActive: true }, select: { id: true } }),
        prisma.dnd5eSpellImport.findUnique({ where: { index: spellIndex } }),
      ]);
      if (!character) return res.status(404).json({ error: 'Personnage non trouvé' });
      if (!imported) return res.status(404).json({ error: 'Sort non trouvé' });

      // 1) créer une copie locale (Spell) -> permet doublons de noms
      const spellCopy = await prisma.spell.create({
        data: {
          index: makeUniqueSpellIndex(imported.index),
          name: imported.name,
          level: imported.level,
          school: imported.school,
          castingTime: imported.castingTime,
          range: imported.range,
          components: imported.components,
          duration: imported.duration,
          description: imported.description,
          higherLevel: imported.higherLevel,
          ritual: imported.ritual,
          concentration: imported.concentration,
          source: 'dnd5e',
          raw: imported.raw,
        },
      });

      // 2) lier au grimoire (on autorise plusieurs entrées)
      const entry = await prisma.grimoire.create({
        data: {
          characterId,
          spellId: spellCopy.id,
          isKnown,
          isPrepared,
          notes,
        },
      });

      res.status(201).json({ spell: spellCopy, grimoire_entry: entry });
    } catch (error) {
      console.error('Erreur copie sort vers grimoire:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
);

module.exports = router;

