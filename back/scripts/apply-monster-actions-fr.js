/**
 * Applique les traductions FR des blocs d'actions/capacités de monstres à partir de fichiers
 * JSON `[{ id, specialAbilitiesFr?, actionsFr?, reactionsFr?, legendaryActionsFr? }, ...]`
 * (voir scripts/extract-monster-actions-en.js pour la matière première correspondante).
 *
 * Usage: node scripts/apply-monster-actions-fr.js <file1.json> [file2.json ...]
 */
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const FIELDS = ['specialAbilitiesFr', 'actionsFr', 'reactionsFr', 'legendaryActionsFr'];

async function main() {
  const [, , ...files] = process.argv;
  if (files.length === 0) {
    console.error('Usage: node apply-monster-actions-fr.js <file1.json> [...]');
    process.exit(1);
  }

  let entries = [];
  for (const file of files) {
    entries = entries.concat(JSON.parse(fs.readFileSync(file, 'utf-8')));
  }

  console.log(`Applying ${entries.length} monster action translations from ${files.length} file(s)...`);
  let ok = 0;
  let fail = 0;
  for (const e of entries) {
    const data = {};
    for (const field of FIELDS) {
      if (e[field] !== undefined) data[field] = e[field] ?? null;
    }
    if (Object.keys(data).length === 0) continue;
    try {
      await prisma.dndMonster.update({ where: { id: e.id }, data });
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(`fail id=${e.id}:`, err.message);
    }
  }
  console.log(`ok=${ok} fail=${fail}`);
}

main()
  .catch((e) => {
    console.error('❌ Échec application traductions actions monstres:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
