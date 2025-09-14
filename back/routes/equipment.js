const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, checkCharacterOwnership } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Obtenir l'équipement d'un personnage (objets équipés)
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
        es.description as slot_description,
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
      WHERE ci.character_id = $1 AND ci.is_equipped = true
      ORDER BY es.id ASC, i.name ASC
    `, [characterId]);

    // Calculer les statistiques d'équipement
    const totalWeight = result.rows.reduce((sum, item) => {
      return sum + (parseFloat(item.weight) * item.quantity);
    }, 0);

    const armorClassBonus = result.rows.reduce((sum, item) => {
      return sum + (item.armor_class_bonus || 0);
    }, 0);

    const stealthDisadvantage = result.rows.some(item => item.stealth_disadvantage);

    res.json({
      equipment: result.rows,
      stats: {
        total_weight: totalWeight,
        armor_class_bonus: armorClassBonus,
        stealth_disadvantage: stealthDisadvantage,
        total_items: result.rows.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'équipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Équiper un objet
router.post('/:characterId/equip', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { inventory_id, equipment_slot_id } = req.body;

    if (!inventory_id || !equipment_slot_id) {
      return res.status(400).json({ error: 'ID de l\'inventaire et slot d\'équipement requis' });
    }

    // Vérifier que l'objet appartient au personnage
    const inventoryItem = await pool.query(`
      SELECT ci.*, i.name as item_name, i.item_type_id, it.name as item_type
      FROM character_inventory ci
      JOIN items i ON ci.item_id = i.id
      JOIN item_types it ON i.item_type_id = it.id
      WHERE ci.id = $1 AND ci.character_id = $2
    `, [inventory_id, characterId]);

    if (inventoryItem.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });
    }

    const item = inventoryItem.rows[0];

    // Vérifier que le slot existe
    const slot = await pool.query('SELECT * FROM equipment_slots WHERE id = $1', [equipment_slot_id]);
    if (slot.rows.length === 0) {
      return res.status(404).json({ error: 'Slot d\'équipement non trouvé' });
    }

    // Vérifier la compatibilité du slot avec le type d'objet
    const isCompatible = checkSlotCompatibility(item.item_type, slot.rows[0].name);
    if (!isCompatible) {
      return res.status(400).json({ 
        error: `Ce type d'objet (${item.item_type}) ne peut pas être équipé dans ce slot (${slot.rows[0].name})` 
      });
    }

    // Vérifier si le slot est déjà occupé
    const occupiedSlot = await pool.query(`
      SELECT ci.*, i.name as item_name
      FROM character_inventory ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.character_id = $1 AND ci.equipment_slot_id = $2 AND ci.is_equipped = true
    `, [characterId, equipment_slot_id]);

    if (occupiedSlot.rows.length > 0) {
      return res.status(400).json({ 
        error: `Le slot ${slot.rows[0].name} est déjà occupé par ${occupiedSlot.rows[0].item_name}` 
      });
    }

    // Équiper l'objet
    const result = await pool.query(`
      UPDATE character_inventory 
      SET is_equipped = true, equipment_slot_id = $1
      WHERE id = $2 AND character_id = $3
      RETURNING *
    `, [equipment_slot_id, inventory_id, characterId]);

    res.json({
      message: `${item.item_name} équipé dans ${slot.rows[0].name}`,
      equipment: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de l\'équipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Déséquiper un objet
router.post('/:characterId/unequip', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { inventory_id } = req.body;

    if (!inventory_id) {
      return res.status(400).json({ error: 'ID de l\'inventaire requis' });
    }

    const result = await pool.query(`
      UPDATE character_inventory 
      SET is_equipped = false, equipment_slot_id = NULL
      WHERE id = $1 AND character_id = $2
      RETURNING *
    `, [inventory_id, characterId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });
    }

    res.json({
      message: 'Objet déséquipé',
      equipment: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors du déséquipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les slots d'équipement disponibles
router.get('/slots/available', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM equipment_slots 
      ORDER BY id ASC
    `);

    res.json({
      equipment_slots: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des slots:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction pour vérifier la compatibilité slot/type d'objet
function checkSlotCompatibility(itemType, slotName) {
  const compatibility = {
    'Arme': ['Main droite', 'Main gauche', 'Autre'],
    'Armure': ['Armure', 'Autre'],
    'Bouclier': ['Main gauche', 'Autre'],
    'Objet magique': ['Anneau 1', 'Anneau 2', 'Amulette', 'Cape', 'Autre'],
    'Vêtement': ['Cape', 'Casque', 'Bottes', 'Gants', 'Autre'],
    'Outils': ['Sac', 'Autre'],
    'Potion': ['Sac', 'Autre'],
    'Parchemin': ['Sac', 'Autre'],
    'Gemme': ['Sac', 'Autre'],
    'Nourriture': ['Sac', 'Autre'],
    'Autre': ['Sac', 'Autre']
  };

  const allowedSlots = compatibility[itemType] || ['Autre'];
  return allowedSlots.includes(slotName);
}

module.exports = router;
