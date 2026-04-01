const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function makeUniqueItemIndex(baseIndex) {
  const safeBase = String(baseIndex || 'item')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${safeBase}__magic__${suffix}`;
}

function parsePagination(query) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function parseMagicSort(query) {
  const sortBy = String(query.sortBy || 'name').toLowerCase();
  const sortDirRaw = String(query.sortDir || 'asc').toLowerCase();
  const sortDir = sortDirRaw === 'desc' ? 'desc' : 'asc';

  if (sortBy === 'rarity') return { orderBy: [{ rarity: sortDir }, { name: 'asc' }] };
  if (sortBy === 'category') return { orderBy: [{ categoryName: sortDir }, { name: 'asc' }] };
  return { orderBy: [{ name: sortDir }] };
}

function buildMagicWhere(query) {
  const where = {};
  const and = [];

  if (query.rarity && String(query.rarity).trim()) {
    and.push({ rarity: String(query.rarity).trim() });
  }
  if (query.category && String(query.category).trim()) {
    and.push({ categoryIndex: String(query.category).trim() });
  }
  if (query.q) {
    const q = String(query.q).trim();
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { index: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
  }

  if (and.length) where.AND = and;
  return where;
}

/** Mappe equipment_category SRD → enum Prisma Item.type */
function mapMagicCategoryToItemType(categoryIndex) {
  const c = String(categoryIndex || '').toLowerCase();
  if (c === 'weapon') return 'weapon';
  if (c === 'armor') return 'armor';
  if (c === 'potion' || c === 'scroll') return 'consumable';
  if (c === 'ammunition') return 'ammunition';
  if (c === 'ring' || c === 'rod' || c === 'staff' || c === 'wand' || c === 'wondrous-items') return 'gear';
  return 'other';
}

// GET /api/dnd5e/magic-items?limit=&page=&q=&rarity=&category=&sortBy=&sortDir=
router.get('/magic-items', authenticateToken, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const where = buildMagicWhere(req.query);
    const { orderBy } = parseMagicSort(req.query);

    const [items, total] = await Promise.all([
      prisma.dnd5eMagicItem.findMany({
        where,
        orderBy,
        take: limit,
        skip,
        select: {
          id: true,
          index: true,
          name: true,
          categoryIndex: true,
          categoryName: true,
          rarity: true,
        },
      }),
      prisma.dnd5eMagicItem.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Erreur liste magic-items dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dnd5e/magic-items/:index
router.get('/magic-items/:index', authenticateToken, async (req, res) => {
  try {
    const { index } = req.params;
    const row = await prisma.dnd5eMagicItem.findUnique({ where: { index } });
    if (!row) return res.status(404).json({ error: 'Objet magique non trouvé' });
    res.json({ magic_item: row });
  } catch (error) {
    console.error('Erreur détail magic-item dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/dnd5e/characters/:characterId/inventory/magic-item
// body: { magic_item_id: number, quantity?: number }
router.post(
  '/characters/:characterId/inventory/magic-item',
  authenticateToken,
  requireRole(['admin', 'gm']),
  async (req, res) => {
    try {
      const characterId = Number.parseInt(req.params.characterId, 10);
      const magicItemId = Number.parseInt(req.body.magic_item_id, 10);
      const quantity = req.body.quantity == null ? 1 : Number.parseInt(req.body.quantity, 10);

      if (Number.isNaN(characterId)) return res.status(400).json({ error: 'ID personnage invalide' });
      if (Number.isNaN(magicItemId)) return res.status(400).json({ error: 'magic_item_id requis' });
      if (Number.isNaN(quantity) || quantity < 0) return res.status(400).json({ error: 'Quantité invalide' });

      const [character, magicItem] = await Promise.all([
        prisma.character.findFirst({ where: { id: characterId, isActive: true }, select: { id: true } }),
        prisma.dnd5eMagicItem.findUnique({ where: { id: magicItemId } }),
      ]);
      if (!character) return res.status(404).json({ error: 'Personnage non trouvé' });
      if (!magicItem) return res.status(404).json({ error: 'Objet magique non trouvé' });

      const itemType = mapMagicCategoryToItemType(magicItem.categoryIndex);

      const mirroredItem = await prisma.item.create({
        data: {
          index: makeUniqueItemIndex(magicItem.index),
          name: magicItem.name,
          type: itemType,
          category: magicItem.categoryName,
          subcategory: magicItem.rarity,
          cost: null,
          weight: null,
          description: magicItem.description,
          damage: null,
          damageType: null,
          range: null,
          armorClass: null,
          stealthDisadvantage: null,
          properties: {
            dnd5e_magic_item: true,
            source_index: magicItem.index,
            rarity: magicItem.rarity,
            categoryIndex: magicItem.categoryIndex,
            categoryName: magicItem.categoryName,
            variant: magicItem.variant,
            variants: magicItem.variants,
            image: magicItem.image,
          },
          raw: magicItem.raw,
        },
      });

      const inv = await prisma.inventory.create({
        data: { characterId, itemId: mirroredItem.id, quantity },
      });

      res.status(201).json({
        inventory_item: inv,
        item: mirroredItem,
        magic_item: magicItem,
      });
    } catch (error) {
      console.error('Erreur ajout inventaire magic-item dnd5e:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
);

module.exports = router;
