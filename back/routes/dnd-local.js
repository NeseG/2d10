const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// === ROUTES POUR LES DONNÉES D&D LOCALES ===

// Obtenir tous les sorts locaux
router.get('/spells', authenticateToken, async (req, res) => {
  try {
    const { level, school, search, limit = 20, page = 1 } = req.query;
    
    let query = 'SELECT * FROM dnd_spells WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (level) {
      paramCount++;
      query += ` AND level = $${paramCount}`;
      params.push(level);
    }
    
    if (school) {
      paramCount++;
      query += ` AND school = $${paramCount}`;
      params.push(school);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sorts:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir un sort local par slug
router.get('/spells/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await pool.query('SELECT * FROM dnd_spells WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sort non trouvé' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du sort:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir tous les monstres locaux
router.get('/monsters', authenticateToken, async (req, res) => {
  try {
    const { challenge_rating, type, search, limit = 20, page = 1 } = req.query;
    
    let query = 'SELECT * FROM dnd_monsters WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (challenge_rating) {
      paramCount++;
      query += ` AND challenge_rating = $${paramCount}`;
      params.push(challenge_rating);
    }
    
    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des monstres:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir un monstre local par slug
router.get('/monsters/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await pool.query('SELECT * FROM dnd_monsters WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Monstre non trouvé' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du monstre:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir toutes les armes locales
router.get('/weapons', authenticateToken, async (req, res) => {
  try {
    const { category, search, limit = 20, page = 1 } = req.query;
    
    let query = 'SELECT * FROM dnd_weapons WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des armes:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir une arme locale par slug
router.get('/weapons/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await pool.query('SELECT * FROM dnd_weapons WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Arme non trouvée' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'arme:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir toutes les armures locales
router.get('/armor', authenticateToken, async (req, res) => {
  try {
    const { armor_category, search, limit = 20, page = 1 } = req.query;
    
    let query = 'SELECT * FROM dnd_armor WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (armor_category) {
      paramCount++;
      query += ` AND armor_category = $${paramCount}`;
      params.push(armor_category);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des armures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir une armure locale par slug
router.get('/armor/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await pool.query('SELECT * FROM dnd_armor WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Armure non trouvée' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'armure:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Recherche globale dans les données locales
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, types } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre de recherche "q" requis'
      });
    }

    const searchTypes = types ? types.split(',') : ['spells', 'monsters', 'weapons', 'armor', 'items'];
    const results = {};
    
    for (const type of searchTypes) {
      try {
        let tableName, nameField;
        
        switch (type) {
          case 'spells':
            tableName = 'dnd_spells';
            nameField = 'name';
            break;
          case 'monsters':
            tableName = 'dnd_monsters';
            nameField = 'name';
            break;
          case 'weapons':
            tableName = 'dnd_weapons';
            nameField = 'name';
            break;
          case 'armor':
            tableName = 'dnd_armor';
            nameField = 'name';
            break;
          case 'items':
            tableName = 'dnd_items';
            nameField = 'name';
            break;
          default:
            continue;
        }
        
        const result = await pool.query(
          `SELECT * FROM ${tableName} WHERE ${nameField} ILIKE $1 OR description ILIKE $1 LIMIT 10`,
          [`%${query}%`]
        );
        
        results[type] = result.rows;
      } catch (error) {
        console.error(`Erreur recherche ${type}:`, error.message);
        results[type] = [];
      }
    }
    
    res.json({
      success: true,
      query,
      results
    });
  } catch (error) {
    console.error('Erreur lors de la recherche globale:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir tous les items locaux
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const { category, rarity, search, limit = 20, page = 1 } = req.query;
    
    let query = 'SELECT * FROM dnd_items WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }
    
    if (rarity) {
      paramCount++;
      query += ` AND rarity = $${paramCount}`;
      params.push(rarity);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des items:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir un item spécifique par slug
router.get('/items/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT * FROM dnd_items WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item non trouvé' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'item:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Statistiques des données locales
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};
    
    const tables = ['dnd_spells', 'dnd_monsters', 'dnd_weapons', 'dnd_armor', 'dnd_items'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const tableName = table.replace('dnd_', '');
        stats[tableName] = parseInt(result.rows[0].count);
      } catch (error) {
        stats[table.replace('dnd_', '')] = 0;
      }
    }
    
    res.json({
      success: true,
      data: stats,
      message: 'Statistiques des données D&D locales'
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
