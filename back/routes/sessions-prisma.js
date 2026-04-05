const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { broadcastSessionChat } = require('../ws/session-chat');
const { broadcastSessionInitiative } = require('../ws/session-initiative');
const { broadcastSessionMap, buildSessionMapPayload } = require('../ws/session-map');
const { findSessionForChat, getChatDisplayName, displayNamesForUserIds } = require('../lib/session-chat-access');
const { CHAT_UPLOAD_ROOT, chatImageUploadMiddleware } = require('../lib/session-chat-upload');
const { nextInventorySortOrder } = require('../lib/next-inventory-sort-order');

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

/**
 * Présence session + fiches « familier » (Character.masterCharacterId) du même joueur,
 * injectées après la ligne du personnage maître (sans ligne SessionAttendance en base).
 */
async function buildAttendancePayload(sessionId, attendanceRows) {
  const masterIds = attendanceRows.map((a) => a.characterId);
  const characterIdsInSession = new Set(masterIds);

  const pets =
    masterIds.length === 0
      ? []
      : await prisma.character.findMany({
          where: {
            masterCharacterId: { in: masterIds },
            isActive: true,
          },
          include: {
            user: { select: { id: true, username: true } },
          },
        });

  const petsByMaster = new Map();
  for (const pet of pets) {
    const mid = pet.masterCharacterId;
    if (mid == null) continue;
    if (!petsByMaster.has(mid)) petsByMaster.set(mid, []);
    petsByMaster.get(mid).push(pet);
  }

  const list = [];
  for (const a of attendanceRows) {
    list.push({
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
    });

    const masterUserId = a.character?.user?.id ?? null;
    for (const pet of petsByMaster.get(a.characterId) || []) {
      if (masterUserId != null && pet.userId !== masterUserId) continue;
      if (characterIdsInSession.has(pet.id)) continue;
      characterIdsInSession.add(pet.id);
      list.push({
        id: -pet.id,
        session_id: sessionId,
        character_id: pet.id,
        attended: false,
        xp_earned: 0,
        gold_earned: 0,
        notes: null,
        character_name: pet.name,
        class: pet.class,
        level: pet.level,
        character_user_id: pet.userId,
        player_username: pet.user?.username ?? null,
        is_companion: true,
        master_character_id: a.characterId,
      });
    }
  }
  return list;
}

