const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');
const { findSessionForChat } = require('../lib/session-chat-access');

const WS_PATH = '/api/ws/session-chat';

let broadcastImpl = () => {};

function attachSessionChatWss(server) {
  const wss = new WebSocket.Server({ noServer: true });
  const rooms = new Map();

  broadcastImpl = (sessionId, payload) => {
    const set = rooms.get(sessionId);
    if (!set?.size) return;
    const msg = JSON.stringify(payload);
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(msg);
        } catch {
          /* ignore */
        }
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

    if (!rooms.has(sessionId)) rooms.set(sessionId, new Set());
    rooms.get(sessionId).add(ws);

    ws.on('close', () => {
      const set = rooms.get(sessionId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) rooms.delete(sessionId);
      }
    });
    ws.on('error', () => {});
  });
}

function broadcastSessionChat(sessionId, payload) {
  broadcastImpl(sessionId, payload);
}

module.exports = {
  attachSessionChatWss,
  broadcastSessionChat,
  WS_PATH,
};
