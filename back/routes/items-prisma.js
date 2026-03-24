const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Obtenir tous les types d'objets
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const itemTypes = await prisma.$queryRawUnsafe('SELECT * FROM item_types ORDER BY name');

    res.json({
      item_types: itemTypes,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des types d\'objets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les objets avec filtres
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, rarity, search, magical } = req.query;

    let query = `
      SELECT i.*, it.name as item_type
      FROM items i
      JOIN item_types it ON i.item_type_id = it.id
      WHERE 1=1
    `;
    const values = [];

    if (type) {
      values.push(`%${type}%`);
      query += ` AND it.name ILIKE $${values.length}`;
    }

    if (rarity) {
      values.push(rarity);
      query += ` AND i.rarity = $${values.length}`;
    }

    if (magical !== undefined) {
      values.push(magical === 'true');
      query += ` AND i.is_magical = $${values.length}`;
    }

    if (search) {
      values.push(`%${search}%`);
      query += ` AND (i.name ILIKE $${values.length} OR i.description ILIKE $${values.length})`;
    }

    query += ' ORDER BY i.name ASC';

    const items = await prisma.$queryRawUnsafe(query, ...values);

    res.json({
      items,
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

    const items = await prisma.$queryRawUnsafe(
      `
      SELECT i.*, it.name as item_type
      FROM items i
      JOIN item_types it ON i.item_type_id = it.id
      WHERE i.id = $1
      `,
      id,
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    res.json({
      item: items[0],
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
      name,
      description,
      item_type_id,
      weight = 0,
      value_gold = 0,
      rarity = 'common',
      is_magical = false,
      properties,
    } = req.body;

    if (!name || !item_type_id) {
      return res.status(400).json({ error: 'Nom et type d\'objet requis' });
    }

    const typeRows = await prisma.$queryRawUnsafe('SELECT id FROM item_types WHERE id = $1', item_type_id);
    if (typeRows.length === 0) {
      return res.status(400).json({ error: 'Type d\'objet invalide' });
    }

    const created = await prisma.$queryRawUnsafe(
      `
      INSERT INTO items (name, description, item_type_id, weight, value_gold, rarity, is_magical, properties)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      name,
      description,
      item_type_id,
      weight,
      value_gold,
      rarity,
      is_magical,
      properties,
    );

    res.status(201).json({
      message: 'Objet créé avec succès',
      item: created[0],
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
      name,
      description,
      item_type_id,
      weight,
      value_gold,
      rarity,
      is_magical,
      properties,
    } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      values.push(name);
      updates.push(`name = $${values.length}`);
    }
    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }
    if (item_type_id !== undefined) {
      const typeRows = await prisma.$queryRawUnsafe('SELECT id FROM item_types WHERE id = $1', item_type_id);
      if (typeRows.length === 0) {
        return res.status(400).json({ error: 'Type d\'objet invalide' });
      }
      values.push(item_type_id);
      updates.push(`item_type_id = $${values.length}`);
    }
    if (weight !== undefined) {
      values.push(weight);
      updates.push(`weight = $${values.length}`);
    }
    if (value_gold !== undefined) {
      values.push(value_gold);
      updates.push(`value_gold = $${values.length}`);
    }
    if (rarity !== undefined) {
      values.push(rarity);
      updates.push(`rarity = $${values.length}`);
    }
    if (is_magical !== undefined) {
      values.push(is_magical);
      updates.push(`is_magical = $${values.length}`);
    }
    if (properties !== undefined) {
      values.push(properties);
      updates.push(`properties = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id);
    const updated = await prisma.$queryRawUnsafe(
      `
      UPDATE items
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
      `,
      ...values,
    );

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    res.json({
      message: 'Objet mis à jour avec succès',
      item: updated[0],
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

    const usageRows = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM character_inventory WHERE item_id = $1',
      id,
    );

    if (parseInt(usageRows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer cet objet car il est utilisé dans des inventaires',
      });
    }

    const deleted = await prisma.$queryRawUnsafe('DELETE FROM items WHERE id = $1 RETURNING name', id);
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    res.json({
      message: `Objet "${deleted[0].name}" supprimé avec succès`,
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau type d'objet (Admin seulement)
router.post('/types', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nom du type d\'objet requis' });
    }

    const created = await prisma.$queryRawUnsafe(
      `
      INSERT INTO item_types (name, description)
      VALUES ($1, $2)
      RETURNING *
      `,
      name,
      description,
    );

    res.status(201).json({
      message: 'Type d\'objet créé avec succès',
      item_type: created[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Un type d\'objet avec ce nom existe déjà' });
    }
    console.error('Erreur lors de la création du type d\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
