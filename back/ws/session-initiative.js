const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');
const { findSessionForChat } = require('../lib/session-chat-access');

const WS_PATH = '/api/ws/session-initiative';

let broadcastImpl = () => {};

function filterInitiativeStateForPlayer(state) {
  if (!state || typeof state !== 'object') return state;
  const combatants = Array.isArray(state.combatants) ? state.combatants : [];
  return {
    ...state,
    combatants: combatants.filter((c) => !c?.hidden),
  };
}

function attachSessionInitiativeWss(server) {
  const wss = new WebSocket.Server({ noServer: true });
  const rooms = new Map(); // sessionId -> Set<{ ws, isOwner }>

  broadcastImpl = (sessionId, payload) => {
    const set = rooms.get(sessionId);
    if (!set?.size) return;
    for (const entry of set) {
      const { ws, isOwner } = entry;
      if (ws.readyState !== WebSocket.OPEN) continue;
      const msg = JSON.stringify(
        payload?.type === 'initiative_state' && payload?.state && !isOwner
          ? { ...payload, state: filterInitiativeStateForPlayer(payload.state) }
          : payload,
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
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

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

    const isOwner =
      user.role_name === 'admin' ||
      (user.role_name === 'gm' &&
        (await prisma.gameSession.findFirst({
          where: { id: sessionId, isActive: true, campaign: { isActive: true, gmId: user.id } },
          select: { id: true },
        })));

    if (!rooms.has(sessionId)) rooms.set(sessionId, new Set());
    const entry = { ws, isOwner: Boolean(isOwner) };
    rooms.get(sessionId).add(entry);

    // Send initial snapshot
    try {
      const row = await prisma.gameSession.findFirst({
        where: { id: sessionId, isActive: true },
        select: { initiativeState: true },
      });
      const state = row?.initiativeState ?? null;
      const payload = { type: 'initiative_state', state };
      ws.send(
        JSON.stringify(entry.isOwner ? payload : { ...payload, state: filterInitiativeStateForPlayer(state) }),
      );
    } catch {
      /* ignore */
    }

    ws.on('close', () => {
      const set = rooms.get(sessionId);
      if (set) {
        set.delete(entry);
        if (set.size === 0) rooms.delete(sessionId);
      }
    });
    ws.on('error', () => {});
  });
}

function broadcastSessionInitiative(sessionId, payload) {
  broadcastImpl(sessionId, payload);
}

module.exports = {
  attachSessionInitiativeWss,
  broadcastSessionInitiative,
  WS_PATH,
};

