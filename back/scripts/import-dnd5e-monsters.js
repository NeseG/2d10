const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_BASE = 'https://www.dnd5eapi.co';
const LIST_URL = `${API_BASE}/api/2014/monsters`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatArmorClass(armorClass) {
  if (!Array.isArray(armorClass) || armorClass.length === 0) return null;
  const value = armorClass[0]?.value;
  return typeof value === 'number' ? value : null;
}

function formatSpeed(speed) {
  if (!speed || typeof speed !== 'object') return null;
  const parts = Object.entries(speed).map(([key, value]) => (key === 'walk' ? value : `${key} ${value}`));
  return parts.length ? parts.join(', ') : null;
}

function formatChallengeRating(cr) {
  if (typeof cr !== 'number') return null;
  const fractions = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' };
  return fractions[cr] ?? String(cr);
}

async function main() {
  const rateMs = Number.parseInt(process.env.DND5E_IMPORT_DELAY_MS ?? '120', 10);
  const limit = process.env.DND5E_IMPORT_LIMIT ? Number.parseInt(process.env.DND5E_IMPORT_LIMIT, 10) : null;

  console.log(`⏬ Import dnd5e monsters depuis ${LIST_URL}`);
  console.log(`⏱️  Délai entre requêtes: ${rateMs}ms`);
  if (limit) console.log(`🔢 Limite: ${limit}`);

  const list = await axios.get(LIST_URL).then((r) => r.data);
  const results = Array.isArray(list?.results) ? list.results : [];
  const slice = limit ? results.slice(0, limit) : results;

  let ok = 0;
  let fail = 0;

  for (const entry of slice) {
    const url = entry?.url ? `${API_BASE}${entry.url}` : null;
    const idx = entry?.index;
    if (!url || !idx) continue;

    try {
      const detail = await axios.get(url).then((r) => r.data);

      const mapped = {
        slug: detail.index,
        name: detail.name,
        size: detail?.size ?? null,
        type: detail?.type ?? null,
        subtype: detail?.subtype ?? null,
        alignment: detail?.alignment ?? null,
        armorClass: formatArmorClass(detail?.armor_class),
        hitPoints: typeof detail?.hit_points === 'number' ? detail.hit_points : null,
        hitDice: detail?.hit_dice ?? null,
        speed: formatSpeed(detail?.speed),
        strength: typeof detail?.strength === 'number' ? detail.strength : null,
        dexterity: typeof detail?.dexterity === 'number' ? detail.dexterity : null,
        constitution: typeof detail?.constitution === 'number' ? detail.constitution : null,
        intelligence: typeof detail?.intelligence === 'number' ? detail.intelligence : null,
        wisdom: typeof detail?.wisdom === 'number' ? detail.wisdom : null,
        charisma: typeof detail?.charisma === 'number' ? detail.charisma : null,
        challengeRating: formatChallengeRating(detail?.challenge_rating),
        xp: typeof detail?.xp === 'number' ? detail.xp : null,
        description: Array.isArray(detail?.desc) ? detail.desc.join('\n') : detail?.desc ?? null,
        raw: detail,
      };

      await prisma.dndMonster.upsert({
        where: { slug: mapped.slug },
        update: mapped,
        create: mapped,
      });

      ok += 1;
      if (ok % 50 === 0) console.log(`✅ ${ok} monstres importés...`);
    } catch (e) {
      fail += 1;
      console.error(`❌ Échec import ${idx}:`, e?.message ?? e);
    }

    await sleep(rateMs);
  }

  console.log(`🏁 Import terminé. OK=${ok}, FAIL=${fail}`);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
