const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { broadcastSessionChat } = require('../ws/session-chat');
const { findSessionForChat, getChatDisplayName, displayNamesForUserIds } = require('../lib/session-chat-access');
const { CHAT_UPLOAD_ROOT, chatImageUploadMiddleware } = require('../lib/session-chat-upload');

const router = express.Router();

function chatAttachmentPath(sessionId, filename) {
  return `/api/sessions/${sessionId}/chat/attachments/${encodeURIComponent(filename)}`;
}

function formatChatMessage(row, sessionId, display_name) {
  const o = {
    id: row.id,
    user_id: row.userId,
    display_name,
    body: row.body ?? '',
    created_at: row.createdAt.toISOString(),
  };
  if (row.imageKey) {
    o.image_url = chatAttachmentPath(sessionId, row.imageKey);
  }
  return o;
}

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

// Obtenir les sessions actives accessibles à l'utilisateur (admin/gm/user)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role_name;
    const userId = req.user.id;

    const where =
      role === 'admin'
        ? { isActive: true, campaign: { isActive: true } }
        : role === 'gm'
          ? { isActive: true, campaign: { isActive: true, gmId: userId } }
          : {
              isActive: true,
              campaign: {
                isActive: true,
                characters: {
                  some: {
                    isActive: true,
                    character: { userId, isActive: true },
                  },
                },
              },
            };

    const sessions = await prisma.gameSession.findMany({
      where,
      include: {
        campaign: {
          select: { id: true, name: true, status: true, gmId: true },
        },
      },
      orderBy: [{ sessionDate: 'desc' }, { sessionNumber: 'desc' }],
    });

    res.json({
      success: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        campaign_id: s.campaignId,
        campaign_name: s.campaign?.name ?? null,
        campaign_status: s.campaign?.status ?? null,
        session_number: s.sessionNumber,
        title: s.title,
        session_date: s.sessionDate,
        is_active: s.isActive,
      })),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions actives:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

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

// ——— Chat session live (historique HTTP + push WebSocket) ———

router.get('/:sessionId/chat/attachments/:filename', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const safeName = path.basename(req.params.filename || '');
    if (!safeName || safeName !== req.params.filename) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }

    const session = await findSessionForChat(sessionId, req.user);
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const dir = path.join(CHAT_UPLOAD_ROOT, String(sessionId));
    const filePath = path.join(dir, safeName);
    const resolvedFile = path.resolve(filePath);
    const resolvedDir = path.resolve(dir);
    if (!resolvedFile.startsWith(resolvedDir)) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    try {
      await fs.access(resolvedFile);
    } catch {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    const ext = path.extname(safeName).toLowerCase();
    const ct =
      ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(resolvedFile);
  } catch (error) {
    console.error('Erreur chat attachment:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:sessionId/chat/messages', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const session = await findSessionForChat(sessionId, req.user);
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const beforeId = req.query.before_id != null ? parseInt(req.query.before_id, 10) : null;

    const where = { sessionId };
    if (beforeId != null && !Number.isNaN(beforeId)) where.id = { lt: beforeId };

    const rows = await prisma.sessionChatMessage.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit,
    });

    const chronological = [...rows].reverse();
    const displayByUser = await displayNamesForUserIds(
      sessionId,
      chronological.map((r) => r.userId),
    );

    const messages = chronological.map((row) =>
      formatChatMessage(row, sessionId, displayByUser[row.userId] ?? 'Joueur'),
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Erreur chat GET messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:sessionId/chat/messages', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const raw = String(req.body?.body ?? '').trim();
    if (!raw) return res.status(400).json({ error: 'Message vide' });
    if (raw.length > 2000) return res.status(400).json({ error: 'Message trop long (2000 caractères max)' });

    const session = await findSessionForChat(sessionId, req.user);
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const msg = await prisma.sessionChatMessage.create({
      data: { sessionId, userId: req.user.id, body: raw, imageKey: null },
    });

    const display_name = await getChatDisplayName(sessionId, req.user.id);
    const payload = formatChatMessage(msg, sessionId, display_name);

    broadcastSessionChat(sessionId, { type: 'chat_message', message: payload });

    res.status(201).json({ success: true, message: payload });
  } catch (error) {
    console.error('Erreur chat POST message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post(
  '/:sessionId/chat/messages/upload',
  authenticateToken,
  chatImageUploadMiddleware,
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

      if (!req.file?.filename) {
        return res.status(400).json({ error: 'Fichier image requis' });
      }

      const caption = String(req.body?.body ?? '').trim();
      if (caption.length > 2000) {
        try {
          await fs.unlink(req.file.path);
        } catch {
          /* ignore */
        }
        return res.status(400).json({ error: 'Légende trop longue (2000 caractères max)' });
      }

      const session = await findSessionForChat(sessionId, req.user);
      if (!session) {
        try {
          await fs.unlink(req.file.path);
        } catch {
          /* ignore */
        }
        return res.status(404).json({ error: 'Session non trouvée' });
      }

      const msg = await prisma.sessionChatMessage.create({
        data: {
          sessionId,
          userId: req.user.id,
          body: caption,
          imageKey: req.file.filename,
        },
      });

      const display_name = await getChatDisplayName(sessionId, req.user.id);
      const payload = formatChatMessage(msg, sessionId, display_name);

      broadcastSessionChat(sessionId, { type: 'chat_message', message: payload });

      res.status(201).json({ success: true, message: payload });
    } catch (error) {
      console.error('Erreur chat POST image:', error);
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch {
          /* ignore */
        }
      }
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
);

