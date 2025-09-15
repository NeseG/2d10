const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware pour vérifier que l'utilisateur est GM de la campagne
const checkCampaignOwnership = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Les admins peuvent accéder à toutes les campagnes
    if (userRole === 'admin') {
      return next();
    }

    // Vérifier que l'utilisateur est GM de la campagne
    const result = await pool.query(
      'SELECT gm_id FROM campaigns WHERE id = $1 AND is_active = true',
      [campaignId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (result.rows[0].gm_id !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous n\'êtes pas le GM de cette campagne.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété de campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Obtenir toutes les campagnes (GM et Admin voient leurs campagnes, Admin voit tout)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let query, params;

    if (userRole === 'admin') {
      // Les admins voient toutes les campagnes
      query = `
        SELECT c.*, u.username as gm_username, u.email as gm_email
        FROM campaigns c
        JOIN users u ON c.gm_id = u.id
        WHERE c.is_active = true
        ORDER BY c.created_at DESC
      `;
      params = [];
    } else {
      // Les GM voient seulement leurs campagnes
      query = `
        SELECT c.*
        FROM campaigns c
        WHERE c.gm_id = $1 AND c.is_active = true
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      campaigns: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir une campagne par ID
router.get('/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let query, params;

    if (userRole === 'admin') {
      query = `
        SELECT c.*, u.username as gm_username, u.email as gm_email
        FROM campaigns c
        JOIN users u ON c.gm_id = u.id
        WHERE c.id = $1 AND c.is_active = true
      `;
      params = [campaignId];
    } else {
      query = `
        SELECT c.*
        FROM campaigns c
        WHERE c.id = $1 AND c.gm_id = $2 AND c.is_active = true
      `;
      params = [campaignId, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Récupérer les personnages de la campagne
    const charactersResult = await pool.query(`
      SELECT cc.*, c.name as character_name, c.class, c.level, c.race, u.username as player_username
      FROM campaign_characters cc
      JOIN characters c ON cc.character_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE cc.campaign_id = $1 AND cc.is_active = true
      ORDER BY cc.joined_at ASC
    `, [campaignId]);

    // Récupérer les sessions de la campagne
    const sessionsResult = await pool.query(`
      SELECT * FROM game_sessions 
      WHERE campaign_id = $1 AND is_active = true
      ORDER BY session_number ASC
    `, [campaignId]);

    res.json({
      success: true,
      campaign: {
        ...result.rows[0],
        characters: charactersResult.rows,
        sessions: sessionsResult.rows
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle campagne (GM et Admin seulement)
router.post('/', authenticateToken, requireRole(['gm', 'admin']), async (req, res) => {
  try {
    const {
      name,
      description,
      setting,
      max_players = 6,
      start_date,
      notes
    } = req.body;

    // Validation des données requises
    if (!name) {
      return res.status(400).json({ error: 'Le nom de la campagne est requis' });
    }

    // Créer la campagne
    const result = await pool.query(`
      INSERT INTO campaigns (
        gm_id, name, description, setting, max_players, start_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, name, description, setting, max_players, start_date, notes]);

    res.status(201).json({
      success: true,
      message: 'Campagne créée avec succès',
      campaign: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la création de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une campagne
router.put('/:campaignId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      name,
      description,
      setting,
      max_players,
      status,
      start_date,
      end_date,
      notes
    } = req.body;

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = {
      name, description, setting, max_players, status, start_date, end_date, notes
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
    values.push(campaignId);

    const query = `
      UPDATE campaigns 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    res.json({
      success: true,
      message: 'Campagne mise à jour avec succès',
      campaign: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une campagne (désactiver)
router.delete('/:campaignId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const result = await pool.query(
      'UPDATE campaigns SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING name',
      [campaignId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    res.json({
      success: true,
      message: `Campagne "${result.rows[0].name}" supprimée avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un personnage à une campagne
router.post('/:campaignId/characters', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { character_id, notes } = req.body;

    if (!character_id) {
      return res.status(400).json({ error: 'ID du personnage requis' });
    }

    // Vérifier que le personnage existe et est actif
    const characterResult = await pool.query(
      'SELECT * FROM characters WHERE id = $1 AND is_active = true',
      [character_id]
    );

    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    // Vérifier que le personnage n'est pas déjà dans la campagne
    const existingResult = await pool.query(
      'SELECT id FROM campaign_characters WHERE campaign_id = $1 AND character_id = $2 AND is_active = true',
      [campaignId, character_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Ce personnage est déjà dans cette campagne' });
    }

    // Vérifier la limite de joueurs
    const campaignResult = await pool.query(
      'SELECT max_players, current_players FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignResult.rows[0].current_players >= campaignResult.rows[0].max_players) {
      return res.status(400).json({ error: 'La campagne a atteint le nombre maximum de joueurs' });
    }

    // Ajouter le personnage à la campagne
    const result = await pool.query(`
      INSERT INTO campaign_characters (campaign_id, character_id, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [campaignId, character_id, notes]);

    // Mettre à jour le compteur de joueurs
    await pool.query(
      'UPDATE campaigns SET current_players = current_players + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [campaignId]
    );

    res.status(201).json({
      success: true,
      message: 'Personnage ajouté à la campagne',
      campaign_character: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du personnage à la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer un personnage d'une campagne
router.delete('/:campaignId/characters/:characterId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { campaignId, characterId } = req.params;

    const result = await pool.query(`
      UPDATE campaign_characters 
      SET is_active = false, left_at = CURRENT_TIMESTAMP, status = 'left'
      WHERE campaign_id = $1 AND character_id = $2 AND is_active = true
      RETURNING *
    `, [campaignId, characterId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personnage non trouvé dans cette campagne' });
    }

    // Mettre à jour le compteur de joueurs
    await pool.query(
      'UPDATE campaigns SET current_players = current_players - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [campaignId]
    );

    res.json({
      success: true,
      message: 'Personnage retiré de la campagne'
    });

  } catch (error) {
    console.error('Erreur lors du retrait du personnage de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des campagnes (GM et Admin seulement)
router.get('/stats/overview', authenticateToken, requireRole(['gm', 'admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let whereClause = 'WHERE c.is_active = true';
    let params = [];

    if (userRole === 'gm') {
      whereClause += ' AND c.gm_id = $1';
      params = [userId];
    }

    const totalCampaigns = await pool.query(`SELECT COUNT(*) as count FROM campaigns c ${whereClause}`, params);
    
    const campaignsByStatus = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM campaigns c 
      ${whereClause}
      GROUP BY status 
      ORDER BY count DESC
    `, params);

    const campaignsBySetting = await pool.query(`
      SELECT setting, COUNT(*) as count 
      FROM campaigns c 
      ${whereClause} AND setting IS NOT NULL
      GROUP BY setting 
      ORDER BY count DESC
    `, params);

    const totalPlayers = await pool.query(`
      SELECT SUM(current_players) as total 
      FROM campaigns c 
      ${whereClause}
    `, params);

    res.json({
      success: true,
      stats: {
        total_campaigns: parseInt(totalCampaigns.rows[0].count),
        total_players: parseInt(totalPlayers.rows[0].total) || 0,
        by_status: campaignsByStatus.rows,
        by_setting: campaignsBySetting.rows
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des campagnes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

