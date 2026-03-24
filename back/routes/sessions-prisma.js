const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function formatSession(session, extras = {}) {
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
    ...extras,
  };
}

async function getAccessibleCampaign(campaignId, user) {
  return prisma.campaign.findFirst({
    where: {
      id: campaignId,
      isActive: true,
      ...(user.role_name === 'admin' ? {} : { gmId: user.id }),
    },
  });
}

async function checkCampaignOwnership(req, res, next) {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    if (Number.isNaN(campaignId)) {
      return res.status(400).json({ error: 'ID de campagne invalide' });
    }

    if (req.user.role_name === 'admin') return next();

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, isActive: true },
      select: { gmId: true },
    });

    if (!campaign) return res.status(404).json({ error: 'Campagne non trouvée' });
    if (campaign.gmId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé. Vous n\'êtes pas le GM de cette campagne.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété de campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function checkSessionOwnership(req, res, next) {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID de session invalide' });
    }

    if (req.user.role_name === 'admin') return next();

    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
      include: { campaign: { select: { gmId: true, isActive: true } } },
    });

    if (!session || !session.campaign?.isActive) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }
    if (session.campaign.gmId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé. Vous n\'êtes pas le GM de cette campagne.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété de session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Obtenir toutes les sessions d'une campagne
router.get('/campaign/:campaignId', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    if (Number.isNaN(campaignId)) return res.status(400).json({ error: 'ID de campagne invalide' });

    const campaign = await getAccessibleCampaign(campaignId, req.user);
    if (!campaign) return res.status(404).json({ error: 'Campagne non trouvée' });

    const sessions = await prisma.gameSession.findMany({
      where: { campaignId, isActive: true },
      orderBy: { sessionNumber: 'asc' },
    });

    res.json({
      success: true,
      sessions: sessions.map((s) => formatSession(s)),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir une session par ID
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const session = await prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        ...(req.user.role_name === 'admin' ? {} : { campaign: { gmId: req.user.id } }),
      },
      include: {
        campaign: {
          select: {
            name: true,
            gmId: true,
          },
        },
        attendance: {
          include: {
            character: {
              include: {
                user: {
                  select: { username: true },
                },
              },
            },
          },
          orderBy: {
            character: { name: 'asc' },
          },
        },
      },
    });

    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const attendance = session.attendance.map((a) => ({
      id: a.id,
      session_id: a.sessionId,
      character_id: a.characterId,
      attended: a.attended,
      xp_earned: a.xpEarned,
      gold_earned: a.goldEarned,
      notes: a.notes,
      character_name: a.character?.name,
      class: a.character?.class,
      level: a.character?.level,
      player_username: a.character?.user?.username,
    }));

    res.json({
      success: true,
      session: {
        ...formatSession(session, {
          campaign_name: session.campaign.name,
          gm_id: session.campaign.gmId,
        }),
        attendance,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle session (GM/Admin)
router.post('/campaign/:campaignId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
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
      gold_awarded = 0,
    } = req.body;

    if (!session_number || !session_date) {
      return res.status(400).json({ error: 'Le numéro de session et la date sont requis' });
    }

    const existing = await prisma.gameSession.findFirst({
      where: { campaignId, sessionNumber: session_number, isActive: true },
      select: { id: true },
    });
    if (existing) return res.status(400).json({ error: 'Une session avec ce numéro existe déjà' });

    const session = await prisma.gameSession.create({
      data: {
        campaignId,
        sessionNumber: session_number,
        title: title || `Session ${session_number}`,
        description,
        sessionDate: session_date,
        startTime: start_time,
        endTime: end_time,
        location,
        notes,
        xpAwarded: xp_awarded,
        goldAwarded: gold_awarded,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Session créée avec succès',
      session: formatSession(session),
    });
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une session
router.put('/:sessionId', authenticateToken, checkSessionOwnership, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const {
      title,
      description,
      session_date,
      start_time,
      end_time,
      location,
      notes,
      xp_awarded,
      gold_awarded,
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (session_date !== undefined) updateData.sessionDate = session_date;
    if (start_time !== undefined) updateData.startTime = start_time;
    if (end_time !== undefined) updateData.endTime = end_time;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (xp_awarded !== undefined) updateData.xpAwarded = xp_awarded;
    if (gold_awarded !== undefined) updateData.goldAwarded = gold_awarded;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const session = await prisma.gameSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Session mise à jour avec succès',
      session: formatSession(session),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une session (soft delete)
router.delete('/:sessionId', authenticateToken, checkSessionOwnership, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);

    const session = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { isActive: false },
      select: { sessionNumber: true },
    });

    res.json({
      success: true,
      message: `Session ${session.sessionNumber} supprimée avec succès`,
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Gérer la présence des personnages à une session
router.post('/:sessionId/attendance', authenticateToken, checkSessionOwnership, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const { character_id, attended = true, xp_earned = 0, gold_earned = 0, notes } = req.body;

    if (!character_id) return res.status(400).json({ error: 'ID du personnage requis' });

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: { campaignId: true },
    });
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const characterInCampaign = await prisma.campaignCharacter.findFirst({
      where: {
        campaignId: session.campaignId,
        characterId: character_id,
        isActive: true,
      },
      select: { id: true },
    });
    if (!characterInCampaign) {
      return res.status(400).json({ error: 'Ce personnage n\'est pas dans cette campagne' });
    }

    const attendance = await prisma.sessionAttendance.upsert({
      where: { sessionId_characterId: { sessionId, characterId: character_id } },
      update: { attended, xpEarned: xp_earned, goldEarned: gold_earned, notes },
      create: { sessionId, characterId: character_id, attended, xpEarned: xp_earned, goldEarned: gold_earned, notes },
    });

    res.json({
      success: true,
      message: 'Présence mise à jour',
      attendance: {
        id: attendance.id,
        session_id: attendance.sessionId,
        character_id: attendance.characterId,
        attended: attendance.attended,
        xp_earned: attendance.xpEarned,
        gold_earned: attendance.goldEarned,
        notes: attendance.notes,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la présence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des sessions (GM/Admin)
router.get('/stats/overview', authenticateToken, requireRole(['gm', 'admin']), async (req, res) => {
  try {
    const where = {
      isActive: true,
      ...(req.user.role_name === 'gm' ? { campaign: { gmId: req.user.id } } : {}),
    };

    const sessions = await prisma.gameSession.findMany({
      where,
      select: {
        sessionDate: true,
        xpAwarded: true,
        goldAwarded: true,
      },
    });

    const totalSessions = sessions.length;
    const totalXpAwarded = sessions.reduce((sum, s) => sum + (s.xpAwarded || 0), 0);
    const totalGoldAwarded = sessions.reduce((sum, s) => sum + Number(s.goldAwarded || 0), 0);

    const byMonthMap = new Map();
    sessions.forEach((s) => {
      const month = s.sessionDate?.slice(0, 7) || 'unknown';
      byMonthMap.set(month, (byMonthMap.get(month) || 0) + 1);
    });
    const sessionsByMonth = Array.from(byMonthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, count]) => ({ month, count }));

    res.json({
      success: true,
      stats: {
        total_sessions: totalSessions,
        total_xp_awarded: totalXpAwarded,
        total_gold_awarded: totalGoldAwarded,
        sessions_by_month: sessionsByMonth,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des sessions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
