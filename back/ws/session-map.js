const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');
const { findSessionForChat } = require('../lib/session-chat-access');
const { effectiveMapState } = require('../lib/map-play-state');
const { decodeFog, visibleTokensForPlayer } = require('../lib/map-visibility');

const WS_PATH = '/api/ws/session-map';

let broadcastImpl = () => {};

async function buildSessionMapPayload(sessionId) {
  const row = await prisma.gameSession.findFirst({
    where: { id: sessionId, isActive: true },
    select: {
      id: true,
      activeMapId: true,
      mapViewState: true,
      campaign: { select: { id: true, isActive: true } },
      activeMap: {
        select: {
          id: true,
          campaignId: true,
          name: true,
          fogState: true,
          tokensState: true,
          playState: true,
          isActive: true,
        },
      },
    },
  });

  if (!row || !row.campaign?.isActive) return null;
  if (!row.activeMapId || !row.activeMap || !row.activeMap.isActive) {
    return { type: 'map_state', active_map_id: null, map: null, view_state: row.mapViewState ?? null };
  }

  const map = row.activeMap;
  return {
    type: 'map_state',
    active_map_id: row.activeMapId,
    map: {
      id: map.id,
      campaign_id: map.campaignId,
      name: map.name,
      image_url: `/api/campaigns/${map.campaignId}/maps/${map.id}/image`,
      ...effectiveMapState(map),
      has_play_state: map.playState != null,
    },
    view_state: row.mapViewState ?? null,
  };
}

// Brouillard décodé une seule fois par envoi, quel que soit le nombre de joueurs.
const fogMasks = new WeakMap();

/**
 * Version joueur d'un état de carte : seulement les jetons qu'il voit (voir lib/map-visibility.js),
 * sans les repères du MJ (zones nommées, fenêtres).
 */
function filterMapPayloadForPlayer(payload, myCharacterIds = []) {
  const map = payload?.map;
  if (!map) return payload;
  const fs = map.fog_state && typeof map.fog_state === 'object' ? map.fog_state : {};
  if (!fogMasks.has(map)) fogMasks.set(map, decodeFog(fs.fog));
  const tokens = visibleTokensForPlayer(fs, map.tokens_state, myCharacterIds, fogMasks.get(map));
  const { zones: _zones, ...fogForPlayer } = fs;
  return {
    ...payload,
    map: {
      ...map,
      fog_state: { ...fogForPlayer, walls: (Array.isArray(fs.walls) ? fs.walls : []).filter((w) => !w?.window) },
      tokens_state: { ...(map.tokens_state ?? {}), tokens },
    },
  };
}

/** Personnages du joueur : il voit à travers leurs jetons. */
async function playerCharacterIds(userId) {
  const rows = await prisma.character.findMany({ where: { userId, isActive: true }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function isSessionMapOwner(sessionId, user) {
  if (user.role_name === 'admin') return true;
  if (user.role_name !== 'gm') return false;
  const row = await prisma.gameSession.findFirst({
    where: { id: sessionId, isActive: true, campaign: { isActive: true, gmId: user.id } },
    select: { id: true },
  });
  return Boolean(row);
}

function attachSessionMapWss(server) {
  const wss = new WebSocket.Server({ noServer: true });
  const rooms = new Map(); // sessionId -> Set<{ ws, isOwner }>

  broadcastImpl = (sessionId, payload) => {
    const set = rooms.get(sessionId);
    if (!set?.size) return;
    for (const entry of set) {
      const { ws, isOwner, characterIds } = entry;
      if (ws.readyState !== WebSocket.OPEN) continue;
      const msg = JSON.stringify(
        payload?.type === 'map_state' && !isOwner ? filterMapPayloadForPlayer(payload, characterIds) : payload,
      );
      try {
        ws.send(msg);
      } catch {
        /* ignore */
      }
    }
  };

  server.on('upgrade', (request, socket, head) => {
    const host = request.headers.host || 'localhost';
    let pathname;
    try {
      pathname = new URL(request.url || '', `http://${host}`).pathname;
    } catch {
      socket.destroy();
      return;
    }
    // Pas notre chemin : un autre module le traite (les inconnus sont fermés dans index-prisma.js).
    if (pathname !== WS_PATH) return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', async (ws, request) => {
    const host = request.headers.host || 'localhost';
    let url;
    try {
      url = new URL(request.url || '', `http://${host}`);
    } catch {
      ws.close(4400, 'Bad URL');
      return;
    }

    const token = url.searchParams.get('token');
    const sessionId = parseInt(url.searchParams.get('sessionId') || '', 10);
    if (!token || Number.isNaN(sessionId)) {
      ws.close(4400, 'Missing token or sessionId');
      return;
    }

    let user;
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const u = await prisma.user.findFirst({
        where: { id: decoded.userId, isActive: true },
        include: { role: true },
      });
      if (!u) {
        ws.close(4401, 'Unauthorized');
        return;
      }
      user = { id: u.id, role_name: u.role.name };
    } catch {
      ws.close(4401, 'Invalid token');
      return;
    }

    const session = await findSessionForChat(sessionId, user);
    if (!session) {
      ws.close(4403, 'Forbidden');
      return;
    }

    const isOwner = await isSessionMapOwner(sessionId, user);

    if (!rooms.has(sessionId)) rooms.set(sessionId, new Set());
    // shortcut: personnages lus à la connexion ; un perso créé en cours de session n'est vu qu'après reconnexion.
    const entry = { ws, isOwner: Boolean(isOwner), characterIds: isOwner ? [] : await playerCharacterIds(user.id) };
    rooms.get(sessionId).add(entry);

    // Send initial snapshot
    try {
      const payload = await buildSessionMapPayload(sessionId);
      if (payload) ws.send(JSON.stringify(entry.isOwner ? payload : filterMapPayloadForPlayer(payload, entry.characterIds)));
    } catch {
      /* ignore */
    }

    // Ping : éphémère, relayé à toute la salle (rien en base).
    let lastPingAt = 0;
    ws.on('message', (raw) => {
      if (raw.length > 200) return;
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg?.type !== 'ping') return;
      const { x, y } = msg;
      if (typeof x !== 'number' || typeof y !== 'number' || !(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return;
      const now = Date.now();
      if (now - lastPingAt < 400) return;
      lastPingAt = now;
      broadcastImpl(sessionId, { type: 'map_ping', x, y, user_id: user.id });
    });

    ws.on('close', () => {
      const set = rooms.get(sessionId);
      if (set) {
        set.delete(entry);
        if (set.size === 0) rooms.delete(sessionId);
      }
    });
    ws.on('error', () => {});
  });
  return WS_PATH;
}

function broadcastSessionMap(sessionId, payload) {
  broadcastImpl(sessionId, payload);
}

module.exports = {
  attachSessionMapWss,
  broadcastSessionMap,
  buildSessionMapPayload,
  filterMapPayloadForPlayer,
  isSessionMapOwner,
  playerCharacterIds,
  WS_PATH,
};

