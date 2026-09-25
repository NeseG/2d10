/**
 * Applique des traductions FR (noms/descriptions) en base à partir de fichiers JSON
 * `[{ id, nameFr, descriptionFr, higherLevelFr? }, ...]`, typiquement produits par une
 * passe de traduction manuelle/agent sur un export de `Dnd5eSpellImport` / `DndMonster` /
 * `Dnd5eEquipment` / `Dnd5eMagicItem` (voir docs/decisions/0004-referentiel-bilingue-fr-en.md).
 *
 * Usage: node scripts/apply-translations-fr.js <spells|monsters|equipment|magicitems> <path1.json> [path2.json ...]
 */
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyEntries(model, entries, extraFields = []) {
  let ok = 0;
  let fail = 0;
  for (const e of entries) {
    try {
      const data = { nameFr: e.nameFr ?? null, descriptionFr: e.descriptionFr ?? null };
      for (const field of extraFields) data[field] = e[field] ?? null;
      await model.update({ where: { id: e.id }, data });
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(`fail id=${e.id}:`, err.message);
    }
  }
  console.log(`ok=${ok} fail=${fail}`);
}

const KINDS = {
  spells: () => applyEntries(prisma.dnd5eSpellImport, entries, ['higherLevelFr']),
  monsters: () => applyEntries(prisma.dndMonster, entries),
  equipment: () => applyEntries(prisma.dnd5eEquipment, entries),
  magicitems: () => applyEntries(prisma.dnd5eMagicItem, entries),
};

let entries = [];

async function main() {
  const [, , kind, ...files] = process.argv;
  if (!kind || files.length === 0 || !KINDS[kind]) {
    console.error(`Usage: node apply-translations-fr.js <${Object.keys(KINDS).join('|')}> <file1.json> [...]`);
    process.exit(1);
  }

  for (const file of files) {
    entries = entries.concat(JSON.parse(fs.readFileSync(file, 'utf-8')));
  }

  console.log(`Applying ${entries.length} entries (${kind}) from ${files.length} file(s)...`);
  await KINDS[kind]();
}

main()
  .catch((e) => {
    console.error('❌ Échec application traductions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