// Obtenir une session par ID
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const role = req.user.role_name;
    const userId = req.user.id;
    const accessWhere =
      role === 'admin'
        ? {}
        : role === 'gm'
          ? { campaign: { gmId: userId } }
          : { attendance: { some: { character: { userId, isActive: true } } } };

    const session = await prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        ...accessWhere,
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            gmId: true,
            characters: {
              where: { isActive: true, character: { isActive: true } },
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
        },
        attendance: {
          include: {
            character: {
              include: {
                user: {
                  select: { id: true, username: true },
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
      character_user_id: a.character?.user?.id ?? null,
      player_username: a.character?.user?.username,
    }));

    const campaignCharacters = (session.campaign.characters || []).map((link) => ({
      id: link.id,
      campaign_id: link.campaignId,
      character_id: link.characterId,
      character_name: link.character?.name ?? null,
      class: link.character?.class ?? null,
      level: link.character?.level ?? null,
      race: link.character?.race ?? null,
      player_username: link.character?.user?.username ?? null,
    }));

    res.json({
      success: true,
      session: {
        ...formatSession(session, {
          campaign_id: session.campaign.id,
          campaign_name: session.campaign.name,
          gm_id: session.campaign.gmId,
        }),
        attendance,
        campaign_characters: campaignCharacters,
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
      is_active,
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
    if (is_active !== undefined) updateData.isActive = Boolean(is_active);

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

// État de jeu d'un personnage dans UNE campagne/session (PDV restants, dés de vie restants)
router.get('/:sessionId/characters/:characterId/state', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const characterId = parseInt(req.params.characterId, 10);
    if (Number.isNaN(sessionId) || Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
      include: { campaign: { select: { id: true, gmId: true, isActive: true } } },
    });
    if (!session || !session.campaign?.isActive) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const campaignCharacter = await prisma.campaignCharacter.findFirst({
      where: { campaignId: session.campaignId, characterId, isActive: true },
      include: {
        character: {
          select: { id: true, userId: true, hitPoints: true, hitDice: true, currentHitPoints: true, hitDiceRemaining: true, isActive: true },
        },
      },
    });
    if (!campaignCharacter || !campaignCharacter.character?.isActive) {
      return res.status(404).json({ error: 'Personnage non trouvé dans cette campagne' });
    }

    const user = req.user;
    const isAdmin = user.role_name === 'admin';
    const isOwnerGm = user.role_name === 'gm' && session.campaign.gmId === user.id;
    const isCharacterOwner = campaignCharacter.character.userId === user.id;
    if (!isAdmin && !isOwnerGm && !isCharacterOwner) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const hitDiceRaw = campaignCharacter.character.hitDice || null;
    const hitDiceMaxMatch = typeof hitDiceRaw === 'string' ? hitDiceRaw.trim().match(/^(\d+)\s*d\s*\d+$/i) : null;
    const hitDiceMax = hitDiceMaxMatch ? Number.parseInt(hitDiceMaxMatch[1], 10) : null;

    res.json({
      success: true,
      state: {
        session_id: sessionId,
        campaign_id: session.campaignId,
        character_id: characterId,
        current_hit_points:
          campaignCharacter.currentHitPoints ??
          campaignCharacter.character.currentHitPoints ??
          campaignCharacter.character.hitPoints ??
          null,
        max_hit_points: campaignCharacter.character.hitPoints ?? null,
        hit_dice: hitDiceRaw,
        hit_dice_remaining:
          campaignCharacter.hitDiceRemaining ??
          campaignCharacter.character.hitDiceRemaining ??
          hitDiceMax,
        hit_dice_max: hitDiceMax,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'état de personnage en session:", error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:sessionId/characters/:characterId/state', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const characterId = parseInt(req.params.characterId, 10);
    if (Number.isNaN(sessionId) || Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
      include: { campaign: { select: { id: true, gmId: true, isActive: true } } },
    });
    if (!session || !session.campaign?.isActive) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const campaignCharacter = await prisma.campaignCharacter.findFirst({
      where: { campaignId: session.campaignId, characterId, isActive: true },
      include: {
        character: { select: { id: true, userId: true, hitDice: true, isActive: true } },
      },
    });
    if (!campaignCharacter || !campaignCharacter.character?.isActive) {
      return res.status(404).json({ error: 'Personnage non trouvé dans cette campagne' });
    }

    const user = req.user;
    const isAdmin = user.role_name === 'admin';
    const isOwnerGm = user.role_name === 'gm' && session.campaign.gmId === user.id;
    const isCharacterOwner = campaignCharacter.character.userId === user.id;
    if (!isAdmin && !isOwnerGm && !isCharacterOwner) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { current_hit_points, currentHitPoints, hit_dice_remaining, hitDiceRemaining } = req.body;
    const updateData = {};
    if (current_hit_points !== undefined || currentHitPoints !== undefined) {
      const parsed = Number.parseInt(String(current_hit_points ?? currentHitPoints), 10);
      updateData.currentHitPoints = Number.isFinite(parsed) ? parsed : null;
    }
    if (hit_dice_remaining !== undefined || hitDiceRemaining !== undefined) {
      const parsed = Number.parseInt(String(hit_dice_remaining ?? hitDiceRemaining), 10);
      updateData.hitDiceRemaining = Number.isFinite(parsed) ? parsed : null;
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const updated = await prisma.campaignCharacter.update({
      where: { campaignId_characterId: { campaignId: session.campaignId, characterId } },
      data: updateData,
      include: { character: { select: { hitPoints: true, hitDice: true } } },
    });

    const hitDiceRaw = updated.character.hitDice || null;
    const hitDiceMaxMatch = typeof hitDiceRaw === 'string' ? hitDiceRaw.trim().match(/^(\d+)\s*d\s*\d+$/i) : null;
    const hitDiceMax = hitDiceMaxMatch ? Number.parseInt(hitDiceMaxMatch[1], 10) : null;

    res.json({
      success: true,
      state: {
        session_id: sessionId,
        campaign_id: session.campaignId,
        character_id: characterId,
        current_hit_points: updated.currentHitPoints,
        max_hit_points: updated.character.hitPoints ?? null,
        hit_dice: hitDiceRaw,
        hit_dice_remaining: updated.hitDiceRemaining,
        hit_dice_max: hitDiceMax,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'état de personnage en session:", error);
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
