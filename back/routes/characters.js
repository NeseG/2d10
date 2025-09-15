const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware pour vérifier que l'utilisateur est propriétaire du personnage ou admin/gm
const checkCharacterOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Les admins et GM peuvent accéder à tous les personnages
    if (userRole === 'admin' || userRole === 'gm') {
      return next();
    }

    // Vérifier que l'utilisateur est propriétaire du personnage
    const result = await pool.query(
      'SELECT user_id FROM characters WHERE id = $1 AND is_active = true',
      [id]
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

// Obtenir tous les personnages de l'utilisateur connecté
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let query, params;

    if (userRole === 'admin' || userRole === 'gm') {
      // Les admins et GM voient tous les personnages
      query = `
        SELECT c.*, u.username as owner_username, u.email as owner_email
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE c.is_active = true
        ORDER BY c.created_at DESC
      `;
      params = [];
    } else {
      // Les utilisateurs normaux voient seulement leurs personnages
      query = `
        SELECT c.*
        FROM characters c
        WHERE c.user_id = $1 AND c.is_active = true
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);

    res.json({
      characters: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un personnage par ID
router.get('/:id', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role_name;

    let query, params;

    if (userRole === 'admin' || userRole === 'gm') {
      query = `
        SELECT c.*, u.username as owner_username, u.email as owner_email
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = $1 AND c.is_active = true
      `;
      params = [id];
    } else {
      query = `
        SELECT c.*
        FROM characters c
        WHERE c.id = $1 AND c.user_id = $2 AND c.is_active = true
      `;
      params = [id, req.user.id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    res.json({
      character: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau personnage
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      race,
      class: characterClass,
      level = 1,
      background,
      alignment,
      experience_points = 0,
      hit_points,
      armor_class,
      speed,
      strength = 10,
      dexterity = 10,
      constitution = 10,
      intelligence = 10,
      wisdom = 10,
      charisma = 10,
      description,
      notes
    } = req.body;

    // Validation des données requises
    if (!name) {
      return res.status(400).json({ error: 'Le nom du personnage est requis' });
    }

    // Vérifier que l'utilisateur n'a pas déjà un personnage avec ce nom
    const existingCharacter = await pool.query(
      'SELECT id FROM characters WHERE name = $1 AND user_id = $2 AND is_active = true',
      [name, req.user.id]
    );

    if (existingCharacter.rows.length > 0) {
      return res.status(400).json({ error: 'Vous avez déjà un personnage avec ce nom' });
    }

    // Créer le personnage
    const result = await pool.query(`
      INSERT INTO characters (
        user_id, name, race, class, level, background, alignment,
        experience_points, hit_points, armor_class, speed,
        strength, dexterity, constitution, intelligence, wisdom, charisma,
        description, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      req.user.id, name, race, characterClass, level, background, alignment,
      experience_points, hit_points, armor_class, speed,
      strength, dexterity, constitution, intelligence, wisdom, charisma,
      description, notes
    ]);

    res.status(201).json({
      message: 'Personnage créé avec succès',
      character: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la création du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un personnage
router.put('/:id', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      race,
      class: characterClass,
      level,
      background,
      alignment,
      experience_points,
      hit_points,
      armor_class,
      speed,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
      description,
      notes
    } = req.body;

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = {
      name, race, class: characterClass, level, background, alignment,
      experience_points, hit_points, armor_class, speed,
      strength, dexterity, constitution, intelligence, wisdom, charisma,
      description, notes
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE characters 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    res.json({
      message: 'Personnage mis à jour avec succès',
      character: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un personnage (désactiver)
router.delete('/:id', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE characters SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    res.json({
      message: `Personnage "${result.rows[0].name}" supprimé avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les personnages avec leurs bourses
router.get('/with-purses', authenticateToken, async (req, res) => {
  try {
    console.log('Début de la route with-purses');
    const userId = req.user.id;
    const userRole = req.user.role_name;
    console.log('User ID:', userId, 'Role:', userRole);

    // D'abord, récupérer tous les personnages
    const charactersResult = await pool.query(`
      SELECT c.*, u.username as owner_username, u.email as owner_email
      FROM characters c
      JOIN users u ON c.user_id = u.id
      WHERE c.is_active = true
      ORDER BY c.created_at DESC
    `);
    
    console.log('Personnages trouvés:', charactersResult.rows.length);
    const characters = charactersResult.rows;

    // Récupérer les bourses pour chaque personnage
    const charactersWithPurses = [];
    
    for (const character of characters) {
      try {
        const purseResult = await pool.query(
          'SELECT * FROM character_purse WHERE character_id = $1',
          [character.id]
        );

        let purse = {
          copper_pieces: 0,
          silver_pieces: 0,
          electrum_pieces: 0,
          gold_pieces: 0,
          platinum_pieces: 0,
          updated_at: character.created_at
        };

        if (purseResult.rows.length > 0) {
          purse = purseResult.rows[0];
        }

        // Calculer la valeur totale en pièces d'or
        const totalGoldValue = 
          (purse.copper_pieces / 100) +
          (purse.silver_pieces / 10) +
          (purse.electrum_pieces / 2) +
          purse.gold_pieces +
          (purse.platinum_pieces * 10);

        charactersWithPurses.push({
          ...character,
          purse: purse,
          total_gold_value: totalGoldValue
        });
      } catch (error) {
        console.error(`Erreur lors de la récupération de la bourse pour le personnage ${character.id}:`, error);
        charactersWithPurses.push({
          ...character,
          purse: {
            copper_pieces: 0,
            silver_pieces: 0,
            electrum_pieces: 0,
            gold_pieces: 0,
            platinum_pieces: 0,
            updated_at: character.created_at
          },
          total_gold_value: 0
        });
      }
    }

    console.log('Retour de la réponse');
    res.json({
      success: true,
      characters: charactersWithPurses
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages avec bourses:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des personnages (admin/gm seulement)
router.get('/stats/overview', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const totalCharacters = await pool.query('SELECT COUNT(*) as count FROM characters WHERE is_active = true');
    const charactersByClass = await pool.query(`
      SELECT class, COUNT(*) as count 
      FROM characters 
      WHERE is_active = true AND class IS NOT NULL
      GROUP BY class 
      ORDER BY count DESC
    `);
    const charactersByLevel = await pool.query(`
      SELECT level, COUNT(*) as count 
      FROM characters 
      WHERE is_active = true
      GROUP BY level 
      ORDER BY level
    `);
    const charactersByRace = await pool.query(`
      SELECT race, COUNT(*) as count 
      FROM characters 
      WHERE is_active = true AND race IS NOT NULL
      GROUP BY race 
      ORDER BY count DESC
    `);

    res.json({
      stats: {
        total_characters: parseInt(totalCharacters.rows[0].count),
        by_class: charactersByClass.rows,
        by_level: charactersByLevel.rows,
        by_race: charactersByRace.rows
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