/** Présence réelle ou familier dont le maître est inscrit à la session. */
async function characterParticipatesInSession(sessionId, characterId) {
  const direct = await prisma.sessionAttendance.findFirst({
    where: { sessionId, characterId },
    select: { id: true },
  });
  if (direct) return true;
  const companion = await prisma.character.findFirst({
    where: { id: characterId, isActive: true, masterCharacterId: { not: null } },
    select: { masterCharacterId: true },
  });
  if (!companion?.masterCharacterId) return false;
  const masterAtt = await prisma.sessionAttendance.findFirst({
    where: { sessionId, characterId: companion.masterCharacterId },
    select: { id: true },
  });
  return Boolean(masterAtt);
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

// Statistiques des sessions (avant les routes /:sessionId/... pour ne pas capturer "stats")
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

// ——— Initiative tracker (state HTTP + push WebSocket) ———

function filterInitiativeStateForPlayer(state) {
  if (!state || typeof state !== 'object') return state;
  const combatants = Array.isArray(state.combatants) ? state.combatants : [];
  return {
    ...state,
    combatants: combatants.filter((c) => !c?.hidden),
  };
}

router.get('/:sessionId/initiative', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const session = await findSessionForChat(sessionId, req.user);
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const row = await prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
      select: {
        initiativeState: true,
        campaign: { select: { gmId: true, isActive: true } },
      },
    });
    if (!row || !row.campaign?.isActive) return res.status(404).json({ error: 'Session non trouvée' });

    const isOwner = req.user.role_name === 'admin' || row.campaign.gmId === req.user.id;
    const state = row.initiativeState ?? null;
    res.json({ success: true, state: isOwner ? state : filterInitiativeStateForPlayer(state), is_owner: isOwner });
  } catch (error) {
    console.error('Erreur initiative GET:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:sessionId/initiative', authenticateToken, checkSessionOwnership, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const nextState = req.body?.state ?? null;
    if (nextState !== null && typeof nextState !== 'object') {
      return res.status(400).json({ error: 'State invalide' });
    }

    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { initiativeState: nextState },
      select: { id: true, initiativeState: true },
    });

    broadcastSessionInitiative(sessionId, { type: 'initiative_state', state: updated.initiativeState ?? null });

    res.json({ success: true, state: updated.initiativeState ?? null });
  } catch (error) {
    console.error('Erreur initiative PUT:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ——— Map live (active map per session + push WebSocket) ———

router.get('/:sessionId/map', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const session = await findSessionForChat(sessionId, req.user);
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const payload = await buildSessionMapPayload(sessionId);
    if (!payload) return res.status(404).json({ error: 'Session non trouvée' });
    return res.json({ success: true, ...payload });
  } catch (error) {
    console.error('Erreur session map GET:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:sessionId/map/active', authenticateToken, checkSessionOwnership, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const raw = req.body?.map_id;
    const mapId = raw == null || raw === '' ? null : parseInt(String(raw), 10);
    if (mapId !== null && Number.isNaN(mapId)) return res.status(400).json({ error: 'map_id invalide' });

    const sess = await prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
      select: { id: true, campaignId: true },
    });
    if (!sess) return res.status(404).json({ error: 'Session non trouvée' });

    if (mapId !== null) {
      const map = await prisma.campaignMap.findFirst({
        where: { id: mapId, isActive: true },
        select: { id: true, campaignId: true },
      });
      if (!map || map.campaignId !== sess.campaignId) {
        return res.status(400).json({ error: 'Carte invalide pour cette session' });
      }
    }

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { activeMapId: mapId },
      select: { id: true },
    });

    const payload = await buildSessionMapPayload(sessionId);
    if (payload) broadcastSessionMap(sessionId, payload);

    return res.json({ success: true, active_map_id: mapId });
  } catch (error) {
    console.error('Erreur session map active PUT:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:sessionId/map/state', authenticateToken, checkSessionOwnership, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const rawTokens = req.body?.tokens_state ?? null;
    const rawFog = req.body?.fog_state ?? null;
    const rawView = req.body?.view_state ?? undefined;
    if (rawTokens !== null && typeof rawTokens !== 'object') return res.status(400).json({ error: 'tokens_state invalide' });
    if (rawFog !== null && typeof rawFog !== 'object') return res.status(400).json({ error: 'fog_state invalide' });
    if (rawView !== undefined && rawView !== null && typeof rawView !== 'object') return res.status(400).json({ error: 'view_state invalide' });

    const sess = await prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
      select: { id: true, activeMapId: true },
    });
    if (!sess) return res.status(404).json({ error: 'Session non trouvée' });
    if (!sess.activeMapId) return res.status(400).json({ error: 'Aucune map active' });

    if (rawView !== undefined) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { mapViewState: rawView },
        select: { id: true },
      });
    }

    await prisma.campaignMap.update({
      where: { id: sess.activeMapId },
      data: {
        ...(rawTokens !== undefined ? { tokensState: rawTokens } : {}),
        ...(rawFog !== undefined ? { fogState: rawFog } : {}),
      },
      select: { id: true },
    });

    const payload = await buildSessionMapPayload(sessionId);
    if (payload) broadcastSessionMap(sessionId, payload);

    return res.json({ success: true });
  } catch (error) {
    console.error('Erreur session map state PUT:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Transfert d’une ligne d’inventaire (Item) entre deux personnages présents à la session.
 * Autorisé : MJ de la campagne, admin, ou deux personnages du même joueur.
 */
router.post('/:sessionId/inventory/transfer', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const fromCharacterId = parseInt(req.body?.from_character_id, 10);
    const toCharacterId = parseInt(req.body?.to_character_id, 10);
    const inventoryId = parseInt(req.body?.inventory_id, 10);
    const rawQty = req.body?.quantity;
    const quantityParsed =
      rawQty === undefined || rawQty === null || rawQty === '' ? null : parseInt(String(rawQty), 10);

    if (Number.isNaN(fromCharacterId) || Number.isNaN(toCharacterId) || Number.isNaN(inventoryId)) {
      return res.status(400).json({ error: 'from_character_id, to_character_id et inventory_id requis' });
    }
    if (fromCharacterId === toCharacterId) {
      return res.status(400).json({ error: 'Le destinataire doit être un autre personnage' });
    }

    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
      include: { campaign: { select: { id: true, gmId: true, isActive: true } } },
    });
    if (!session?.campaign?.isActive) return res.status(404).json({ error: 'Session non trouvée' });

    const role = req.user.role_name;
    const userId = req.user.id;
    const isCampaignGm = session.campaign.gmId === userId;
    const isSessionGm = role === 'admin' || isCampaignGm;

    const [fromChar, toChar] = await Promise.all([
      prisma.character.findFirst({
        where: { id: fromCharacterId, isActive: true },
        select: { id: true, userId: true },
      }),
      prisma.character.findFirst({
        where: { id: toCharacterId, isActive: true },
        select: { id: true, userId: true },
      }),
    ]);
    if (!fromChar || !toChar) return res.status(404).json({ error: 'Personnage non trouvé' });

    const samePlayer = fromChar.userId === toChar.userId && fromChar.userId === userId;
    if (!isSessionGm && !samePlayer) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const [okFrom, okTo] = await Promise.all([
      characterParticipatesInSession(sessionId, fromCharacterId),
      characterParticipatesInSession(sessionId, toCharacterId),
    ]);
    if (!okFrom || !okTo) {
      return res.status(400).json({ error: 'Les deux personnages doivent participer à cette session' });
    }

    const rowPreview = await prisma.inventory.findFirst({
      where: { id: inventoryId, characterId: fromCharacterId },
      select: { id: true, itemId: true, quantity: true, notes: true },
    });
    if (!rowPreview) {
      return res.status(404).json({ error: 'Ligne d’inventaire introuvable sur ce personnage' });
    }

    let q = quantityParsed;
    if (q == null || Number.isNaN(q)) q = rowPreview.quantity;
    if (!Number.isFinite(q) || q < 1 || q > rowPreview.quantity) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    await prisma.$transaction(async (tx) => {
      const row = await tx.inventory.findFirst({
        where: { id: inventoryId, characterId: fromCharacterId },
        select: { id: true, itemId: true, quantity: true, notes: true },
      });
      if (!row) {
        const err = new Error('INV_STALE');
        err.code = 'INV_STALE';
        throw err;
      }
      const qty = Math.min(q, row.quantity);
      if (qty < 1) return;

      await tx.equipment.updateMany({
        where: { characterId: fromCharacterId, itemId: row.itemId, isEquipped: true },
        data: { isEquipped: false },
      });

      if (qty === row.quantity) {
        await tx.inventory.delete({ where: { id: row.id } });
      } else {
        await tx.inventory.update({
          where: { id: row.id },
          data: { quantity: row.quantity - qty },
        });
      }

      const existingDest = await tx.inventory.findFirst({
        where: { characterId: toCharacterId, itemId: row.itemId },
        select: { id: true, quantity: true },
      });
      if (existingDest) {
        await tx.inventory.update({
          where: { id: existingDest.id },
          data: { quantity: existingDest.quantity + qty },
        });
      } else {
        const sortOrder = await nextInventorySortOrder(tx, toCharacterId);
        await tx.inventory.create({
          data: {
            characterId: toCharacterId,
            itemId: row.itemId,
            quantity: qty,
            notes: row.notes,
            sortOrder,
          },
        });
      }
    });

    return res.json({ success: true, message: 'Objet transféré' });
  } catch (error) {
    if (error && error.code === 'INV_STALE') {
      return res.status(409).json({ error: 'Inventaire modifié. Recharge et réessaie.' });
    }
    console.error('Erreur transfert inventaire session:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

function buildDiceNotationString(count, sides, modifier) {
  const modPart =
    modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
  return `${count}d${sides}${modPart}`;
}

function parseDiceNotation(str) {
  const s = String(str).replace(/\s+/g, '');
  const m = /^(\d+)d(\d+)([+-]\d+)?$/i.exec(s);
  if (!m) return null;
  const count = parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const modifier = m[3] ? parseInt(m[3], 10) : 0;
  if (!Number.isFinite(count) || !Number.isFinite(sides) || !Number.isFinite(modifier)) return null;
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
  if (modifier < -999 || modifier > 999) return null;
  return {
    count,
    sides,
    modifier,
    notationStr: buildDiceNotationString(count, sides, modifier),
  };
}

function parseDiceRollRequestBody(body) {
  if (body == null || typeof body !== 'object') return null;
  const notationRaw = body.notation;
  if (notationRaw != null && String(notationRaw).trim()) {
    return parseDiceNotation(String(notationRaw).trim());
  }
  const count = parseInt(body.count, 10);
  const sides = parseInt(body.sides, 10);
  const modRaw = body.modifier;
  const modifier =
    modRaw === undefined || modRaw === null || modRaw === '' ? 0 : parseInt(String(modRaw), 10);
  if (!Number.isFinite(count) || !Number.isFinite(sides) || !Number.isFinite(modifier)) return null;
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
  if (modifier < -999 || modifier > 999) return null;
  return {
    count,
    sides,
    modifier,
    notationStr: buildDiceNotationString(count, sides, modifier),
  };
}

function rollDicePool(count, sides) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(crypto.randomInt(1, sides + 1));
  }
  return out;
}

