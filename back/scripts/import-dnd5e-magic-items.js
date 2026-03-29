const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_BASE = 'https://www.dnd5eapi.co';
const MAGIC_ITEMS_LIST_URL = `${API_BASE}/api/2014/magic-items`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function joinDesc(desc) {
  if (Array.isArray(desc)) return desc.join('\n');
  if (typeof desc === 'string') return desc;
  return null;
}

function mapMagicItem(detail) {
  const cat = detail?.equipment_category;
  const variants = detail?.variants;
  return {
    index: detail.index,
    name: detail.name,
    categoryIndex: cat?.index ?? null,
    categoryName: cat?.name ?? null,
    rarity: detail?.rarity?.name ?? null,
    description: joinDesc(detail?.desc),
    variant: Boolean(detail?.variant),
    variants: Array.isArray(variants) && variants.length > 0 ? variants : null,
    image: typeof detail?.image === 'string' ? detail.image : null,
    apiUpdatedAt: typeof detail?.updated_at === 'string' ? detail.updated_at : null,
    raw: detail,
  };
}

async function main() {
  const rateMs = Number.parseInt(process.env.DND5E_IMPORT_DELAY_MS ?? '120', 10);
  const limit = process.env.DND5E_IMPORT_LIMIT ? Number.parseInt(process.env.DND5E_IMPORT_LIMIT, 10) : null;

  console.log(`⏬ Import dnd5e magic-items depuis ${MAGIC_ITEMS_LIST_URL}`);
  console.log(`⏱️  Délai entre requêtes: ${rateMs}ms`);
  if (limit) console.log(`🔢 Limite: ${limit}`);

  const list = await axios.get(MAGIC_ITEMS_LIST_URL).then((r) => r.data);
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
      const mapped = mapMagicItem(detail);

      await prisma.dnd5eMagicItem.upsert({
        where: { index: mapped.index },
        update: {
          name: mapped.name,
          categoryIndex: mapped.categoryIndex,
          categoryName: mapped.categoryName,
          rarity: mapped.rarity,
          description: mapped.description,
          variant: mapped.variant,
          variants: mapped.variants,
          image: mapped.image,
          apiUpdatedAt: mapped.apiUpdatedAt,
          raw: mapped.raw,
        },
        create: mapped,
      });

      ok += 1;
      if (ok % 50 === 0) console.log(`✅ ${ok} objets magiques importés...`);
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
