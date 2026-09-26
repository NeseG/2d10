/**
 * Exporte les blocs d'actions/capacités anglais (`special_abilities`, `actions`, `reactions`,
 * `legendary_actions`, extraits de la colonne `raw`) des `DndMonster` dont la traduction FR
 * correspondante est encore absente, en fichiers JSON par lots — matière première pour une
 * passe de traduction (agent) suivie de `apply-monster-actions-fr.js`.
 *
 * Usage: node scripts/extract-monster-actions-en.js <outDir> [batchSize=40]
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const KEYS = ['special_abilities', 'actions', 'reactions', 'legendary_actions'];
const FR_FIELD = {
  special_abilities: 'specialAbilitiesFr',
  actions: 'actionsFr',
  reactions: 'reactionsFr',
  legendary_actions: 'legendaryActionsFr',
};

function extractEntries(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e === 'object' && typeof e.desc === 'string' && e.desc.trim())
    .map((e) => ({ name: typeof e.name === 'string' ? e.name : null, desc: e.desc }));
}

async function main() {
  const [, , outDir, batchSizeArg] = process.argv;
  if (!outDir) {
    console.error('Usage: node extract-monster-actions-en.js <outDir> [batchSize=40]');
    process.exit(1);
  }
  const batchSize = Number.parseInt(batchSizeArg, 10) || 40;

  const monsters = await prisma.dndMonster.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      raw: true,
      specialAbilitiesFr: true,
      actionsFr: true,
      reactionsFr: true,
      legendaryActionsFr: true,
    },
  });

  const toTranslate = [];
  for (const m of monsters) {
    const raw = m.raw && typeof m.raw === 'object' ? m.raw : {};
    const entry = { id: m.id, name: m.name };
    let hasContent = false;
    for (const key of KEYS) {
      if (m[FR_FIELD[key]] != null) continue; // déjà traduit
      const entries = extractEntries(raw[key]);
      if (entries.length === 0) continue;
      entry[key] = entries;
      hasContent = true;
    }
    if (hasContent) toTranslate.push(entry);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const batches = [];
  for (let i = 0; i < toTranslate.length; i += batchSize) {
    batches.push(toTranslate.slice(i, i + batchSize));
  }

  batches.forEach((batch, i) => {
    const file = path.join(outDir, `batch-${String(i + 1).padStart(2, '0')}.en.json`);
    fs.writeFileSync(file, JSON.stringify(batch, null, 2));
    console.log(`✅ ${file} (${batch.length} monstres)`);
  });

  const totalEntries = toTranslate.reduce(
    (sum, m) => sum + KEYS.reduce((s, k) => s + (Array.isArray(m[k]) ? m[k].length : 0), 0),
    0,
  );
  console.log(`🏁 ${toTranslate.length} monstres à traduire, ${totalEntries} entrées, ${batches.length} lot(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Échec extraction:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
