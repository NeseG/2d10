const express = require('express');
const { Prisma } = require('@prisma/client');
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

    const spells = await prisma.dnd5eSpellImport.findMany({
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

// Obtenir un sort local par index
router.get('/spells/:index', authenticateToken, async (req, res) => {
  try {
    const { index } = req.params;
    const spell = await prisma.dnd5eSpellImport.findUnique({ where: { index } });

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
            results[type] = await prisma.dnd5eSpellImport.findMany({
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
            results[type] = await prisma.$queryRaw`
              SELECT * FROM dnd_items
              WHERE name ILIKE ${`%${query}%`} OR description ILIKE ${`%${query}%`}
              LIMIT 10
            `;
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

    const conditions = [Prisma.sql`1 = 1`];

    if (category) {
      conditions.push(Prisma.sql`category = ${category}`);
    }

    if (rarity) {
      conditions.push(Prisma.sql`rarity = ${rarity}`);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(Prisma.sql`(name ILIKE ${searchTerm} OR description ILIKE ${searchTerm})`);
    }

    const items = await prisma.$queryRaw`
      SELECT * FROM dnd_items
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY name
      LIMIT ${limit}
      OFFSET ${skip}
    `;

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
    const result = await prisma.$queryRaw`SELECT * FROM dnd_items WHERE slug = ${slug}`;

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
    const [spells, monsters, weapons, armor, itemsRaw] = await Promise.all([
      prisma.dnd5eSpellImport.count(),
      prisma.dndMonster.count(),
      prisma.dndWeapon.count(),
      prisma.dndArmor.count(),
      prisma.$queryRaw`SELECT COUNT(*) as count FROM dnd_items`,
    ]);

    const stats = {
      spells,
      monsters,
      weapons,
      armor,
      items: Number.parseInt(itemsRaw[0].count, 10),
    };

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
