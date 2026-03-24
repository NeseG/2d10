const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function formatCampaign(campaign, includeGm = false) {
  const formatted = {
    id: campaign.id,
    gm_id: campaign.gmId,
    name: campaign.name,
    description: campaign.description,
    setting: campaign.setting,
    max_players: campaign.maxPlayers,
    current_players: campaign.currentPlayers,
    status: campaign.status,
    start_date: campaign.startDate,
    end_date: campaign.endDate,
    notes: campaign.notes,
    is_active: campaign.isActive,
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt,
  };

  if (includeGm && campaign.gm) {
    formatted.gm_username = campaign.gm.username;
    formatted.gm_email = campaign.gm.email;
  }

  return formatted;
}

function formatCampaignCharacter(record) {
  return {
    id: record.id,
    campaign_id: record.campaignId,
    character_id: record.characterId,
    joined_at: record.joinedAt,
    left_at: record.leftAt,
    status: record.status,
    notes: record.notes,
    is_active: record.isActive,
    character_name: record.character?.name,
    class: record.character?.class,
    level: record.character?.level,
    race: record.character?.race,
    player_username: record.character?.user?.username,
  };
}

function formatSession(session) {
  return {
    id: session.id,
    campaign_id: session.campaignId,
    session_number: session.sessionNumber,
    title: session.title,
    description: session.description,
    session_date: session.sessionDate,
    start_time: session.startTime,
    end_time: session.endTime,
    location: session.location,
    notes: session.notes,
    xp_awarded: session.xpAwarded,
    gold_awarded: session.goldAwarded,
    is_active: session.isActive,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

async function findActiveCampaign(campaignId) {
  return prisma.campaign.findFirst({
    where: {
      id: campaignId,
      isActive: true,
    },
  });
}

// Middleware pour vérifier que l'utilisateur est GM de la campagne
const checkCampaignOwnership = async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const userId = req.user.id;
    const userRole = req.user.role_name;

    if (Number.isNaN(campaignId)) {
      return res.status(400).json({ error: 'ID de campagne invalide' });
    }

    // Les admins peuvent accéder à toutes les campagnes
    if (userRole === 'admin') {
      return next();
    }

    const campaign = await findActiveCampaign(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.gmId !== userId) {
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

    const campaigns = await prisma.campaign.findMany({
      where: {
        isActive: true,
        ...(userRole === 'admin' ? {} : { gmId: userId }),
      },
      include: userRole === 'admin'
        ? {
            gm: {
              select: {
                username: true,
                email: true,
              },
            },
          }
        : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      campaigns: campaigns.map((campaign) => formatCampaign(campaign, userRole === 'admin')),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir une campagne par ID
router.get('/:campaignId', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const userId = req.user.id;
    const userRole = req.user.role_name;

    if (Number.isNaN(campaignId)) {
      return res.status(400).json({ error: 'ID de campagne invalide' });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        isActive: true,
        ...(userRole === 'admin' ? {} : { gmId: userId }),
      },
      include: {
        ...(userRole === 'admin'
          ? {
              gm: {
                select: {
                  username: true,
                  email: true,
                },
              },
            }
          : {}),
        characters: {
          where: { isActive: true },
          include: {
            character: {
              include: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        sessions: {
          where: { isActive: true },
          orderBy: {
            sessionNumber: 'asc',
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    res.json({
      success: true,
      campaign: {
        ...formatCampaign(campaign, userRole === 'admin'),
        characters: campaign.characters.map(formatCampaignCharacter),
        sessions: campaign.sessions.map(formatSession),
      },
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
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom de la campagne est requis' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        gmId: req.user.id,
        name,
        description,
        setting,
        maxPlayers: max_players,
        startDate: start_date ? new Date(start_date) : null,
        notes,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Campagne créée avec succès',
      campaign: formatCampaign(campaign),
    });
  } catch (error) {
    console.error('Erreur lors de la création de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une campagne
router.put('/:campaignId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const {
      name,
      description,
      setting,
      max_players,
      status,
      start_date,
      end_date,
      notes,
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (setting !== undefined) updateData.setting = setting;
    if (max_players !== undefined) updateData.maxPlayers = max_players;
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.startDate = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) updateData.endDate = end_date ? new Date(end_date) : null;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Campagne mise à jour avec succès',
      campaign: formatCampaign(updatedCampaign),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une campagne (désactiver)
router.delete('/:campaignId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true, isActive: true },
    });

    if (!campaign || !campaign.isActive) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: `Campagne "${campaign.name}" supprimée avec succès`,
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un personnage à une campagne
router.post('/:campaignId/characters', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const characterId = parseInt(req.body.character_id, 10);
    const { notes } = req.body;

    if (Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID du personnage requis' });
    }

    const [character, campaign] = await Promise.all([
      prisma.character.findFirst({
        where: {
          id: characterId,
          isActive: true,
        },
      }),
      prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          maxPlayers: true,
          currentPlayers: true,
          isActive: true,
        },
      }),
    ]);

    if (!character) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    if (!campaign || !campaign.isActive) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    if (campaign.currentPlayers >= campaign.maxPlayers) {
      return res.status(400).json({ error: 'La campagne a atteint le nombre maximum de joueurs' });
    }

    const existing = await prisma.campaignCharacter.findUnique({
      where: {
        campaignId_characterId: {
          campaignId,
          characterId,
        },
      },
    });

    if (existing && existing.isActive) {
      return res.status(400).json({ error: 'Ce personnage est déjà dans cette campagne' });
    }

    let campaignCharacter;
    await prisma.$transaction(async (tx) => {
      if (existing) {
        campaignCharacter = await tx.campaignCharacter.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            status: 'active',
            leftAt: null,
            joinedAt: new Date(),
            notes,
          },
        });
      } else {
        campaignCharacter = await tx.campaignCharacter.create({
          data: {
            campaignId,
            characterId,
            notes,
          },
        });
      }

      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          currentPlayers: {
            increment: 1,
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Personnage ajouté à la campagne',
      campaign_character: {
        id: campaignCharacter.id,
        campaign_id: campaignCharacter.campaignId,
        character_id: campaignCharacter.characterId,
        joined_at: campaignCharacter.joinedAt,
        left_at: campaignCharacter.leftAt,
        status: campaignCharacter.status,
        notes: campaignCharacter.notes,
        is_active: campaignCharacter.isActive,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du personnage à la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer un personnage d'une campagne
router.delete('/:campaignId/characters/:characterId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const characterId = parseInt(req.params.characterId, 10);

    if (Number.isNaN(campaignId) || Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const relation = await prisma.campaignCharacter.findFirst({
      where: {
        campaignId,
        characterId,
        isActive: true,
      },
    });

    if (!relation) {
      return res.status(404).json({ error: 'Personnage non trouvé dans cette campagne' });
    }

    await prisma.$transaction([
      prisma.campaignCharacter.update({
        where: { id: relation.id },
        data: {
          isActive: false,
          leftAt: new Date(),
          status: 'left',
        },
      }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: {
          currentPlayers: {
            decrement: 1,
          },
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Personnage retiré de la campagne',
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

    const whereClause = {
      isActive: true,
      ...(userRole === 'gm' ? { gmId: userId } : {}),
    };

    const [totalCampaigns, campaignsByStatus, campaignsBySetting, totalPlayers] = await Promise.all([
      prisma.campaign.count({
        where: whereClause,
      }),
      prisma.campaign.groupBy({
        by: ['status'],
        where: whereClause,
        _count: {
          status: true,
        },
        orderBy: {
          _count: {
            status: 'desc',
          },
        },
      }),
      prisma.campaign.groupBy({
        by: ['setting'],
        where: {
          ...whereClause,
          setting: {
            not: null,
          },
        },
        _count: {
          setting: true,
        },
        orderBy: {
          _count: {
            setting: 'desc',
          },
        },
      }),
      prisma.campaign.aggregate({
        where: whereClause,
        _sum: {
          currentPlayers: true,
        },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        total_campaigns: totalCampaigns,
        total_players: totalPlayers._sum.currentPlayers || 0,
        by_status: campaignsByStatus.map((record) => ({
          status: record.status,
          count: record._count.status,
        })),
        by_setting: campaignsBySetting.map((record) => ({
          setting: record.setting,
          count: record._count.setting,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des campagnes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