function formatSessionDiceRollRow(row) {
  const rollsArr = Array.isArray(row.rolls) ? row.rolls : [];
  return {
    id: row.id,
    user_id: row.userId,
    username: row.user?.username ?? null,
    character_id: row.characterId ?? null,
    character_name: row.character?.name ?? null,
    notation: row.notation,
    rolls: rollsArr,
    modifier: row.modifier,
    total: row.total,
    label: row.label,
    created_at: row.createdAt.toISOString(),
    /** Jet saisi à la main (dés physiques, autre outil) — pas de détail de dés enregistré. */
    is_manual: rollsArr.length === 0,
  };
}

/**
 * Vérifie que le personnage est présent à la session et que l’utilisateur peut lancer pour lui
 * (propriétaire du personnage ou MJ de la campagne).
 */
async function resolveDiceRollCharacterId(sessionId, reqUser, body) {
  const raw = body?.character_id ?? body?.characterId;
  const cid = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(cid)) {
    return { error: 'Indique le personnage (character_id)' };
  }

  const sessionRow = await prisma.gameSession.findFirst({
    where: { id: sessionId, isActive: true },
    select: { campaign: { select: { gmId: true } } },
  });
  if (!sessionRow?.campaign) return { error: 'Session introuvable' };

  const attendance = await prisma.sessionAttendance.findUnique({
    where: { sessionId_characterId: { sessionId, characterId: cid } },
    include: { character: { select: { userId: true } } },
  });
  if (!attendance) return { error: 'Personnage absent de cette session' };

  const isGm = reqUser.role_name === 'admin' || sessionRow.campaign.gmId === reqUser.id;
  const ownsCharacter = attendance.character.userId === reqUser.id;
  if (!isGm && !ownsCharacter) return { error: 'Ce personnage n’est pas le tien' };

  return { characterId: cid };
}

