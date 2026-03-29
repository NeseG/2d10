const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_BASE = 'https://www.dnd5eapi.co';
const EQUIPMENT_LIST_URL = `${API_BASE}/api/2014/equipment`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCostString(cost) {
  if (!cost || typeof cost !== 'object') return null;
  const qty = cost.quantity;
  const unit = cost.unit;
  if (qty == null || unit == null) return null;
  return `${qty} ${unit}`;
}

function pickType(detail) {
  const cat = detail?.equipment_category?.index || detail?.equipment_category?.name || '';
  const idx = String(cat).toLowerCase();
  if (idx.includes('weapon')) return 'weapon';
  if (idx.includes('armor')) return 'armor';
  if (idx.includes('tools')) return 'tool';
  if (idx.includes('adventuring-gear') || idx.includes('gear')) return 'gear';
  if (idx.includes('mounts-and-vehicles')) {
    // Tente de distinguer mount / vehicle quand possible
    const gearCat = String(detail?.gear_category?.index || detail?.gear_category?.name || '').toLowerCase();
    if (gearCat.includes('vehicle')) return 'vehicle';
    if (gearCat.includes('mount')) return 'mount';
    return 'other';
  }
  if (idx.includes('ammunition')) return 'ammunition';
  if (idx.includes('potion') || idx.includes('consumable')) return 'consumable';
  return 'other';
}

function mapEquipment(detail) {
  const type = pickType(detail);
  const category = detail?.equipment_category?.name ?? null;
  const subcategory =
    detail?.weapon_category ??
    detail?.armor_category ??
    detail?.gear_category?.name ??
    detail?.tool_category ??
    null;

  const description = Array.isArray(detail?.desc) ? detail.desc.join('\n') : detail?.desc ?? null;

  const damage = detail?.damage?.damage_dice ?? null;
  const damageType = detail?.damage?.damage_type?.name ?? null;

  const range = detail?.range
    ? JSON.stringify(detail.range)
    : detail?.throw_range
      ? JSON.stringify(detail.throw_range)
      : null;

  const armorClass =
    typeof detail?.armor_class?.base === 'number'
      ? detail.armor_class.base
      : typeof detail?.armor_class === 'number'
        ? detail.armor_class
        : null;

  const stealthDisadvantage =
    typeof detail?.stealth_disadvantage === 'boolean' ? detail.stealth_disadvantage : null;

  const properties = {
    properties: detail?.properties ?? null,
    special: detail?.special ?? null,
    armor_class: detail?.armor_class ?? null,
    weapon_range: detail?.weapon_range ?? null,
    weapon_category: detail?.weapon_category ?? null,
    weapon_range_type: detail?.weapon_range ?? null,
  };

  return {
    index: detail.index,
    name: detail.name,
    type,
    category,
    subcategory,
    cost: toCostString(detail.cost),
    weight: typeof detail.weight === 'number' ? detail.weight : null,
    description,
    damage,
    damageType,
    range,
    armorClass,
    stealthDisadvantage,
    properties,
    raw: detail,
  };
}

async function main() {
  const rateMs = Number.parseInt(process.env.DND5E_IMPORT_DELAY_MS ?? '120', 10);
  const limit = process.env.DND5E_IMPORT_LIMIT ? Number.parseInt(process.env.DND5E_IMPORT_LIMIT, 10) : null;

  console.log(`⏬ Import dnd5e equipment depuis ${EQUIPMENT_LIST_URL}`);
  console.log(`⏱️  Délai entre requêtes: ${rateMs}ms`);
  if (limit) console.log(`🔢 Limite: ${limit}`);

  const list = await axios.get(EQUIPMENT_LIST_URL).then((r) => r.data);
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
      const mapped = mapEquipment(detail);

      await prisma.dnd5eEquipment.upsert({
        where: { index: mapped.index },
        update: {
          name: mapped.name,
          type: mapped.type,
          category: mapped.category,
          subcategory: mapped.subcategory,
          cost: mapped.cost,
          weight: mapped.weight,
          description: mapped.description,
          damage: mapped.damage,
          damageType: mapped.damageType,
          range: mapped.range,
          armorClass: mapped.armorClass,
          stealthDisadvantage: mapped.stealthDisadvantage,
          properties: mapped.properties,
          raw: mapped.raw,
        },
        create: mapped,
      });

      ok += 1;
      if (ok % 50 === 0) console.log(`✅ ${ok} items importés...`);
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

