
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

// Ajouter un objet D&D à l'inventaire d'un personnage
router.post('/:characterId/dnd-items', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { dnd_type, dnd_slug, quantity = 1, notes } = req.body;

    if (!dnd_type || !dnd_slug) {
      return res.status(400).json({ error: 'Type D&D et slug requis' });
    }

    // Vérifier que le type D&D est valide
    const validTypes = ['spells', 'monsters', 'weapons', 'armor'];
    if (!validTypes.includes(dnd_type)) {
      return res.status(400).json({ error: 'Type D&D invalide. Types valides: spells, monsters, weapons, armor' });
    }

    // Récupérer l'objet D&D
    let dndItem;
    const tableName = `dnd_${dnd_type}`;
    const result = await pool.query(`SELECT * FROM ${tableName} WHERE slug = $1`, [dnd_slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `${dnd_type} non trouvé` });
    }
    
    dndItem = result.rows[0];

    // Créer un objet dans la table items à partir des données D&D
    let itemData = {
      name: dndItem.name,
      description: dndItem.description || '',
      weight: dndItem.weight || 0,
      value_gold: 0, // Les objets D&D n'ont pas de valeur par défaut
      rarity: 'common',
      is_magical: false,
      item_type_id: 1 // Par défaut "Autre"
    };

    // Adapter selon le type D&D
    if (dnd_type === 'weapons') {
      itemData.item_type_id = 1; // Arme
      itemData.damage_dice = dndItem.damage_dice;
      itemData.damage_type = dndItem.damage_type;
      itemData.weapon_type = dndItem.category;
      itemData.value_gold = 10; // Valeur par défaut pour les armes
    } else if (dnd_type === 'armor') {
      itemData.item_type_id = 2; // Armure
      itemData.armor_class_bonus = dndItem.armor_class;
      itemData.armor_type = dndItem.armor_category;
      itemData.value_gold = 50; // Valeur par défaut pour les armures
    } else if (dnd_type === 'spells') {
      itemData.item_type_id = 4; // Objet magique
      itemData.is_magical = true;
      itemData.requires_attunement = true;
      itemData.value_gold = 100; // Valeur par défaut pour les sorts
    }

    // Insérer l'objet dans la table items
    const itemResult = await pool.query(`
      INSERT INTO items (name, description, weight, value_gold, rarity, is_magical, 
                        damage_dice, damage_type, weapon_type, armor_class_bonus, 
                        armor_type, requires_attunement, item_type_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        weight = EXCLUDED.weight,
        value_gold = EXCLUDED.value_gold
      RETURNING *
    `, [
      itemData.name,
      itemData.description,
      itemData.weight,
      itemData.value_gold,
      itemData.rarity,
      itemData.is_magical,
      itemData.damage_dice,
      itemData.damage_type,
      itemData.weapon_type,
      itemData.armor_class_bonus,
      itemData.armor_type,
      itemData.requires_attunement,
      itemData.item_type_id
    ]);

    const item = itemResult.rows[0];

    // Vérifier si l'objet est déjà dans l'inventaire
    const existingItem = await pool.query(
      'SELECT id, quantity FROM character_inventory WHERE character_id = $1 AND item_id = $2',
      [characterId, item.id]
    );

    if (existingItem.rows.length > 0) {
      // Mettre à jour la quantité
      const newQuantity = existingItem.rows[0].quantity + quantity;
      const updateResult = await pool.query(
        'UPDATE character_inventory SET quantity = $1, notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
        [newQuantity, notes, existingItem.rows[0].id]
      );

      res.json({
        message: 'Objet D&D ajouté à l\'inventaire (quantité mise à jour)',
        inventory_item: updateResult.rows[0],
        dnd_item: dndItem
      });
    } else {
      // Ajouter un nouvel objet
      const inventoryResult = await pool.query(`
        INSERT INTO character_inventory (character_id, item_id, quantity, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [characterId, item.id, quantity, notes]);

      res.status(201).json({
        message: 'Objet D&D ajouté à l\'inventaire',
        inventory_item: inventoryResult.rows[0],
        dnd_item: dndItem
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'objet D&D:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rechercher des objets D&D pour les ajouter à l'inventaire
router.get('/dnd-search', authenticateToken, async (req, res) => {
  try {
    const { type, search, limit = 20, offset = 0 } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'Type D&D requis (spells, monsters, weapons, armor, items)' });
    }

    const validTypes = ['spells', 'monsters', 'weapons', 'armor', 'items'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Type D&D invalide' });
    }

    // Utiliser la même logique que dnd-local
    const tableName = `dnd_${type}`;
    console.log('Recherche D&D - Table:', tableName, 'Search:', search, 'Limit:', limit, 'Offset:', offset);
    
    let query = `SELECT slug, name, description FROM ${tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('Query:', query);
    console.log('Params:', params);

    const result = await pool.query(query, params);
    console.log('Result rows:', result.rows.length);
    
    // Requête pour le count
    let countQuery = `SELECT COUNT(*) FROM ${tableName} WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    console.log('Count query:', countQuery);
    console.log('Count params:', countParams);

    const totalResult = await pool.query(countQuery, countParams);
    console.log('Total count:', totalResult.rows[0].count);

    res.json({
      success: true,
      type: type,
      count: parseInt(totalResult.rows[0].count),
      results: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la recherche D&D:', error);
    console.error('Détails de l\'erreur:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Alias pour la recherche D&D (compatibilité avec dnd-inventory.js)
router.get('/search', authenticateToken, async (req, res) => {
  // Rediriger vers dnd-search
  req.url = req.url.replace('/search', '/dnd-search');
  return router.handle(req, res);
});

// Obtenir les statistiques d'inventaire d'un personnage
router.get('/:characterId/stats', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;

    // Statistiques générales
    const inventoryStats = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(weight * quantity) as total_weight,
        COUNT(CASE WHEN is_equipped = true THEN 1 END) as equipped_items,
        SUM(CASE WHEN is_equipped = true THEN value_gold * quantity ELSE 0 END) as equipped_value
      FROM character_inventory ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.character_id = $1
    `, [characterId]);

    // Répartition par type
    const typeStats = await pool.query(`
      SELECT 
        it.name as item_type,
        COUNT(*) as count,
        SUM(ci.quantity) as total_quantity
      FROM character_inventory ci
      JOIN items i ON ci.item_id = i.id
      JOIN item_types it ON i.item_type_id = it.id
      WHERE ci.character_id = $1
      GROUP BY it.name
      ORDER BY count DESC
    `, [characterId]);

    // Objets magiques
    const magicalStats = await pool.query(`
      SELECT 
        COUNT(*) as magical_items,
        SUM(ci.quantity) as magical_quantity
      FROM character_inventory ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.character_id = $1 AND i.is_magical = true
    `, [characterId]);

    res.json({
      inventory: inventoryStats.rows[0],
      by_type: typeStats.rows,
      magical: magicalStats.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Équiper/déséquiper un objet
router.put('/:characterId/equip/:inventoryId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId, inventoryId } = req.params;
    const { equipment_slot_id, is_equipped } = req.body;

    // Vérifier que l'objet existe dans l'inventaire
    const inventoryItem = await pool.query(
      'SELECT * FROM character_inventory WHERE id = $1 AND character_id = $2',
      [inventoryId, characterId]
    );

    if (inventoryItem.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });
    }

    // Si on équipe l'objet, vérifier le slot
    if (is_equipped && equipment_slot_id) {
      // Vérifier que le slot existe
      const slotResult = await pool.query(
        'SELECT * FROM equipment_slots WHERE id = $1',
        [equipment_slot_id]
      );

      if (slotResult.rows.length === 0) {
        return res.status(404).json({ error: 'Slot d\'équipement non trouvé' });
      }

      // Vérifier si le slot est déjà occupé
      const occupiedSlot = await pool.query(
        'SELECT * FROM character_inventory WHERE character_id = $1 AND equipment_slot_id = $2 AND is_equipped = true AND id != $3',
        [characterId, equipment_slot_id, inventoryId]
      );

      if (occupiedSlot.rows.length > 0) {
        return res.status(400).json({ error: 'Ce slot d\'équipement est déjà occupé' });
      }
    }

    // Mettre à jour l'objet
    const result = await pool.query(`
      UPDATE character_inventory 
      SET is_equipped = $1, equipment_slot_id = $2
      WHERE id = $3 AND character_id = $4
      RETURNING *
    `, [is_equipped, equipment_slot_id, inventoryId, characterId]);

    res.json({
      message: is_equipped ? 'Objet équipé' : 'Objet déséquipé',
      inventory_item: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de l\'équipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// Alias pour l'ajout d'objets D&D (compatibilité avec dnd-inventory.js)
router.post('/:characterId/add', authenticateToken, checkCharacterOwnership, async (req, res) => {
  // Rediriger vers add-dnd-item
  req.url = req.url.replace('/add', '/add-dnd-item');
  return router.handle(req, res);
});

// Ajouter un objet D&D directement à l'inventaire (version simplifiée)
router.post('/:characterId/add-dnd-item', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { dnd_type, dnd_slug, quantity = 1, notes, is_equipped = false, equipment_slot_id } = req.body;

    if (!dnd_type || !dnd_slug) {
      return res.status(400).json({ error: 'Type D&D et slug requis' });
    }

    // Vérifier que le type D&D est valide
    const validTypes = ['spells', 'monsters', 'weapons', 'armor', 'items'];
    if (!validTypes.includes(dnd_type)) {
      return res.status(400).json({ error: 'Type D&D invalide. Types valides: spells, monsters, weapons, armor, items' });
    }

    // Récupérer l'objet D&D
    const tableName = `dnd_${dnd_type}`;
    const dndResult = await pool.query(`SELECT * FROM ${tableName} WHERE slug = $1`, [dnd_slug]);
    
    if (dndResult.rows.length === 0) {
      return res.status(404).json({ error: `${dnd_type} non trouvé` });
    }
    
    const dndItem = dndResult.rows[0];

    // Créer un objet dans la table items à partir des données D&D
    let itemData = {
      name: dndItem.name,
      description: dndItem.description || '',
      weight: parseFloat(dndItem.weight) || 0,
      value_gold: 0,
      rarity: 'common',
      is_magical: false,
      item_type_id: 11 // Par défaut "Autre"
    };

    // Adapter selon le type D&D
    if (dnd_type === 'weapons') {
      itemData.item_type_id = 1; // Arme
      itemData.damage_dice = dndItem.damage_dice;
      itemData.damage_type = dndItem.damage_type;
      itemData.weapon_type = dndItem.category;
      itemData.value_gold = 10;
    } else if (dnd_type === 'armor') {
      itemData.item_type_id = 2; // Armure
      itemData.armor_class_bonus = dndItem.armor_class;
      itemData.armor_type = dndItem.armor_category;
      itemData.value_gold = 50;
    } else if (dnd_type === 'spells') {
      itemData.item_type_id = 4; // Objet magique
      itemData.is_magical = true;
      itemData.requires_attunement = true;
      itemData.value_gold = 100;
    } else if (dnd_type === 'items') {
      itemData.item_type_id = 4; // Objet magique si c'est magique, sinon Autre
      itemData.is_magical = dndItem.is_magic_item || false;
      itemData.requires_attunement = dndItem.requires_attunement || false;
      itemData.value_gold = parseFloat(dndItem.cost) || 0;
      itemData.rarity = dndItem.rarity || 'common';
    }

    // Insérer l'objet dans la table items
    const itemResult = await pool.query(`
      INSERT INTO items (name, description, weight, value_gold, rarity, is_magical, 
                        damage_dice, damage_type, weapon_type, armor_class_bonus, 
                        armor_type, requires_attunement, item_type_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        weight = EXCLUDED.weight,
        value_gold = EXCLUDED.value_gold
      RETURNING *
    `, [
      itemData.name,
      itemData.description,
      itemData.weight,
      itemData.value_gold,
      itemData.rarity,
      itemData.is_magical,
      itemData.damage_dice,
      itemData.damage_type,
      itemData.weapon_type,
      itemData.armor_class_bonus,
      itemData.armor_type,
      itemData.requires_attunement,
      itemData.item_type_id
    ]);

    const item = itemResult.rows[0];

    // Vérifier si l'objet est déjà dans l'inventaire
    const existingItem = await pool.query(
      'SELECT id, quantity FROM character_inventory WHERE character_id = $1 AND item_id = $2',
      [characterId, item.id]
    );

    if (existingItem.rows.length > 0) {
      // Mettre à jour la quantité
      const newQuantity = existingItem.rows[0].quantity + quantity;
      const updateResult = await pool.query(
        'UPDATE character_inventory SET quantity = $1, notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
        [newQuantity, notes, existingItem.rows[0].id]
      );

      res.json({
        message: 'Objet D&D ajouté à l\'inventaire (quantité mise à jour)',
        inventory_item: updateResult.rows[0],
        dnd_item: dndItem
      });
    } else {
      // Ajouter un nouvel objet
      const inventoryResult = await pool.query(`
        INSERT INTO character_inventory (character_id, item_id, quantity, notes, is_equipped, equipment_slot_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [characterId, item.id, quantity, notes, is_equipped, equipment_slot_id]);

      res.status(201).json({
        message: 'Objet D&D ajouté à l\'inventaire',
        inventory_item: inventoryResult.rows[0],
        dnd_item: dndItem
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'objet D&D:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Alias pour l'inventaire détaillé (compatibilité avec dnd-inventory.js)
router.get('/:characterId/inventory', authenticateToken, checkCharacterOwnership, async (req, res) => {
  // Rediriger vers detailed
  req.url = req.url.replace('/inventory', '/detailed');
  return router.handle(req, res);
});

// Obtenir l'inventaire d'un personnage avec les détails D&D
router.get('/:characterId/detailed', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { type, equipped_only, magical_only } = req.query;

    let query = `
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
        it.name as item_type,
        ci.created_at as added_at
      FROM character_inventory ci
      JOIN items i ON ci.item_id = i.id
      JOIN item_types it ON i.item_type_id = it.id
      LEFT JOIN equipment_slots es ON ci.equipment_slot_id = es.id
      WHERE ci.character_id = $1
    `;
    
    const params = [characterId];
    let paramCount = 1;

    if (type) {
      paramCount++;
      query += ` AND it.name ILIKE $${paramCount}`;
      params.push(`%${type}%`);
    }

    if (equipped_only === 'true') {
      query += ` AND ci.is_equipped = true`;
    }

    if (magical_only === 'true') {
      query += ` AND i.is_magical = true`;
    }

    query += ` ORDER BY ci.is_equipped DESC, i.name ASC`;

    const result = await pool.query(query, params);

    // Calculer les statistiques
    const totalWeight = result.rows.reduce((sum, item) => {
      return sum + (parseFloat(item.weight) * item.quantity);
    }, 0);

    const totalValue = result.rows.reduce((sum, item) => {
      return sum + (parseFloat(item.value_gold) * item.quantity);
    }, 0);

    const equippedItems = result.rows.filter(item => item.is_equipped);
    const magicalItems = result.rows.filter(item => item.is_magical);

    res.json({
      inventory: result.rows,
      statistics: {
        total_items: result.rows.length,
        total_quantity: result.rows.reduce((sum, item) => sum + item.quantity, 0),
        total_weight: totalWeight,
        total_value: totalValue,
        equipped_items: equippedItems.length,
        magical_items: magicalItems.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire détaillé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rechercher des objets D&D avec filtres avancés
router.get('/dnd-catalog', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      category, 
      rarity, 
      magical, 
      search, 
      min_cost, 
      max_cost,
      limit = 20, 
      offset = 0 
    } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'Type D&D requis' });
    }

    const validTypes = ['spells', 'monsters', 'weapons', 'armor', 'items'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Type D&D invalide' });
    }

    const tableName = `dnd_${type}`;
    let query = `SELECT * FROM ${tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category && (type === 'items' || type === 'weapons' || type === 'armor')) {
      paramCount++;
      query += ` AND category ILIKE $${paramCount}`;
      params.push(`%${category}%`);
    }

    if (rarity && (type === 'items' || type === 'spells')) {
      paramCount++;
      query += ` AND rarity ILIKE $${paramCount}`;
      params.push(`%${rarity}%`);
    }

    if (magical === 'true' && type === 'items') {
      query += ` AND is_magic_item = true`;
    }

    if (min_cost && type === 'items') {
      paramCount++;
      query += ` AND cost >= $${paramCount}`;
      params.push(parseFloat(min_cost));
    }

    if (max_cost && type === 'items') {
      paramCount++;
      query += ` AND cost <= $${paramCount}`;
      params.push(parseFloat(max_cost));
    }

    query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const totalResult = await pool.query(
      query.replace(`LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, ''),
      params.slice(0, -2)
    );

    res.json({
      type: type,
      count: totalResult.rows.length,
      results: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalResult.rows.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recherche du catalogue D&D:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