router.get('/:sessionId/dice-rolls', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const session = await findSessionForChat(sessionId, req.user);
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '100'), 10) || 100));

    const rows = await prisma.sessionDiceRoll.findMany({
      where: { sessionId },
      orderBy: { id: 'desc' },
      take: limit,
      include: {
        user: { select: { username: true } },
        character: { select: { name: true } },
      },
    });

    return res.json({ success: true, rolls: rows.map(formatSessionDiceRollRow) });
  } catch (error) {
    console.error('Erreur GET dice-rolls:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

function extractDiceRollLabel(body) {
  if (typeof body?.label !== 'string') return null;
  const t = body.label.trim();
  return t ? t.slice(0, 200) : null;
}

router.post('/:sessionId/dice-rolls', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ error: 'ID de session invalide' });

    const session = await findSessionForChat(sessionId, req.user);
    if (!session) return res.status(404).json({ error: 'Session non trouvée' });

    const body = req.body;
    const manualFlag = body?.manual === true || body?.manual === 'true';

    const label = extractDiceRollLabel(body);

    const resolvedChar = await resolveDiceRollCharacterId(sessionId, req.user, body);
    if (resolvedChar.error) {
      return res.status(400).json({ error: resolvedChar.error });
    }
    const characterId = resolvedChar.characterId;

    if (manualFlag) {
      const jetRaw =
        typeof body?.jet === 'string' && body.jet.trim()
          ? body.jet.trim()
          : typeof body?.notation === 'string'
            ? body.notation.trim()
            : '';
      if (!jetRaw) {
        return res.status(400).json({ error: 'Indique le jet réalisé (champ jet ou notation)' });
      }
      const notation = jetRaw.slice(0, 64);
      const total = parseInt(String(body?.total ?? body?.result ?? ''), 10);
      if (!Number.isFinite(total) || total < -99999 || total > 99999) {
        return res.status(400).json({ error: 'Résultat invalide (nombre entre -99999 et 99999)' });
      }

      const created = await prisma.sessionDiceRoll.create({
        data: {
          sessionId,
          userId: req.user.id,
          characterId,
          notation,
          rolls: [],
          modifier: 0,
          total,
          label,
        },
        include: {
          user: { select: { username: true } },
          character: { select: { name: true } },
        },
      });

      return res.status(201).json({ success: true, roll: formatSessionDiceRollRow(created) });
    }

    const parsed = parseDiceRollRequestBody(body);
    if (!parsed) {
      return res.status(400).json({
        error: 'Notation invalide (ex. 2d6+3) ou champs count, sides et optionnellement modifier',
      });
    }

    const rollsArr = rollDicePool(parsed.count, parsed.sides);
    const total = rollsArr.reduce((a, b) => a + b, 0) + parsed.modifier;

    const created = await prisma.sessionDiceRoll.create({
      data: {
        sessionId,
        userId: req.user.id,
        characterId,
        notation: parsed.notationStr.slice(0, 64),
        rolls: rollsArr,
        modifier: parsed.modifier,
        total,
        label,
      },
      include: {
        user: { select: { username: true } },
        character: { select: { name: true } },
      },
    });

    return res.status(201).json({ success: true, roll: formatSessionDiceRollRow(created) });
  } catch (error) {
    console.error('Erreur POST dice-rolls:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

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

    const expandPets =
      req.query.expand_pets === '1' ||
      req.query.expand_pets === 'true' ||
      req.query.expand_companions === '1' ||
      req.query.expand_companions === 'true';

    const attendance = expandPets
      ? await buildAttendancePayload(sessionId, session.attendance)
      : session.attendance.map((a) => ({
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

// Retirer un personnage de la session (ligne de présence)
router.delete(
  '/:sessionId/attendance/:attendanceId',
  authenticateToken,
  checkSessionOwnership,
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      const attendanceId = parseInt(req.params.attendanceId, 10);
      if (Number.isNaN(sessionId) || Number.isNaN(attendanceId)) {
        return res.status(400).json({ error: 'ID invalide' });
      }

      const row = await prisma.sessionAttendance.findFirst({
        where: { id: attendanceId, sessionId },
        select: { id: true },
      });
      if (!row) {
        return res.status(404).json({ error: 'Personnage non présent dans cette session' });
      }

      await prisma.sessionAttendance.delete({ where: { id: attendanceId } });

      res.json({ success: true, message: 'Personnage retiré de la session' });
    } catch (error) {
      console.error('Erreur lors du retrait du personnage de la session:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
);

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

module.exports = router;
