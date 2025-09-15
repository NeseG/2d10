const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware pour vérifier que l'utilisateur peut accéder au personnage
const checkCharacterAccess = async (req, res, next) => {
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
    console.error('Erreur lors de la vérification d\'accès au personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Obtenir le grimoire d'un personnage
router.get('/:characterId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { level, school, prepared_only, known_only } = req.query;

    let query = `
      SELECT cg.*, 
             ds.description, ds.casting_time, ds.range, ds.components, ds.duration,
             ds.higher_level, ds.ritual, ds.concentration
      FROM character_grimoire cg
      LEFT JOIN dnd_spells ds ON cg.spell_slug = ds.slug
      WHERE cg.character_id = $1
    `;
    const params = [characterId];
    let paramCount = 1;

    if (level) {
      paramCount++;
      query += ` AND cg.spell_level = $${paramCount}`;
      params.push(level);
    }

    if (school) {
      paramCount++;
      query += ` AND cg.spell_school = $${paramCount}`;
      params.push(school);
    }

    if (prepared_only === 'true') {
      query += ` AND cg.is_prepared = true`;
    }

    if (known_only === 'true') {
      query += ` AND cg.is_known = true`;
    }

    query += ` ORDER BY cg.spell_level ASC, cg.spell_name ASC`;

    const result = await pool.query(query, params);

    // Calculer les statistiques
    const stats = {
      total_spells: result.rows.length,
      prepared_spells: result.rows.filter(spell => spell.is_prepared).length,
      known_spells: result.rows.filter(spell => spell.is_known).length,
      spells_by_level: {},
      spells_by_school: {}
    };

    result.rows.forEach(spell => {
      // Statistiques par niveau
      if (!stats.spells_by_level[spell.spell_level]) {
        stats.spells_by_level[spell.spell_level] = 0;
      }
      stats.spells_by_level[spell.spell_level]++;

      // Statistiques par école
      if (spell.spell_school) {
        if (!stats.spells_by_school[spell.spell_school]) {
          stats.spells_by_school[spell.spell_school] = 0;
        }
        stats.spells_by_school[spell.spell_school]++;
      }
    });

    res.json({
      success: true,
      grimoire: result.rows,
      stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du grimoire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un sort au grimoire
router.post('/:characterId/spells', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { 
      spell_slug, 
      spell_name, 
      spell_level, 
      spell_school, 
      is_prepared = false, 
      is_known = true, 
      notes 
    } = req.body;

    if (!spell_slug || !spell_name || spell_level === undefined) {
      return res.status(400).json({ error: 'spell_slug, spell_name et spell_level sont requis' });
    }

    // Vérifier si le sort existe déjà dans le grimoire
    const existingSpell = await pool.query(
      'SELECT id FROM character_grimoire WHERE character_id = $1 AND spell_slug = $2',
      [characterId, spell_slug]
    );

    if (existingSpell.rows.length > 0) {
      return res.status(400).json({ error: 'Ce sort est déjà dans le grimoire' });
    }

    // Récupérer les détails du sort depuis la base D&D locale
    const spellDetails = await pool.query(
      'SELECT * FROM dnd_spells WHERE slug = $1',
      [spell_slug]
    );

    const result = await pool.query(`
      INSERT INTO character_grimoire (
        character_id, spell_id, spell_slug, spell_name, spell_level, spell_school,
        is_prepared, is_known, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      characterId,
      spellDetails.rows.length > 0 ? spellDetails.rows[0].id : null,
      spell_slug,
      spell_name,
      spell_level,
      spell_school,
      is_prepared,
      is_known,
      notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Sort ajouté au grimoire',
      spell: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du sort au grimoire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un sort dans le grimoire
router.put('/:characterId/spells/:spellId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId, spellId } = req.params;
    const { 
      is_prepared, 
      is_known, 
      times_prepared, 
      times_cast, 
      notes 
    } = req.body;

    const result = await pool.query(`
      UPDATE character_grimoire 
      SET is_prepared = COALESCE($1, is_prepared),
          is_known = COALESCE($2, is_known),
          times_prepared = COALESCE($3, times_prepared),
          times_cast = COALESCE($4, times_cast),
          notes = COALESCE($5, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND character_id = $7
      RETURNING *
    `, [is_prepared, is_known, times_prepared, times_cast, notes, spellId, characterId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sort non trouvé dans le grimoire' });
    }

    res.json({
      success: true,
      message: 'Sort modifié avec succès',
      spell: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la modification du sort:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un sort du grimoire
router.delete('/:characterId/spells/:spellId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId, spellId } = req.params;

    const result = await pool.query(
      'DELETE FROM character_grimoire WHERE id = $1 AND character_id = $2 RETURNING *',
      [spellId, characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sort non trouvé dans le grimoire' });
    }

    res.json({
      success: true,
      message: 'Sort supprimé du grimoire'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du sort:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Préparer des sorts (pour les classes qui préparent)
router.post('/:characterId/prepare', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { spell_ids } = req.body; // Array des IDs des sorts à préparer

    if (!Array.isArray(spell_ids)) {
      return res.status(400).json({ error: 'spell_ids doit être un tableau' });
    }

    // Désélectionner tous les sorts préparés
    await pool.query(
      'UPDATE character_grimoire SET is_prepared = false WHERE character_id = $1',
      [characterId]
    );

    // Préparer les sorts spécifiés
    if (spell_ids.length > 0) {
      const placeholders = spell_ids.map((_, index) => `$${index + 2}`).join(',');
      await pool.query(`
        UPDATE character_grimoire 
        SET is_prepared = true, times_prepared = times_prepared + 1, updated_at = CURRENT_TIMESTAMP
        WHERE character_id = $1 AND id IN (${placeholders})
      `, [characterId, ...spell_ids]);
    }

    res.json({
      success: true,
      message: `${spell_ids.length} sorts préparés avec succès`
    });
  } catch (error) {
    console.error('Erreur lors de la préparation des sorts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Lancer un sort (incrémenter le compteur)
router.post('/:characterId/cast/:spellId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId, spellId } = req.params;

    const result = await pool.query(`
      UPDATE character_grimoire 
      SET times_cast = times_cast + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND character_id = $2
      RETURNING *
    `, [spellId, characterId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sort non trouvé dans le grimoire' });
    }

    res.json({
      success: true,
      message: 'Sort lancé avec succès',
      spell: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors du lancement du sort:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rechercher des sorts à ajouter au grimoire
router.get('/:characterId/search', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { q, level, school, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Paramètre de recherche "q" requis' });
    }

    let query = `
      SELECT ds.*, 
             CASE WHEN cg.id IS NOT NULL THEN true ELSE false END as in_grimoire,
             cg.is_prepared, cg.is_known
      FROM dnd_spells ds
      LEFT JOIN character_grimoire cg ON ds.slug = cg.spell_slug AND cg.character_id = $1
      WHERE (ds.name ILIKE $2 OR ds.description ILIKE $2)
    `;
    const params = [characterId, `%${q}%`];
    let paramCount = 2;

    if (level) {
      paramCount++;
      query += ` AND ds.level = $${paramCount}`;
      params.push(level);
    }

    if (school) {
      paramCount++;
      query += ` AND ds.school = $${paramCount}`;
      params.push(school);
    }

    query += ` ORDER BY ds.level ASC, ds.name ASC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      spells: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Erreur lors de la recherche de sorts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques du grimoire
router.get('/:characterId/stats', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const { characterId } = req.params;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_spells,
        COUNT(CASE WHEN is_prepared THEN 1 END) as prepared_spells,
        COUNT(CASE WHEN is_known THEN 1 END) as known_spells,
        SUM(times_cast) as total_casts,
        AVG(times_cast) as avg_casts_per_spell,
        spell_level,
        COUNT(*) as spells_at_level
      FROM character_grimoire 
      WHERE character_id = $1
      GROUP BY spell_level
      ORDER BY spell_level
    `, [characterId]);

    const schoolStats = await pool.query(`
      SELECT 
        spell_school,
        COUNT(*) as count,
        COUNT(CASE WHEN is_prepared THEN 1 END) as prepared_count
      FROM character_grimoire 
      WHERE character_id = $1 AND spell_school IS NOT NULL
      GROUP BY spell_school
      ORDER BY count DESC
    `, [characterId]);

    res.json({
      success: true,
      stats: {
        by_level: stats.rows,
        by_school: schoolStats.rows
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
