const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');

function isItemPrivilegedUser(user) {
  return user?.role_name === 'admin' || user?.role_name === 'gm';
}

/** Joueur : l’objet est référencé par au moins une ligne d’inventaire d’un de ses personnages. */
async function userHasItemInInventory(userId, itemId) {
  const n = await prisma.inventory.count({
    where: {
      itemId,
      character: { userId },
    },
  });
  return n > 0;
}

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

/** Accepte `0,5` ou `0.5` (virgule = séparateur décimal). */
function parseOptionalItemWeight(value) {
  if (value === undefined) return { skip: true };
  if (value === null || value === '') return { value: null };
  const s = String(value).trim();
  if (!s) return { value: null };
  const normalized = s.includes(',') ? s.replace(',', '.') : s;
  const n = Number.parseFloat(normalized);
  if (Number.isNaN(n) || n < 0) return { error: 'Poids invalide' };
  return { value: n };
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

/** Index stable dans `dnd5e_equipment` pour un objet validé depuis une fiche custom. */
function validatedEquipmentCatalogIndex(itemId) {
  return `validated-item-${itemId}`;
}

function isLegacyCustomItem(item) {
  return item.source == null && String(item.index || '').includes('__manual__');
}

function itemIsMagicItemMirror(properties) {
  if (!properties || typeof properties !== 'object') return false;
  return Boolean(properties.dnd5e_magic_item);
}

// POST /api/items/:id/validate-catalog — admin : copie l’objet dans la base « équipements importés » (Dnd5eEquipment)
router.post('/:id/validate-catalog', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const item = await prisma.item.findFirst({ where: { id, isActive: true } });
    if (!item) return res.status(404).json({ error: 'Objet non trouvé' });

    if (itemIsMagicItemMirror(item.properties)) {
      return res.status(400).json({
        error:
          'Les objets magiques issus du catalogue SRD ne peuvent pas être publiés dans le catalogue équipement.',
      });
    }

    const isCustom = item.source === 'custom' || isLegacyCustomItem(item);
    if (!isCustom) {
      return res.status(400).json({
        error: 'Seuls les objets personnalisés (source custom) peuvent être validés pour le catalogue importé.',
      });
    }

    const importIndex = validatedEquipmentCatalogIndex(id);

    const weightInt =
      item.weight != null && Number.isFinite(Number(item.weight)) ? Math.round(Number(item.weight)) : null;

    const importRow = await prisma.dnd5eEquipment.upsert({
      where: { index: importIndex },
      create: {
        index: importIndex,
        name: item.name,
        type: item.type,
        category: item.category,
        subcategory: item.subcategory,
        cost: item.cost,
        weight: weightInt,
        description: item.description,
        damage: item.damage,
        damageType: item.damageType,
        range: item.range,
        armorClass: item.armorClass,
        stealthDisadvantage: item.stealthDisadvantage,
        properties: item.properties,
        raw: item.raw,
      },
      update: {
        name: item.name,
        type: item.type,
        category: item.category,
        subcategory: item.subcategory,
        cost: item.cost,
        weight: weightInt,
        description: item.description,
        damage: item.damage,
        damageType: item.damageType,
        range: item.range,
        armorClass: item.armorClass,
        stealthDisadvantage: item.stealthDisadvantage,
        properties: item.properties,
        raw: item.raw,
      },
    });

    const updatedItem = await prisma.item.update({
      where: { id },
      data: { source: 'dnd5e' },
    });

    res.json({
      message: 'Objet validé et ajouté à la base des équipements importés.',
      item: updatedItem,
      dnd5e_import: {
        id: importRow.id,
        index: importRow.index,
        name: importRow.name,
        type: importRow.type,
      },
    });
  } catch (error) {
    console.error('Erreur validation item catalogue:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouvel objet — tout utilisateur authentifié (index toujours auto-généré hors admin/gm)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const privileged = isItemPrivilegedUser(req.user);
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

    // `index` est unique globalement. Admin/GM peuvent proposer un index ; les joueurs : toujours auto.
    const indexSeed =
      privileged && index && String(index).trim()
        ? slugify(index)
        : makeUniqueIndexFromName(name);

    const parsedWeight = parseOptionalItemWeight(weight);
    if (parsedWeight.error) {
      return res.status(400).json({ error: parsedWeight.error });
    }
    const weightValue = parsedWeight.skip ? null : parsedWeight.value;

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
            weight: weightValue,
            damage: damage ?? null,
            damageType: damageType ?? null,
            range: range ?? null,
            armorClass: armorClass != null ? Number.parseInt(String(armorClass), 10) : null,
            stealthDisadvantage: stealthDisadvantage != null ? Boolean(stealthDisadvantage) : null,
            properties: properties ?? null,
            raw: privileged && raw !== undefined ? raw : null,
            source: 'custom',
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

// Mettre à jour un objet — admin/gm ou joueur si l’objet est dans l’inventaire d’un de ses persos
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const privileged = isItemPrivilegedUser(req.user);

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

    if (!privileged) {
      const allowed = await userHasItemInInventory(req.user.id, id);
      if (!allowed) {
        return res.status(403).json({
          error:
            'Vous ne pouvez modifier que les objets présents dans l’inventaire de vos personnages.',
        });
      }
    }

    const data = {};

    if (index !== undefined && privileged) data.index = index;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (category !== undefined) data.category = category;
    if (subcategory !== undefined) data.subcategory = subcategory;
    if (cost !== undefined) data.cost = cost;
    if (weight !== undefined) {
      const pw = parseOptionalItemWeight(weight);
      if (pw.error) return res.status(400).json({ error: pw.error });
      if (!pw.skip) data.weight = pw.value;
    }
    if (damage !== undefined) data.damage = damage;
    if (damageType !== undefined) data.damageType = damageType;
    if (range !== undefined) data.range = range;
    if (armorClass !== undefined) data.armorClass = armorClass != null ? Number.parseInt(String(armorClass), 10) : null;
    if (stealthDisadvantage !== undefined) data.stealthDisadvantage = stealthDisadvantage != null ? Boolean(stealthDisadvantage) : null;
    if (properties !== undefined) data.properties = properties;
    if (raw !== undefined && privileged) data.raw = raw;

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
