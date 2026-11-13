// Donne une icône (correspondance par nom, lib/item-icons.js) aux objets existants qui n'ont pas d'image.
// Usage : npm run backfill-item-icons   (DRY_RUN=1 pour seulement compter)
const prisma = require('../lib/prisma');
const { matchItemIcon } = require('../lib/item-icons');

async function main() {
  const items = await prisma.item.findMany({ where: { imageUrl: null }, select: { id: true, name: true } });
  const updates = items.map((it) => ({ id: it.id, imageUrl: matchItemIcon(it.name) })).filter((u) => u.imageUrl);
  console.log(`${items.length} objets sans image, ${updates.length} avec une icône correspondante.`);
  if (process.env.DRY_RUN) return;
  for (const u of updates) await prisma.item.update({ where: { id: u.id }, data: { imageUrl: u.imageUrl } });
  console.log('Terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
