/**
 * Prochaine valeur de `sortOrder` pour une nouvelle ligne d'inventaire (fin de liste).
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {number} characterId
 */
async function nextInventorySortOrder(prismaClient, characterId) {
  const agg = await prismaClient.inventory.aggregate({
    where: { characterId },
    _max: { sortOrder: true },
  });
  return (agg._max.sortOrder ?? -1) + 1;
}

module.exports = { nextInventorySortOrder };
