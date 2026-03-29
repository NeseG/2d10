const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_BASE = 'https://www.dnd5eapi.co';
const LIST_URL = `${API_BASE}/api/2014/spells`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function joinDesc(desc) {
  if (Array.isArray(desc)) return desc.join('\n');
  if (typeof desc === 'string') return desc;
  return null;
}

async function main() {
  const rateMs = Number.parseInt(process.env.DND5E_IMPORT_DELAY_MS ?? '120', 10);
  const limit = process.env.DND5E_IMPORT_LIMIT ? Number.parseInt(process.env.DND5E_IMPORT_LIMIT, 10) : null;

  console.log(`⏬ Import dnd5e spells depuis ${LIST_URL}`);
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
        index: detail.index,
        name: detail.name,
        level: typeof detail.level === 'number' ? detail.level : null,
        school: detail?.school?.name ?? detail?.school?.index ?? null,
        castingTime: detail?.casting_time ?? null,
        range: detail?.range ?? null,
        components: Array.isArray(detail?.components) ? detail.components.join(', ') : null,
        duration: detail?.duration ?? null,
        description: joinDesc(detail?.desc),
        higherLevel: joinDesc(detail?.higher_level),
        ritual: typeof detail?.ritual === 'boolean' ? detail.ritual : null,
        concentration: typeof detail?.concentration === 'boolean' ? detail.concentration : null,
        raw: detail,
      };

      await prisma.dnd5eSpellImport.upsert({
        where: { index: mapped.index },
        update: mapped,
        create: mapped,
      });

      ok += 1;
      if (ok % 50 === 0) console.log(`✅ ${ok} sorts importés...`);
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

