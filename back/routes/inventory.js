const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware pour vérifier la propriété du personnage
const checkCharacterOwnership = async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Les admins et GM peuvent accéder à tous les personnages
    if (userRole === 'admin' || userRole === 'gm') {
      return next();
    }

    // Vérifier que l'utilisateur est propriétaire du personnage
    const result = await pool.query(
      'SELECT user_id FROM characters WHERE id = $1 AND is_active = true',
      [characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    if (result.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous n\'êtes pas propriétaire de ce personnage.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Obtenir l'inventaire d'un personnage
router.get('/:characterId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;

    const result = await pool.query(`
      SELECT 
        ci.id,
        ci.quantity,
        ci.is_equipped,
        ci.notes,
        ci.equipment_slot_id,
        es.name as slot_name,
        i.name,
        i.description,
        i.weight,
        i.value_gold,
        i.rarity,
        i.is_magical,
        i.damage_dice,
        i.damage_type,
        i.weapon_range,
        i.weapon_type,
        i.armor_class_bonus,
        i.armor_type,
        i.stealth_disadvantage,
        i.requires_attunement,
        i.properties,
        it.name as item_type
      FROM character_inventory ci
      JOIN items i ON ci.item_id = i.id
      JOIN item_types it ON i.item_type_id = it.id
      LEFT JOIN equipment_slots es ON ci.equipment_slot_id = es.id
      WHERE ci.character_id = $1
      ORDER BY ci.is_equipped DESC, i.name ASC
    `, [characterId]);

    // Calculer le poids total
    const totalWeight = result.rows.reduce((sum, item) => {
      return sum + (parseFloat(item.weight) * item.quantity);
    }, 0);

    res.json({
      inventory: result.rows,
      total_weight: totalWeight,
      total_items: result.rows.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un objet à l'inventaire
router.post('/:characterId/items', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { item_id, quantity = 1, notes } = req.body;

    if (!item_id) {
      return res.status(400).json({ error: 'ID de l\'objet requis' });
    }

    // Vérifier que l'objet existe
    const itemResult = await pool.query('SELECT * FROM items WHERE id = $1', [item_id]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    // Vérifier si l'objet est déjà dans l'inventaire
    const existingItem = await pool.query(
      'SELECT id, quantity FROM character_inventory WHERE character_id = $1 AND item_id = $2',
      [characterId, item_id]
    );

    if (existingItem.rows.length > 0) {
      // Mettre à jour la quantité
      const newQuantity = existingItem.rows[0].quantity + quantity;
      const updateResult = await pool.query(
        'UPDATE character_inventory SET quantity = $1, notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
        [newQuantity, notes, existingItem.rows[0].id]
      );

      res.json({
        message: 'Quantité mise à jour',
        inventory_item: updateResult.rows[0]
      });
    } else {
      // Ajouter un nouvel objet
      const result = await pool.query(`
        INSERT INTO character_inventory (character_id, item_id, quantity, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [characterId, item_id, quantity, notes]);

      res.status(201).json({
        message: 'Objet ajouté à l\'inventaire',
        inventory_item: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un objet dans l'inventaire
router.put('/:characterId/items/:inventoryId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId, inventoryId } = req.params;
    const { quantity, is_equipped, notes } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount}`);
      values.push(quantity);
      paramCount++;
    }

    if (is_equipped !== undefined) {
      updates.push(`is_equipped = $${paramCount}`);
      values.push(is_equipped);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(inventoryId, characterId);

    const result = await pool.query(`
      UPDATE character_inventory 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount} AND character_id = $${paramCount + 1}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });
    }

    res.json({
      message: 'Objet mis à jour',
      inventory_item: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un objet de l'inventaire
router.delete('/:characterId/items/:inventoryId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId, inventoryId } = req.params;

    const result = await pool.query(
      'DELETE FROM character_inventory WHERE id = $1 AND character_id = $2 RETURNING *',
      [inventoryId, characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });
    }

    res.json({
      message: 'Objet supprimé de l\'inventaire'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir la bourse d'un personnage
router.get('/:characterId/purse', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;

    const result = await pool.query(
      'SELECT * FROM character_purse WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      // Créer une bourse vide si elle n'existe pas
      const newPurse = await pool.query(`
        INSERT INTO character_purse (character_id)
        VALUES ($1)
        RETURNING *
      `, [characterId]);

      return res.json({
        purse: newPurse.rows[0],
        total_gold_value: 0
      });
    }

    const purse = result.rows[0];
    
    // Calculer la valeur totale en pièces d'or
    const totalGoldValue = 
      (purse.copper_pieces / 100) +
      (purse.silver_pieces / 10) +
      (purse.electrum_pieces / 2) +
      purse.gold_pieces +
      (purse.platinum_pieces * 10);

    res.json({
      purse: purse,
      total_gold_value: totalGoldValue
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la bourse:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier la bourse d'un personnage
router.put('/:characterId/purse', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { copper_pieces, silver_pieces, electrum_pieces, gold_pieces, platinum_pieces } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (copper_pieces !== undefined) {
      updates.push(`copper_pieces = $${paramCount}`);
      values.push(copper_pieces);
      paramCount++;
    }

    if (silver_pieces !== undefined) {
      updates.push(`silver_pieces = $${paramCount}`);
      values.push(silver_pieces);
      paramCount++;
    }

    if (electrum_pieces !== undefined) {
      updates.push(`electrum_pieces = $${paramCount}`);
      values.push(electrum_pieces);
      paramCount++;
    }

    if (gold_pieces !== undefined) {
      updates.push(`gold_pieces = $${paramCount}`);
      values.push(gold_pieces);
      paramCount++;
    }

    if (platinum_pieces !== undefined) {
      updates.push(`platinum_pieces = $${paramCount}`);
      values.push(platinum_pieces);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(characterId);

    const result = await pool.query(`
      INSERT INTO character_purse (character_id, copper_pieces, silver_pieces, electrum_pieces, gold_pieces, platinum_pieces)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (character_id) 
      DO UPDATE SET ${updates.join(', ')}
      RETURNING *
    `, [characterId, copper_pieces || 0, silver_pieces || 0, electrum_pieces || 0, gold_pieces || 0, platinum_pieces || 0]);

    const purse = result.rows[0];
    const totalGoldValue = 
      (purse.copper_pieces / 100) +
      (purse.silver_pieces / 10) +
      (purse.electrum_pieces / 2) +
      purse.gold_pieces +
      (purse.platinum_pieces * 10);

    res.json({
      message: 'Bourse mise à jour',
      purse: purse,
      total_gold_value: totalGoldValue
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la bourse:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les objets disponibles
router.get('/items/catalog', authenticateToken, async (req, res) => {
  try {
    const { type, rarity, search } = req.query;
    
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
    console.error('Erreur lors de la récupération du catalogue:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
