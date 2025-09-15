const express = require('express');
const dndService = require('../services/dndService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// === ROUTES POUR LES SORTS ===

// Obtenir tous les sorts avec filtres
router.get('/spells', authenticateToken, async (req, res) => {
  try {
    const { level, school, search, limit = 20, page = 1 } = req.query;
    
    const params = {
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    if (level) params.level = level;
    if (school) params.school = school;
    if (search) params.search = search;

    const result = await dndService.getSpells(params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.results || result.data,
        count: result.data.count || (result.data.results ? result.data.results.length : 0),
        next: result.data.next,
        previous: result.data.previous
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des sorts:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir un sort par ID
router.get('/spells/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getSpellById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: dndService.formatSpellForDisplay(result.data)
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du sort:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES MONSTRES ===

// Obtenir tous les monstres avec filtres
router.get('/monsters', authenticateToken, async (req, res) => {
  try {
    const { challenge_rating, type, search, limit = 20, page = 1 } = req.query;
    
    const params = {
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    if (challenge_rating) params.challenge_rating = challenge_rating;
    if (type) params.type = type;
    if (search) params.search = search;

    const result = await dndService.getMonsters(params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.results || result.data,
        count: result.data.count || (result.data.results ? result.data.results.length : 0),
        next: result.data.next,
        previous: result.data.previous
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des monstres:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir un monstre par ID
router.get('/monsters/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getMonsterById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: dndService.formatMonsterForDisplay(result.data)
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du monstre:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES ARMES ===

// Obtenir toutes les armes
router.get('/weapons', authenticateToken, async (req, res) => {
  try {
    const { category, search, limit = 20, page = 1 } = req.query;
    
    const params = {
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    if (category) params.category = category;
    if (search) params.search = search;

    const result = await dndService.getWeapons(params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.results || result.data,
        count: result.data.count || (result.data.results ? result.data.results.length : 0),
        next: result.data.next,
        previous: result.data.previous
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des armes:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir une arme par ID
router.get('/weapons/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getWeaponById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: dndService.formatWeaponForDisplay(result.data)
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'arme:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES ARMURES ===

// Obtenir toutes les armures
router.get('/armor', authenticateToken, async (req, res) => {
  try {
    const { armor_category, search, limit = 20, page = 1 } = req.query;
    
    const params = {
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    if (armor_category) params.armor_category = armor_category;
    if (search) params.search = search;

    const result = await dndService.getArmor(params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.results || result.data,
        count: result.data.count || (result.data.results ? result.data.results.length : 0),
        next: result.data.next,
        previous: result.data.previous
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des armures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir une armure par ID
router.get('/armor/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getArmorById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'armure:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES RACES ===

// Obtenir toutes les races
router.get('/races', authenticateToken, async (req, res) => {
  try {
    const { search, limit = 20, page = 1 } = req.query;
    
    const params = {
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    if (search) params.search = search;

    const result = await dndService.getRaces(params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.results || result.data,
        count: result.data.count || (result.data.results ? result.data.results.length : 0),
        next: result.data.next,
        previous: result.data.previous
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des races:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir une race par ID
router.get('/races/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getRaceById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la race:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES CLASSES ===

// Obtenir toutes les classes
router.get('/classes', authenticateToken, async (req, res) => {
  try {
    const { search, limit = 20, page = 1 } = req.query;
    
    const params = {
      limit: parseInt(limit),
      page: parseInt(page)
    };
    
    if (search) params.search = search;

    const result = await dndService.getClasses(params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.results || result.data,
        count: result.data.count || (result.data.results ? result.data.results.length : 0),
        next: result.data.next,
        previous: result.data.previous
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des classes:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir une classe par ID
router.get('/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getClassById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la classe:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTE DE RECHERCHE GLOBALE ===

// Recherche globale dans toutes les catégories
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, types } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre de recherche "q" requis'
      });
    }

    const searchTypes = types ? types.split(',') : [];
    const result = await dndService.globalSearch(query, searchTypes);
    
    res.json({
      success: true,
      query,
      results: result
    });
  } catch (error) {
    console.error('Erreur lors de la recherche globale:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTE D'INFORMATION SUR L'API ===

// Obtenir les informations sur l'API Open5e
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const result = await dndService.makeRequest('/');
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'API Open5e intégrée avec succès'
      });
    } else {
      res.status(result.status).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des informations API:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
