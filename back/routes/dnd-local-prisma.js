const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function parsePagination(query) {
  const limit = Number.parseInt(query.limit, 10) || 20;
  const page = Number.parseInt(query.page, 10) || 1;
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

// === ROUTES POUR LES DONNÉES D&D LOCALES ===

// Obtenir tous les sorts locaux
router.get('/spells', authenticateToken, async (req, res) => {
  try {
    const { level, school, search } = req.query;
    const { limit, page, skip } = parsePagination(req.query);

    const where = {};
    if (level !== undefined) where.level = Number.parseInt(level, 10);
    if (school) where.school = school;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const spells = await prisma.dndSpell.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip,
    });

    res.json({
      success: true,
      data: spells,
      count: spells.length,
      page,
      limit,
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
    const spell = await prisma.dndSpell.findUnique({ where: { slug } });

    if (!spell) {
      return res.status(404).json({ success: false, error: 'Sort non trouvé' });
    }

    res.json({
      success: true,
      data: spell,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du sort:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir tous les monstres locaux
router.get('/monsters', authenticateToken, async (req, res) => {
  try {
    const { challenge_rating, type, search } = req.query;
    const { limit, page, skip } = parsePagination(req.query);

    const where = {};
    if (challenge_rating) where.challengeRating = challenge_rating;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const monsters = await prisma.dndMonster.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip,
    });

    res.json({
      success: true,
      data: monsters,
      count: monsters.length,
      page,
      limit,
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
    const monster = await prisma.dndMonster.findUnique({ where: { slug } });

    if (!monster) {
      return res.status(404).json({ success: false, error: 'Monstre non trouvé' });
    }

    res.json({
      success: true,
      data: monster,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du monstre:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir toutes les armes locales
router.get('/weapons', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    const { limit, page, skip } = parsePagination(req.query);

    const where = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const weapons = await prisma.dndWeapon.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip,
    });

    res.json({
      success: true,
      data: weapons,
      count: weapons.length,
      page,
      limit,
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
    const weapon = await prisma.dndWeapon.findUnique({ where: { slug } });

    if (!weapon) {
      return res.status(404).json({ success: false, error: 'Arme non trouvée' });
    }

    res.json({
      success: true,
      data: weapon,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'arme:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir toutes les armures locales
router.get('/armor', authenticateToken, async (req, res) => {
  try {
    const { armor_category, search } = req.query;
    const { limit, page, skip } = parsePagination(req.query);

    const where = {};
    if (armor_category) where.category = armor_category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const armor = await prisma.dndArmor.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip,
    });

    res.json({
      success: true,
      data: armor,
      count: armor.length,
      page,
      limit,
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
    const armor = await prisma.dndArmor.findUnique({ where: { slug } });

    if (!armor) {
      return res.status(404).json({ success: false, error: 'Armure non trouvée' });
    }

    res.json({
      success: true,
      data: armor,
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
        error: 'Paramètre de recherche "q" requis',
      });
    }

    const searchTypes = types ? String(types).split(',') : ['spells', 'monsters', 'weapons', 'armor', 'items'];
    const results = {};

    for (const type of searchTypes) {
      try {
        switch (type) {
          case 'spells':
            results[type] = await prisma.dndSpell.findMany({
              where: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: 10,
            });
            break;
          case 'monsters':
            results[type] = await prisma.dndMonster.findMany({
              where: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: 10,
            });
            break;
          case 'weapons':
            results[type] = await prisma.dndWeapon.findMany({
              where: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: 10,
            });
            break;
          case 'armor':
            results[type] = await prisma.dndArmor.findMany({
              where: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              },
              take: 10,
            });
            break;
          case 'items':
            results[type] = await prisma.$queryRawUnsafe(
              'SELECT * FROM dnd_items WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 10',
              `%${query}%`,
            );
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Erreur recherche ${type}:`, error.message);
        results[type] = [];
      }
    }

    res.json({
      success: true,
      query,
      results,
    });
  } catch (error) {
    console.error('Erreur lors de la recherche globale:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir tous les items locaux
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const { category, rarity, search } = req.query;
    const { limit, page, skip } = parsePagination(req.query);

    const conditions = [];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (rarity) {
      params.push(rarity);
      conditions.push(`rarity = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    params.push(limit);
    params.push(skip);
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = await prisma.$queryRawUnsafe(
      `SELECT * FROM dnd_items ${whereSql} ORDER BY name LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    res.json({
      success: true,
      data: items,
      count: items.length,
      page,
      limit,
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
    const result = await prisma.$queryRawUnsafe('SELECT * FROM dnd_items WHERE slug = $1', slug);

    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, error: 'Item non trouvé' });
    }

    res.json({
      success: true,
      data: result[0],
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
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
        const tableName = table.replace('dnd_', '');
        stats[tableName] = Number.parseInt(result[0].count, 10);
      } catch (error) {
        stats[table.replace('dnd_', '')] = 0;
      }
    }

    res.json({
      success: true,
      data: stats,
      message: 'Statistiques des données D&D locales',
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
