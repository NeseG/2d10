const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Obtenir tous les personnages
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let whereClause = {};
    
    // Les admins et GM peuvent voir tous les personnages
    if (userRole !== 'admin' && userRole !== 'gm') {
      whereClause.userId = userId;
    }

    const characters = await prisma.character.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        grimoire: {
          select: {
            id: true,
            spellName: true,
            spellLevel: true,
            isPrepared: true,
            isKnown: true
          }
        },
        inventory: {
          include: {
            item: true
          }
        },
        purse: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      characters,
      count: characters.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un personnage
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, race, class: characterClass, level, background, alignment,
      experiencePoints, hitPoints, armorClass, speed,
      strength, dexterity, constitution, intelligence, wisdom, charisma,
      description, notes
    } = req.body;

    // Validation des données requises
    if (!name || !race || !characterClass || level === undefined) {
      return res.status(400).json({ error: 'Nom, race, classe et niveau sont requis' });
    }

    const character = await prisma.character.create({
      data: {
        userId,
        name,
        race,
        class: characterClass,
        level,
        background,
        alignment,
        experiencePoints: experiencePoints || 0,
        hitPoints,
        armorClass,
        speed,
        strength,
        dexterity,
        constitution,
        intelligence,
        wisdom,
        charisma,
        description,
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Créer la bourse du personnage
    await prisma.purse.create({
      data: {
        characterId: character.id,
        gold: 0,
        silver: 0,
        copper: 0,
        platinum: 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'Personnage créé avec succès',
      character
    });
  } catch (error) {
    console.error('Erreur lors de la création du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un personnage par ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    const character = await prisma.character.findFirst({
      where: {
        id: parseInt(id),
        ...(userRole !== 'admin' && userRole !== 'gm' ? { userId } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        grimoire: {
          include: {
            // Note: relation avec DndSpell si nécessaire
          }
        },
        inventory: {
          include: {
            item: {
              include: {
                type: true
              }
            }
          }
        },
        equipment: {
          include: {
            item: true,
            slot: true
          }
        },
        purse: true,
        campaignCharacters: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!character) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    res.json({
      success: true,
      character
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un personnage
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Vérifier que l'utilisateur peut modifier ce personnage
    const existingCharacter = await prisma.character.findFirst({
      where: {
        id: parseInt(id),
        ...(userRole !== 'admin' && userRole !== 'gm' ? { userId } : {})
      }
    });

    if (!existingCharacter) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    const updatedCharacter = await prisma.character.update({
      where: { id: parseInt(id) },
      data: {
        ...req.body,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Personnage modifié avec succès',
      character: updatedCharacter
    });
  } catch (error) {
    console.error('Erreur lors de la modification du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un personnage
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Vérifier que l'utilisateur peut supprimer ce personnage
    const existingCharacter = await prisma.character.findFirst({
      where: {
        id: parseInt(id),
        ...(userRole !== 'admin' && userRole !== 'gm' ? { userId } : {})
      }
    });

    if (!existingCharacter) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    await prisma.character.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Personnage supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques des personnages
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let whereClause = {};
    if (userRole !== 'admin' && userRole !== 'gm') {
      whereClause.userId = userId;
    }

    const [
      totalCharacters,
      charactersByClass,
      charactersByRace,
      averageLevel
    ] = await Promise.all([
      prisma.character.count({ where: whereClause }),
      prisma.character.groupBy({
        by: ['class'],
        where: whereClause,
        _count: { class: true }
      }),
      prisma.character.groupBy({
        by: ['race'],
        where: whereClause,
        _count: { race: true }
      }),
      prisma.character.aggregate({
        where: whereClause,
        _avg: { level: true }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalCharacters,
        charactersByClass,
        charactersByRace,
        averageLevel: averageLevel._avg.level || 0
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

