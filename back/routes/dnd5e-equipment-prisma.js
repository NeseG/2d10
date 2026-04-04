const express = require('express');
const prisma = require('../lib/prisma');
const { nextInventorySortOrder } = require('../lib/next-inventory-sort-order');
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
  return `${safeBase}__copy__${suffix}`;
}

function parsePagination(query) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function parseSort(query) {
  const sortBy = String(query.sortBy || 'name');
  const sortDirRaw = String(query.sortDir || 'asc').toLowerCase();
  const sortDir = sortDirRaw === 'desc' ? 'desc' : 'asc';

  const allowed = new Set(['name', 'weight', 'type', 'category']);
  const field = allowed.has(sortBy) ? sortBy : 'name';

  if (field === 'type') return { orderBy: [{ type: sortDir }, { name: 'asc' }] };
  if (field === 'category') return { orderBy: [{ category: sortDir }, { name: 'asc' }] };
  if (field === 'weight') return { orderBy: [{ weight: sortDir }, { name: 'asc' }] };
  return { orderBy: [{ name: sortDir }] };
}

function buildWhere(query) {
  const where = {};
  const and = [];

  if (query.type) {
    and.push({ type: String(query.type) });
  }
  if (query.category) {
    and.push({ category: String(query.category) });
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

// GET /api/dnd5e/equipment?limit=&page=&type=&category=&q=&sortBy=&sortDir=
router.get('/equipment', authenticateToken, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const where = buildWhere(req.query);
    const { orderBy } = parseSort(req.query);

    const [items, total] = await Promise.all([
      prisma.dnd5eEquipment.findMany({
        where,
        orderBy,
        take: limit,
        skip,
        select: {
          id: true,
          index: true,
          name: true,
          type: true,
          category: true,
          subcategory: true,
          cost: true,
          weight: true,
          rarity: false,
        },
      }),
      prisma.dnd5eEquipment.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la liste equipment dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dnd5e/equipment/search?q=  (avant /equipment/:index pour ne pas capturer index = "search")
router.get('/equipment/search', authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ items: [] });

    const items = await prisma.dnd5eEquipment.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { index: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 50,
      select: {
        id: true,
        index: true,
        name: true,
        type: true,
        category: true,
        weight: true,
      },
    });

    res.json({ items });
  } catch (error) {
    console.error('Erreur lors de la recherche equipment dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dnd5e/equipment/:index
router.get('/equipment/:index', authenticateToken, async (req, res) => {
  try {
    const { index } = req.params;
    const item = await prisma.dnd5eEquipment.findUnique({ where: { index } });
    if (!item) return res.status(404).json({ error: 'Objet non trouvé' });
    res.json({ item });
  } catch (error) {
    console.error('Erreur lors du détail equipment dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/dnd5e/characters/:characterId/inventory
// body: { equipment_id: number, quantity?: number }
router.post(
  '/characters/:characterId/inventory',
  authenticateToken,
  requireRole(['admin', 'gm']),
  async (req, res) => {
    try {
      const characterId = Number.parseInt(req.params.characterId, 10);
      const equipmentId = Number.parseInt(req.body.equipment_id, 10);
      const quantity = req.body.quantity == null ? 1 : Number.parseInt(req.body.quantity, 10);

      if (Number.isNaN(characterId)) return res.status(400).json({ error: 'ID personnage invalide' });
      if (Number.isNaN(equipmentId)) return res.status(400).json({ error: 'equipment_id requis' });
      if (Number.isNaN(quantity) || quantity < 0) return res.status(400).json({ error: 'Quantité invalide' });

      const [character, equipment] = await Promise.all([
        prisma.character.findFirst({ where: { id: characterId, isActive: true }, select: { id: true } }),
        prisma.dnd5eEquipment.findUnique({ where: { id: equipmentId } }),
      ]);
      if (!character) return res.status(404).json({ error: 'Personnage non trouvé' });
      if (!equipment) return res.status(404).json({ error: 'Objet non trouvé' });

      // 1) Dupliquer dans la table items : on crée TOUJOURS une nouvelle ligne (pas d'upsert)
      const mirroredItem = await prisma.item.create({
        data: {
          index: makeUniqueItemIndex(equipment.index),
          name: equipment.name,
          type: equipment.type,
          category: equipment.category,
          subcategory: equipment.subcategory,
          cost: equipment.cost,
          weight: equipment.weight,
          description: equipment.description,
          damage: equipment.damage,
          damageType: equipment.damageType,
          range: equipment.range,
          armorClass: equipment.armorClass,
          stealthDisadvantage: equipment.stealthDisadvantage,
          properties: equipment.properties,
          raw: equipment.raw,
        },
      });

      // 2) Ajouter à l'inventaire "classique" : on crée aussi une nouvelle ligne
      const sortOrder = await nextInventorySortOrder(prisma, characterId);
      const inv = await prisma.inventory.create({
        data: { characterId, itemId: mirroredItem.id, quantity, sortOrder },
      });

      res.status(201).json({
        inventory_item: inv,
        item: mirroredItem,
        equipment,
      });
    } catch (error) {
      console.error('Erreur ajout inventaire dnd5e:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
);

// GET /api/dnd5e/characters/:characterId/inventory
router.get('/characters/:characterId/inventory', authenticateToken, async (req, res) => {
  try {
    const characterId = Number.parseInt(req.params.characterId, 10);
    if (Number.isNaN(characterId)) return res.status(400).json({ error: 'ID personnage invalide' });

    const rows = await prisma.characterDnd5eInventory.findMany({
      where: { characterId },
      include: { equipment: true },
      orderBy: [{ updatedAt: 'desc' }],
    });

    res.json({
      inventory: rows.map((r) => ({
        id: r.id,
        character_id: r.characterId,
        equipment_id: r.equipmentId,
        quantity: r.quantity,
        equipment: r.equipment,
      })),
      count: rows.length,
    });
  } catch (error) {
    console.error('Erreur lecture inventaire dnd5e:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

