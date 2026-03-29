const prisma = require('./prisma');

/**
 * Même logique d’accès que GET /api/sessions/:sessionId (joueur inscrit, MJ campagne, admin).
 */
async function findSessionForChat(sessionId, user) {
  const role = user.role_name;
  const userId = user.id;
  const accessWhere =
    role === 'admin'
      ? {}
      : role === 'gm'
        ? { campaign: { gmId: userId } }
        : { attendance: { some: { character: { userId, isActive: true } } } };

  return prisma.gameSession.findFirst({
    where: {
      id: sessionId,
      isActive: true,
      ...accessWhere,
    },
    select: { id: true },
  });
}

/**
 * Nom affiché dans le chat : nom du personnage si un seul personnage à la session pour ce compte,
 * sinon nom de compte (plusieurs persos inscrits à cette session).
 */
async function getChatDisplayName(sessionId, userId) {
  const attendanceRows = await prisma.sessionAttendance.findMany({
    where: {
      sessionId,
      character: { userId, isActive: true },
    },
    include: {
      character: { select: { name: true } },
    },
  });

  if (attendanceRows.length === 1) {
    const n = attendanceRows[0].character?.name?.trim();
    return n || `Personnage #${attendanceRows[0].characterId}`;
  }

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return userRow?.username || 'Joueur';
}

async function displayNamesForUserIds(sessionId, userIds) {
  const unique = [...new Set(userIds)];
  const map = {};
  await Promise.all(
    unique.map(async (uid) => {
      map[uid] = await getChatDisplayName(sessionId, uid);
    }),
  );
  return map;
}

module.exports = {
  findSessionForChat,
  getChatDisplayName,
  displayNamesForUserIds,
};
