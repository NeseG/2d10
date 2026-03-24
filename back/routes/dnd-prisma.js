const express = require('express');
const dndService = require('../services/dndService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function parseListParams(query) {
  const { limit = 20, page = 1 } = query;
  return {
    limit: parseInt(limit, 10),
    page: parseInt(page, 10),
  };
}

function sendServiceResult(res, result) {
  if (result.success) {
    return res.json({
      success: true,
      data: result.data.results || result.data,
      count: result.data.count || (result.data.results ? result.data.results.length : 0),
      next: result.data.next,
      previous: result.data.previous,
    });
  }

  return res.status(result.status).json({
    success: false,
    error: result.error,
  });
}

// === ROUTES POUR LES SORTS ===
router.get('/spells', authenticateToken, async (req, res) => {
  try {
    const { level, school, search } = req.query;
    const params = parseListParams(req.query);
    if (level) params.level = level;
    if (school) params.school = school;
    if (search) params.search = search;

    const result = await dndService.getSpells(params);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error('Erreur lors de la récupération des sorts:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/spells/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getSpellById(id);

    if (result.success) {
      return res.json({
        success: true,
        data: dndService.formatSpellForDisplay(result.data),
      });
    }

    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du sort:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES MONSTRES ===
router.get('/monsters', authenticateToken, async (req, res) => {
  try {
    const { challenge_rating, type, search } = req.query;
    const params = parseListParams(req.query);
    if (challenge_rating) params.challenge_rating = challenge_rating;
    if (type) params.type = type;
    if (search) params.search = search;

    const result = await dndService.getMonsters(params);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error('Erreur lors de la récupération des monstres:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/monsters/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getMonsterById(id);

    if (result.success) {
      return res.json({
        success: true,
        data: dndService.formatMonsterForDisplay(result.data),
      });
    }

    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du monstre:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES ARMES ===
router.get('/weapons', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    const params = parseListParams(req.query);
    if (category) params.category = category;
    if (search) params.search = search;

    const result = await dndService.getWeapons(params);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error('Erreur lors de la récupération des armes:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/weapons/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getWeaponById(id);

    if (result.success) {
      return res.json({
        success: true,
        data: dndService.formatWeaponForDisplay(result.data),
      });
    }

    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'arme:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES ARMURES ===
router.get('/armor', authenticateToken, async (req, res) => {
  try {
    const { armor_category, search } = req.query;
    const params = parseListParams(req.query);
    if (armor_category) params.armor_category = armor_category;
    if (search) params.search = search;

    const result = await dndService.getArmor(params);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error('Erreur lors de la récupération des armures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/armor/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getArmorById(id);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
      });
    }

    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'armure:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES RACES ===
router.get('/races', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    const params = parseListParams(req.query);
    if (search) params.search = search;

    const result = await dndService.getRaces(params);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error('Erreur lors de la récupération des races:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/races/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getRaceById(id);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
      });
    }

    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la race:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES CLASSES ===
router.get('/classes', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    const params = parseListParams(req.query);
    if (search) params.search = search;

    const result = await dndService.getClasses(params);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error('Erreur lors de la récupération des classes:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dndService.getClassById(id);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
      });
    }

    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la classe:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTE DE RECHERCHE GLOBALE ===
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, types } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre de recherche "q" requis',
      });
    }

    const searchTypes = types ? String(types).split(',') : [];
    const result = await dndService.globalSearch(query, searchTypes);

    return res.json({
      success: true,
      query,
      results: result,
    });
  } catch (error) {
    console.error('Erreur lors de la recherche globale:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// === ROUTE D'INFORMATION SUR L'API ===
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const result = await dndService.makeRequest('/');

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        message: 'API Open5e intégrée avec succès',
      });
    }

    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des informations API:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
