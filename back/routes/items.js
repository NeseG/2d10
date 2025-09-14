const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Obtenir tous les types d'objets
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM item_types ORDER BY name');
    
    res.json({
      item_types: result.rows
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
    let paramCount = 1;

    if (type) {
      query += ` AND it.name ILIKE $${paramCount}`;
      values.push(`%${type}%`);
      paramCount++;
    }

    if (rarity) {
      query += ` AND i.rarity = $${paramCount}`;
      values.push(rarity);
      paramCount++;
    }

    if (magical !== undefined) {
      query += ` AND i.is_magical = $${paramCount}`;
      values.push(magical === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (i.name ILIKE $${paramCount} OR i.description ILIKE $${paramCount + 1})`;
      values.push(`%${search}%`, `%${search}%`);
      paramCount += 2;
    }

    query += ` ORDER BY i.name ASC`;

    const result = await pool.query(query, values);

    res.json({
      items: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des objets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un objet par ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT i.*, it.name as item_type
      FROM items i
      JOIN item_types it ON i.item_type_id = it.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    res.json({
      item: result.rows[0]
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
      properties
    } = req.body;

    if (!name || !item_type_id) {
      return res.status(400).json({ error: 'Nom et type d\'objet requis' });
    }

    // Vérifier que le type d'objet existe
    const typeResult = await pool.query('SELECT id FROM item_types WHERE id = $1', [item_type_id]);
    if (typeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Type d\'objet invalide' });
    }

    const result = await pool.query(`
      INSERT INTO items (name, description, item_type_id, weight, value_gold, rarity, is_magical, properties)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, description, item_type_id, weight, value_gold, rarity, is_magical, properties]);

    res.status(201).json({
      message: 'Objet créé avec succès',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un objet (Admin/GM seulement)
router.put('/:id', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      item_type_id,
      weight,
      value_gold,
      rarity,
      is_magical,
      properties
    } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (item_type_id !== undefined) {
      // Vérifier que le type d'objet existe
      const typeResult = await pool.query('SELECT id FROM item_types WHERE id = $1', [item_type_id]);
      if (typeResult.rows.length === 0) {
        return res.status(400).json({ error: 'Type d\'objet invalide' });
      }
      
      updates.push(`item_type_id = $${paramCount}`);
      values.push(item_type_id);
      paramCount++;
    }

    if (weight !== undefined) {
      updates.push(`weight = $${paramCount}`);
      values.push(weight);
      paramCount++;
    }

    if (value_gold !== undefined) {
      updates.push(`value_gold = $${paramCount}`);
      values.push(value_gold);
      paramCount++;
    }

    if (rarity !== undefined) {
      updates.push(`rarity = $${paramCount}`);
      values.push(rarity);
      paramCount++;
    }

    if (is_magical !== undefined) {
      updates.push(`is_magical = $${paramCount}`);
      values.push(is_magical);
      paramCount++;
    }

    if (properties !== undefined) {
      updates.push(`properties = $${paramCount}`);
      values.push(properties);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id);

    const result = await pool.query(`
      UPDATE items 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    res.json({
      message: 'Objet mis à jour avec succès',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un objet (Admin seulement)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'objet est utilisé dans des inventaires
    const usageResult = await pool.query(
      'SELECT COUNT(*) as count FROM character_inventory WHERE item_id = $1',
      [id]
    );

    if (parseInt(usageResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer cet objet car il est utilisé dans des inventaires' 
      });
    }

    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING name', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    res.json({
      message: `Objet "${result.rows[0].name}" supprimé avec succès`
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

    const result = await pool.query(`
      INSERT INTO item_types (name, description)
      VALUES ($1, $2)
      RETURNING *
    `, [name, description]);

    res.status(201).json({
      message: 'Type d\'objet créé avec succès',
      item_type: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Un type d\'objet avec ce nom existe déjà' });
    }
    console.error('Erreur lors de la création du type d\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
