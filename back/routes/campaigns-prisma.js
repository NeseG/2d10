const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const path = require('path');
const fs = require('fs/promises');
const { MAP_UPLOAD_ROOT, mapImageUploadMiddleware } = require('../lib/campaign-map-upload');
const { broadcastSessionMap, buildSessionMapPayload } = require('../ws/session-map');

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

function mapImagePath(campaignId, mapId) {
  return `/api/campaigns/${campaignId}/maps/${mapId}/image`;
}

function formatCampaignMap(map) {
  return {
    id: map.id,
    campaign_id: map.campaignId,
    folder_id: map.folderId ?? null,
    name: map.name,
    image_url: mapImagePath(map.campaignId, map.id),
    fog_state: map.fogState ?? null,
    tokens_state: map.tokensState ?? null,
    is_active: map.isActive,
    sort_order: map.sortOrder ?? 0,
    created_at: map.createdAt,
    updated_at: map.updatedAt,
  };
}

function formatCampaignMapFolder(folder) {
  return {
    id: folder.id,
    campaign_id: folder.campaignId,
    parent_id: folder.parentId ?? null,
    name: folder.name,
    sort_order: folder.sortOrder ?? 0,
    is_active: folder.isActive,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  };
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

async function canAccessCampaignCharacter(reqUser, campaignId, characterId) {
  const userId = reqUser?.id;
  const role = reqUser?.role_name;
  if (!userId || !role) return { ok: false, status: 401, error: 'Non authentifié' };

  if (role === 'admin') return { ok: true };

  const link = await prisma.campaignCharacter.findFirst({
    where: { campaignId, characterId, isActive: true },
    select: {
      id: true,
      campaign: { select: { gmId: true, isActive: true } },
      character: { select: { userId: true, isActive: true } },
    },
  });

  if (!link || !link.campaign?.isActive || !link.character?.isActive) {
    return { ok: false, status: 404, error: 'Lien campagne-personnage non trouvé' };
  }

  if (role === 'gm' && link.campaign.gmId === userId) return { ok: true };
  if (role === 'user' && link.character.userId === userId) return { ok: true };

  return { ok: false, status: 403, error: 'Accès refusé' };
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

async function findActiveCampaignMap(campaignId, mapId) {
  return prisma.campaignMap.findFirst({
    where: { id: mapId, campaignId, isActive: true },
  });
}

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

// Statistiques des campagnes (avant GET /:campaignId pour ne pas capturer "stats")
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
        ...formatCampaign(campaign, true),
        characters: campaign.characters.map(formatCampaignCharacter),
        sessions: campaign.sessions.map(formatSession),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === Cartes de campagne (Maps) ===
// Note: pour l'instant, l'accès est volontairement limité à GM/Admin.
// L'accès joueur sera ouvert plus tard via la partie sessions-live.

// === Dossiers de cartes ===
router.get('/:campaignId/map-folders', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    if (Number.isNaN(campaignId)) return res.status(400).json({ error: 'ID de campagne invalide' });

    const folders = await prisma.campaignMapFolder.findMany({
      where: { campaignId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return res.json({ success: true, folders: folders.map(formatCampaignMapFolder) });
  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers de cartes:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:campaignId/map-folders', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    if (Number.isNaN(campaignId)) return res.status(400).json({ error: 'ID de campagne invalide' });

    const name = (req.body?.name ?? '').toString().trim();
    if (!name) return res.status(400).json({ error: 'Nom de dossier requis' });
    if (name.length > 200) return res.status(400).json({ error: 'Nom de dossier trop long' });

    const parentIdRaw = req.body?.parent_id ?? req.body?.parentId ?? null;
    const parentId = parentIdRaw == null || parentIdRaw === '' ? null : parseInt(parentIdRaw, 10);
    if (parentIdRaw != null && parentIdRaw !== '' && Number.isNaN(parentId)) {
      return res.status(400).json({ error: 'parent_id invalide' });
    }

    if (parentId != null) {
      const parent = await prisma.campaignMapFolder.findFirst({
        where: { id: parentId, campaignId, isActive: true },
        select: { id: true },
      });
      if (!parent) return res.status(404).json({ error: 'Dossier parent introuvable' });
    }

    const max = await prisma.campaignMapFolder.aggregate({
      where: { campaignId, parentId, isActive: true },
      _max: { sortOrder: true },
    });
    const nextSort = (max?._max?.sortOrder ?? 0) + 1;

    const created = await prisma.campaignMapFolder.create({
      data: { campaignId, parentId, name, sortOrder: nextSort },
    });

    return res.status(201).json({ success: true, folder: formatCampaignMapFolder(created) });
  } catch (error) {
    console.error('Erreur lors de la création du dossier de cartes:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

async function folderIsDescendant({ folderId, possibleAncestorId }) {
  // Returns true if folderId is a descendant of possibleAncestorId
  if (folderId == null || possibleAncestorId == null) return false;
  if (folderId === possibleAncestorId) return true;
  const visited = new Set();
  let current = folderId;
  while (current != null) {
    if (visited.has(current)) return true; // cycle protection
    visited.add(current);
    const row = await prisma.campaignMapFolder.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    const p = row?.parentId ?? null;
    if (p == null) return false;
    if (p === possibleAncestorId) return true;
    current = p;
  }
  return false;
}

router.put('/:campaignId/map-folders/:folderId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const folderId = parseInt(req.params.folderId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(folderId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.campaignMapFolder.findFirst({
      where: { id: folderId, campaignId, isActive: true },
    });
    if (!existing) return res.status(404).json({ error: 'Dossier introuvable' });

    const updateData = {};

    if (req.body?.name !== undefined) {
      const name = (req.body.name ?? '').toString().trim();
      if (!name) return res.status(400).json({ error: 'Nom de dossier requis' });
      if (name.length > 200) return res.status(400).json({ error: 'Nom de dossier trop long' });
      updateData.name = name;
    }

    if (req.body?.parent_id !== undefined || req.body?.parentId !== undefined) {
      const parentIdRaw = req.body?.parent_id ?? req.body?.parentId ?? null;
      const parentId = parentIdRaw == null || parentIdRaw === '' ? null : parseInt(parentIdRaw, 10);
      if (parentIdRaw != null && parentIdRaw !== '' && Number.isNaN(parentId)) {
        return res.status(400).json({ error: 'parent_id invalide' });
      }
      if (parentId === folderId) return res.status(400).json({ error: 'parent_id invalide' });

      if (parentId != null) {
        const parent = await prisma.campaignMapFolder.findFirst({
          where: { id: parentId, campaignId, isActive: true },
          select: { id: true },
        });
        if (!parent) return res.status(404).json({ error: 'Dossier parent introuvable' });
        const isBad = await folderIsDescendant({ folderId: parentId, possibleAncestorId: folderId });
        if (isBad) return res.status(400).json({ error: 'Déplacement impossible (cycle)' });
      }

      updateData.parentId = parentId;
    }

    if (req.body?.sort_order !== undefined || req.body?.sortOrder !== undefined) {
      const raw = req.body?.sort_order ?? req.body?.sortOrder;
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return res.status(400).json({ error: 'sort_order invalide' });
      updateData.sortOrder = n;
    }

    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

    const updated = await prisma.campaignMapFolder.update({ where: { id: existing.id }, data: updateData });
    return res.json({ success: true, folder: formatCampaignMapFolder(updated) });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du dossier de cartes:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:campaignId/map-folders/:folderId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const folderId = parseInt(req.params.folderId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(folderId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.campaignMapFolder.findFirst({
      where: { id: folderId, campaignId, isActive: true },
      select: { id: true, parentId: true },
    });
    if (!existing) return res.status(404).json({ error: 'Dossier introuvable' });

    const parentId = existing.parentId ?? null;

    await prisma.$transaction([
      prisma.campaignMapFolder.updateMany({
        where: { campaignId, parentId: folderId, isActive: true },
        data: { parentId },
      }),
      prisma.campaignMap.updateMany({
        where: { campaignId, folderId, isActive: true },
        data: { folderId: parentId },
      }),
      prisma.campaignMapFolder.update({
        where: { id: folderId },
        data: { isActive: false },
      }),
    ]);

    return res.json({ success: true, message: 'Dossier supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du dossier de cartes:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:campaignId/maps/:mapId/image', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const mapId = parseInt(req.params.mapId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(mapId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const map = await findActiveCampaignMap(campaignId, mapId);
    if (!map) return res.status(404).json({ error: 'Carte non trouvée' });

    const safeName = path.basename(map.imageKey || '');
    if (!safeName || safeName !== map.imageKey) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    const dir = path.join(MAP_UPLOAD_ROOT, String(campaignId));
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
    return res.sendFile(resolvedFile);
  } catch (error) {
    console.error('Erreur map image:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Lister les cartes d'une campagne (GM/Admin)
router.get('/:campaignId/maps', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    if (Number.isNaN(campaignId)) {
      return res.status(400).json({ error: 'ID de campagne invalide' });
    }

    const maps = await prisma.campaignMap.findMany({
      where: { campaignId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return res.json({
      success: true,
      maps: maps.map(formatCampaignMap),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir une carte (GM/Admin)
router.get('/:campaignId/maps/:mapId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const mapId = parseInt(req.params.mapId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(mapId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const map = await findActiveCampaignMap(campaignId, mapId);
    if (!map) return res.status(404).json({ error: 'Carte non trouvée' });

    return res.json({
      success: true,
      map: formatCampaignMap(map),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la carte:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une carte (GM/Admin)
router.post('/:campaignId/maps', authenticateToken, checkCampaignOwnership, mapImageUploadMiddleware, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    if (Number.isNaN(campaignId)) {
      return res.status(400).json({ error: 'ID de campagne invalide' });
    }

    const nameRaw = req.body?.name;
    const name = nameRaw == null ? '' : String(nameRaw).trim();

    if (!name) return res.status(400).json({ error: 'Le nom de la carte est requis' });
    if (name.length > 200) return res.status(400).json({ error: 'Nom de carte trop long' });
    if (!req.file?.filename) return res.status(400).json({ error: 'Image requise (champ "image")' });

    function parseMaybeJson(value) {
      if (value == null) return null;
      if (typeof value === 'object') return value;
      const s = String(value).trim();
      if (!s) return null;
      try {
        return JSON.parse(s);
      } catch {
        return value;
      }
    }

    const fogState = parseMaybeJson(req.body?.fog_state ?? req.body?.fogState ?? null);
    const tokensState = parseMaybeJson(req.body?.tokens_state ?? req.body?.tokensState ?? null);

    const folderIdRaw = req.body?.folder_id ?? req.body?.folderId ?? null;
    const folderId = folderIdRaw == null || folderIdRaw === '' ? null : parseInt(folderIdRaw, 10);
    if (folderIdRaw != null && folderIdRaw !== '' && Number.isNaN(folderId)) {
      return res.status(400).json({ error: 'folder_id invalide' });
    }
    if (folderId != null) {
      const folder = await prisma.campaignMapFolder.findFirst({
        where: { id: folderId, campaignId, isActive: true },
        select: { id: true },
      });
      if (!folder) return res.status(404).json({ error: 'Dossier introuvable' });
    }

    const max = await prisma.campaignMap.aggregate({
      where: { campaignId, folderId, isActive: true },
      _max: { sortOrder: true },
    });
    const nextSort = (max?._max?.sortOrder ?? 0) + 1;

    const created = await prisma.campaignMap.create({
      data: {
        campaignId,
        folderId,
        name,
        imageKey: req.file.filename,
        fogState,
        tokensState,
        sortOrder: nextSort,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Carte créée avec succès',
      map: formatCampaignMap(created),
    });
  } catch (error) {
    console.error('Erreur lors de la création de la carte:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une carte (GM/Admin)
router.put('/:campaignId/maps/:mapId', authenticateToken, checkCampaignOwnership, mapImageUploadMiddleware, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const mapId = parseInt(req.params.mapId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(mapId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const existing = await findActiveCampaignMap(campaignId, mapId);
    if (!existing) return res.status(404).json({ error: 'Carte non trouvée' });

    const updateData = {};

    if (req.body?.name !== undefined) {
      const name = req.body.name == null ? '' : String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'Le nom de la carte est requis' });
      if (name.length > 200) return res.status(400).json({ error: 'Nom de carte trop long' });
      updateData.name = name;
    }

    if (req.file?.filename) updateData.imageKey = req.file.filename;

    function parseMaybeJson(value) {
      if (value == null) return null;
      if (typeof value === 'object') return value;
      const s = String(value).trim();
      if (!s) return null;
      try {
        return JSON.parse(s);
      } catch {
        return value;
      }
    }

    if (req.body?.fog_state !== undefined || req.body?.fogState !== undefined) {
      updateData.fogState = parseMaybeJson(req.body?.fog_state ?? req.body?.fogState ?? null);
    }

    if (req.body?.tokens_state !== undefined || req.body?.tokensState !== undefined) {
      updateData.tokensState = parseMaybeJson(req.body?.tokens_state ?? req.body?.tokensState ?? null);
    }

    if (req.body?.folder_id !== undefined || req.body?.folderId !== undefined) {
      const folderIdRaw = req.body?.folder_id ?? req.body?.folderId ?? null;
      const folderId = folderIdRaw == null || folderIdRaw === '' ? null : parseInt(folderIdRaw, 10);
      if (folderIdRaw != null && folderIdRaw !== '' && Number.isNaN(folderId)) {
        return res.status(400).json({ error: 'folder_id invalide' });
      }
      if (folderId != null) {
        const folder = await prisma.campaignMapFolder.findFirst({
          where: { id: folderId, campaignId, isActive: true },
          select: { id: true },
        });
        if (!folder) return res.status(404).json({ error: 'Dossier introuvable' });
      }
      updateData.folderId = folderId;
      // if moving folder and sort is not provided, put at end
      if (req.body?.sort_order === undefined && req.body?.sortOrder === undefined) {
        const max = await prisma.campaignMap.aggregate({
          where: { campaignId, folderId, isActive: true },
          _max: { sortOrder: true },
        });
        updateData.sortOrder = (max?._max?.sortOrder ?? 0) + 1;
      }
    }

    if (req.body?.sort_order !== undefined || req.body?.sortOrder !== undefined) {
      const raw = req.body?.sort_order ?? req.body?.sortOrder;
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return res.status(400).json({ error: 'sort_order invalide' });
      updateData.sortOrder = n;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const updated = await prisma.campaignMap.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Si cette map est active dans une ou plusieurs sessions, pousser la mise à jour en live.
    try {
      const sessions = await prisma.gameSession.findMany({
        where: { isActive: true, activeMapId: updated.id },
        select: { id: true },
      });
      for (const s of sessions) {
        const payload = await buildSessionMapPayload(s.id);
        if (payload) broadcastSessionMap(s.id, payload);
      }
    } catch {
      /* ignore */
    }

    return res.json({
      success: true,
      message: 'Carte mise à jour avec succès',
      map: formatCampaignMap(updated),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la carte:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une carte (soft-delete) (GM/Admin)
router.delete('/:campaignId/maps/:mapId', authenticateToken, checkCampaignOwnership, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const mapId = parseInt(req.params.mapId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(mapId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const existing = await findActiveCampaignMap(campaignId, mapId);
    if (!existing) return res.status(404).json({ error: 'Carte non trouvée' });

    await prisma.campaignMap.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'Carte supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la carte:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
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

// Notes WYSIWYG par personnage et par campagne (joueur propriétaire, GM de la campagne ou admin)
router.get('/:campaignId/characters/:characterId/notes-wysiwyg', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const characterId = parseInt(req.params.characterId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const access = await canAccessCampaignCharacter(req.user, campaignId, characterId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const link = await prisma.campaignCharacter.findFirst({
      where: { campaignId, characterId, isActive: true },
      select: { notesWysiwyg: true, updatedAt: true },
    });
    if (!link) return res.status(404).json({ error: 'Lien campagne-personnage non trouvé' });

    return res.json({
      success: true,
      notes_wysiwyg: link.notesWysiwyg ?? '',
      updated_at: link.updatedAt,
    });
  } catch (error) {
    console.error('Erreur lecture notes wysiwyg:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:campaignId/characters/:characterId/notes-wysiwyg', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const characterId = parseInt(req.params.characterId, 10);
    if (Number.isNaN(campaignId) || Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const access = await canAccessCampaignCharacter(req.user, campaignId, characterId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const raw = req.body?.notes_wysiwyg;
    const next = raw == null ? '' : String(raw);
    if (next.length > 200000) return res.status(400).json({ error: 'notes_wysiwyg trop long' });

    const updated = await prisma.campaignCharacter.update({
      where: { campaignId_characterId: { campaignId, characterId } },
      data: { notesWysiwyg: next },
      select: { notesWysiwyg: true, updatedAt: true },
    });

    return res.json({
      success: true,
      notes_wysiwyg: updated.notesWysiwyg ?? '',
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    console.error('Erreur update notes wysiwyg:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
