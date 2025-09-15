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

// Obtenir toutes les sessions d'une campagne
router.get('/campaign/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Vérifier l'accès à la campagne
    let campaignQuery, campaignParams;
    if (userRole === 'admin') {
      campaignQuery = 'SELECT id FROM campaigns WHERE id = $1 AND is_active = true';
      campaignParams = [campaignId];
    } else {
      campaignQuery = 'SELECT id FROM campaigns WHERE id = $1 AND gm_id = $2 AND is_active = true';
      campaignParams = [campaignId, userId];
    }

    const campaignResult = await pool.query(campaignQuery, campaignParams);
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Récupérer les sessions
    const sessionsResult = await pool.query(`
      SELECT * FROM game_sessions 
      WHERE campaign_id = $1 AND is_active = true
      ORDER BY session_number ASC
    `, [campaignId]);

    res.json({
      success: true,
      sessions: sessionsResult.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir une session par ID
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let query, params;

    if (userRole === 'admin') {
      query = `
        SELECT gs.*, c.name as campaign_name, c.gm_id
        FROM game_sessions gs
        JOIN campaigns c ON gs.campaign_id = c.id
        WHERE gs.id = $1 AND gs.is_active = true
      `;
      params = [sessionId];
    } else {
      query = `
        SELECT gs.*, c.name as campaign_name, c.gm_id
        FROM game_sessions gs
        JOIN campaigns c ON gs.campaign_id = c.id
        WHERE gs.id = $1 AND c.gm_id = $2 AND gs.is_active = true
      `;
      params = [sessionId, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    // Récupérer la présence des personnages
    const attendanceResult = await pool.query(`
      SELECT sa.*, c.name as character_name, c.class, c.level, u.username as player_username
      FROM session_attendance sa
      JOIN characters c ON sa.character_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE sa.session_id = $1
      ORDER BY c.name
    `, [sessionId]);

    res.json({
      success: true,
      session: {
        ...result.rows[0],
        attendance: attendanceResult.rows
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle session (GM et Admin seulement)
router.post('/campaign/:campaignId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      session_number,
      title,
      description,
      session_date,
      start_time,
      end_time,
      location,
      notes,
      xp_awarded = 0,
      gold_awarded = 0
    } = req.body;

    // Validation des données requises
    if (!session_number || !session_date) {
      return res.status(400).json({ error: 'Le numéro de session et la date sont requis' });
    }

    // Vérifier que le numéro de session n'existe pas déjà
    const existingSession = await pool.query(
      'SELECT id FROM game_sessions WHERE campaign_id = $1 AND session_number = $2 AND is_active = true',
      [campaignId, session_number]
    );

    if (existingSession.rows.length > 0) {
      return res.status(400).json({ error: 'Une session avec ce numéro existe déjà' });
    }

    // Créer la session
    const result = await pool.query(`
      INSERT INTO game_sessions (
        campaign_id, session_number, title, description, session_date,
        start_time, end_time, location, notes, xp_awarded, gold_awarded
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      campaignId, session_number, title, description, session_date,
      start_time, end_time, location, notes, xp_awarded, gold_awarded
    ]);

    res.status(201).json({
      success: true,
      message: 'Session créée avec succès',
      session: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une session
router.put('/:sessionId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      title,
      description,
      session_date,
      start_time,
      end_time,
      location,
      notes,
      xp_awarded,
      gold_awarded
    } = req.body;

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = {
      title, description, session_date, start_time, end_time, location, notes, xp_awarded, gold_awarded
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
    values.push(sessionId);

    const query = `
      UPDATE game_sessions 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json({
      success: true,
      message: 'Session mise à jour avec succès',
      session: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une session
router.delete('/:sessionId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      'UPDATE game_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING session_number',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json({
      success: true,
      message: `Session ${result.rows[0].session_number} supprimée avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Gérer la présence des personnages à une session
router.post('/:sessionId/attendance', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { character_id, attended = true, xp_earned = 0, gold_earned = 0, notes } = req.body;

    if (!character_id) {
      return res.status(400).json({ error: 'ID du personnage requis' });
    }

    // Vérifier que le personnage est dans la campagne
    const sessionResult = await pool.query(`
      SELECT gs.campaign_id FROM game_sessions gs WHERE gs.id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const campaignId = sessionResult.rows[0].campaign_id;

    const characterInCampaign = await pool.query(
      'SELECT id FROM campaign_characters WHERE campaign_id = $1 AND character_id = $2 AND is_active = true',
      [campaignId, character_id]
    );

    if (characterInCampaign.rows.length === 0) {
      return res.status(400).json({ error: 'Ce personnage n\'est pas dans cette campagne' });
    }

    // Créer ou mettre à jour la présence
    const result = await pool.query(`
      INSERT INTO session_attendance (session_id, character_id, attended, xp_earned, gold_earned, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id, character_id) 
      DO UPDATE SET 
        attended = EXCLUDED.attended,
        xp_earned = EXCLUDED.xp_earned,
        gold_earned = EXCLUDED.gold_earned,
        notes = EXCLUDED.notes
      RETURNING *
    `, [sessionId, character_id, attended, xp_earned, gold_earned, notes]);

    res.json({
      success: true,
      message: 'Présence mise à jour',
      attendance: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la présence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des sessions (GM et Admin seulement)
router.get('/stats/overview', authenticateToken, requireRole(['gm', 'admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let whereClause = 'WHERE gs.is_active = true';
    let params = [];

    if (userRole === 'gm') {
      whereClause += ' AND c.gm_id = $1';
      params = [userId];
    }

    const totalSessions = await pool.query(`
      SELECT COUNT(*) as count 
      FROM game_sessions gs 
      JOIN campaigns c ON gs.campaign_id = c.id 
      ${whereClause}
    `, params);

    const totalXpAwarded = await pool.query(`
      SELECT SUM(xp_awarded) as total 
      FROM game_sessions gs 
      JOIN campaigns c ON gs.campaign_id = c.id 
      ${whereClause}
    `, params);

    const totalGoldAwarded = await pool.query(`
      SELECT SUM(gold_awarded) as total 
      FROM game_sessions gs 
      JOIN campaigns c ON gs.campaign_id = c.id 
      ${whereClause}
    `, params);

    const sessionsByMonth = await pool.query(`
      SELECT 
        DATE_TRUNC('month', session_date) as month,
        COUNT(*) as count
      FROM game_sessions gs 
      JOIN campaigns c ON gs.campaign_id = c.id 
      ${whereClause}
      GROUP BY DATE_TRUNC('month', session_date)
      ORDER BY month DESC
      LIMIT 12
    `, params);

    res.json({
      success: true,
      stats: {
        total_sessions: parseInt(totalSessions.rows[0].count),
        total_xp_awarded: parseInt(totalXpAwarded.rows[0].total) || 0,
        total_gold_awarded: parseFloat(totalGoldAwarded.rows[0].total) || 0,
        sessions_by_month: sessionsByMonth.rows
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des sessions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

