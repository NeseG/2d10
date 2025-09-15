const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

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

// Obtenir la bourse d'un personnage
router.get('/:characterId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;

    const result = await pool.query(
      'SELECT * FROM character_purse WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      // Créer une bourse vide si elle n'existe pas
      const newPurse = await pool.query(`
        INSERT INTO character_purse (character_id, copper_pieces, silver_pieces, electrum_pieces, gold_pieces, platinum_pieces)
        VALUES ($1, 0, 0, 0, 0, 0)
        RETURNING *
      `, [characterId]);

      return res.json({
        success: true,
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
      success: true,
      purse: purse,
      total_gold_value: totalGoldValue
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la bourse:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter des pièces à la bourse
router.post('/:characterId/add', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { copper = 0, silver = 0, electrum = 0, gold = 0, platinum = 0, reason = 'Ajout manuel' } = req.body;

    // Vérifier que la bourse existe
    let purseResult = await pool.query('SELECT * FROM character_purse WHERE character_id = $1', [characterId]);
    
    if (purseResult.rows.length === 0) {
      // Créer la bourse si elle n'existe pas
      purseResult = await pool.query(`
        INSERT INTO character_purse (character_id, copper_pieces, silver_pieces, electrum_pieces, gold_pieces, platinum_pieces)
        VALUES ($1, 0, 0, 0, 0, 0)
        RETURNING *
      `, [characterId]);
    }

    // Ajouter les pièces
    const updatedPurse = await pool.query(`
      UPDATE character_purse 
      SET 
        copper_pieces = copper_pieces + $1,
        silver_pieces = silver_pieces + $2,
        electrum_pieces = electrum_pieces + $3,
        gold_pieces = gold_pieces + $4,
        platinum_pieces = platinum_pieces + $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE character_id = $6
      RETURNING *
    `, [copper, silver, electrum, gold, platinum, characterId]);

    // Calculer la valeur totale
    const totalGoldValue = 
      (updatedPurse.rows[0].copper_pieces / 100) +
      (updatedPurse.rows[0].silver_pieces / 10) +
      (updatedPurse.rows[0].electrum_pieces / 2) +
      updatedPurse.rows[0].gold_pieces +
      (updatedPurse.rows[0].platinum_pieces * 10);

    res.json({
      success: true,
      message: 'Pièces ajoutées à la bourse',
      purse: updatedPurse.rows[0],
      total_gold_value: totalGoldValue,
      added: { copper, silver, electrum, gold, platinum },
      reason: reason
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de pièces:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer des pièces de la bourse
router.post('/:characterId/remove', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { copper = 0, silver = 0, electrum = 0, gold = 0, platinum = 0, reason = 'Retrait manuel' } = req.body;

    // Vérifier que la bourse existe
    const purseResult = await pool.query('SELECT * FROM character_purse WHERE character_id = $1', [characterId]);
    
    if (purseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bourse non trouvée' });
    }

    const currentPurse = purseResult.rows[0];

    // Vérifier qu'il y a assez de pièces
    if (currentPurse.copper_pieces < copper ||
        currentPurse.silver_pieces < silver ||
        currentPurse.electrum_pieces < electrum ||
        currentPurse.gold_pieces < gold ||
        currentPurse.platinum_pieces < platinum) {
      return res.status(400).json({ 
        error: 'Fonds insuffisants',
        available: {
          copper: currentPurse.copper_pieces,
          silver: currentPurse.silver_pieces,
          electrum: currentPurse.electrum_pieces,
          gold: currentPurse.gold_pieces,
          platinum: currentPurse.platinum_pieces
        },
        requested: { copper, silver, electrum, gold, platinum }
      });
    }

    // Retirer les pièces
    const updatedPurse = await pool.query(`
      UPDATE character_purse 
      SET 
        copper_pieces = copper_pieces - $1,
        silver_pieces = silver_pieces - $2,
        electrum_pieces = electrum_pieces - $3,
        gold_pieces = gold_pieces - $4,
        platinum_pieces = platinum_pieces - $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE character_id = $6
      RETURNING *
    `, [copper, silver, electrum, gold, platinum, characterId]);

    // Calculer la valeur totale
    const totalGoldValue = 
      (updatedPurse.rows[0].copper_pieces / 100) +
      (updatedPurse.rows[0].silver_pieces / 10) +
      (updatedPurse.rows[0].electrum_pieces / 2) +
      updatedPurse.rows[0].gold_pieces +
      (updatedPurse.rows[0].platinum_pieces * 10);

    res.json({
      success: true,
      message: 'Pièces retirées de la bourse',
      purse: updatedPurse.rows[0],
      total_gold_value: totalGoldValue,
      removed: { copper, silver, electrum, gold, platinum },
      reason: reason
    });
  } catch (error) {
    console.error('Erreur lors du retrait de pièces:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
