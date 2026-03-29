const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function slugify(raw) {
  return String(raw || 'item')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeUniqueIndexFromName(name) {
  const base = slugify(name);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return `${base}__manual__${suffix}`;
}

function buildListWhere(query) {
  const { type, category, search } = query;
  const and = [];

  if (search && String(search).trim()) {
    const term = String(search).trim();
    and.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { index: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  if (type && String(type).trim()) {
    and.push({ type: String(type).trim() });
  }

  if (category && String(category).trim()) {
    and.push({ category: String(category).trim() });
  }

  return and.length ? { AND: and } : {};
}

// Obtenir tous les types d'objets
router.get('/types', authenticateToken, async (req, res) => {
  try {
    // Legacy endpoint (front historique). Plus d'ItemType lié.
    res.json({ item_types: [] });
  } catch (error) {
    console.error('Erreur lors de la récupération des types d\'objets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les objets avec filtres
router.get('/', authenticateToken, async (req, res) => {
  try {
    const records = await prisma.item.findMany({
      where: buildListWhere(req.query),
      orderBy: [{ name: 'asc' }],
    });

    res.json({
      items: records,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des objets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un objet par ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const record = await prisma.item.findUnique({ where: { id } });

    if (!record) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    res.json({
      item: record,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouvel objet (Admin/GM seulement)
router.post('/', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const {
      index,
      name,
      description,
      properties,
      type = 'other',
      category,
      subcategory,
      cost,
      weight,
      damage,
      damageType,
      range,
      armorClass,
      stealthDisadvantage,
      raw,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    // `index` est unique globalement. Si l'appelant ne le fournit pas,
    // on génère un index unique pour permettre plusieurs items avec le même nom.
    const indexSeed = index ? slugify(index) : makeUniqueIndexFromName(name);

    let created = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const nextIndex = attempt === 0 ? indexSeed : makeUniqueIndexFromName(name);
      try {
        created = await prisma.item.create({
          data: {
            index: nextIndex,
            name,
            description: description ?? null,
            type,
            category: category ?? null,
            subcategory: subcategory ?? null,
            cost: cost ?? null,
            weight: weight != null ? Number.parseInt(String(weight), 10) : null,
            damage: damage ?? null,
            damageType: damageType ?? null,
            range: range ?? null,
            armorClass: armorClass != null ? Number.parseInt(String(armorClass), 10) : null,
            stealthDisadvantage: stealthDisadvantage != null ? Boolean(stealthDisadvantage) : null,
            properties: properties ?? null,
            raw: raw ?? null,
          },
        });
        break;
      } catch (e) {
        // Collision index (unique)
        if (e?.code === 'P2002' && attempt < 2) continue;
        throw e;
      }
    }

    res.status(201).json({
      message: 'Objet créé avec succès',
      item: created,
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un objet (Admin/GM seulement)
router.put('/:id', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const {
      index,
      name,
      description,
      weight,
      properties,
      type,
      category,
      subcategory,
      cost,
      damage,
      damageType,
      range,
      armorClass,
      stealthDisadvantage,
      raw,
    } = req.body;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    const data = {};

    if (index !== undefined) data.index = index;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (category !== undefined) data.category = category;
    if (subcategory !== undefined) data.subcategory = subcategory;
    if (cost !== undefined) data.cost = cost;
    if (weight !== undefined) data.weight = weight != null ? Number.parseInt(String(weight), 10) : null;
    if (damage !== undefined) data.damage = damage;
    if (damageType !== undefined) data.damageType = damageType;
    if (range !== undefined) data.range = range;
    if (armorClass !== undefined) data.armorClass = armorClass != null ? Number.parseInt(String(armorClass), 10) : null;
    if (stealthDisadvantage !== undefined) data.stealthDisadvantage = stealthDisadvantage != null ? Boolean(stealthDisadvantage) : null;
    if (properties !== undefined) data.properties = properties;
    if (raw !== undefined) data.raw = raw;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const updated = await prisma.item.update({
      where: { id },
      data,
    });

    res.json({
      message: 'Objet mis à jour avec succès',
      item: updated,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un objet (Admin seulement)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const usageCount = await prisma.inventory.count({
      where: { itemId: id },
    });

    if (usageCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer cet objet car il est utilisé dans des inventaires',
      });
    }

    try {
      const deleted = await prisma.item.delete({
        where: { id },
        select: { name: true },
      });

      res.json({
        message: `Objet "${deleted.name}" supprimé avec succès`,
      });
    } catch (e) {
      if (e.code === 'P2025') {
        return res.status(404).json({ error: 'Objet non trouvé' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau type d'objet (Admin seulement)
router.post('/types', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  res.status(410).json({
    error: 'Endpoint legacy. Les types ItemType ne sont plus utilisés après alignement Item<->Dnd5eEquipment.',
  });
});

module.exports = router;
