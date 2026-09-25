/**
 * Traduit les champs à vocabulaire fixe (écoles, tailles, types, raretés, etc.) des référentiels
 * D&D 5e importés vers le français, via des dictionnaires exhaustifs (valeurs observées en base).
 * Ne touche pas aux noms ni aux descriptions (texte libre) : voir scripts/translate-content-fr-*.js.
 *
 * Usage: node scripts/translate-dictionaries-fr.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SPELL_SCHOOL_FR = {
  Abjuration: 'Abjuration',
  Conjuration: 'Invocation',
  Divination: 'Divination',
  Enchantment: 'Enchantement',
  Evocation: 'Évocation',
  Illusion: 'Illusion',
  Necromancy: 'Nécromancie',
  Transmutation: 'Transmutation',
};

const SPELL_CASTING_TIME_FR = {
  '1 action': '1 action',
  '1 bonus action': '1 action bonus',
  '1 reaction': '1 réaction',
  '1 minute': '1 minute',
  '10 minutes': '10 minutes',
  '1 hour': '1 heure',
  '8 hours': '8 heures',
  '12 hours': '12 heures',
  '24 hours': '24 heures',
};

const SPELL_RANGE_FR = {
  Self: 'Personnelle',
  Touch: 'Contact',
  Sight: 'Vue',
  Special: 'Spéciale',
  Unlimited: 'Illimitée',
  '5 feet': '1,5 mètre',
  '10 feet': '3 mètres',
  '30 feet': '9 mètres',
  '60 feet': '18 mètres',
  '90 feet': '27 mètres',
  '100 feet': '30 mètres',
  '120 feet': '36 mètres',
  '150 feet': '45 mètres',
  '300 feet': '90 mètres',
  '500 feet': '150 mètres',
  '1 mile': '1,6 kilomètre',
  '500 miles': '800 kilomètres',
};

const SPELL_DURATION_FR = {
  Instantaneous: 'Instantanée',
  Special: 'Spéciale',
  'Until dispelled': "Jusqu'à dissipation",
  '1 round': '1 round',
  '1 minute': '1 minute',
  '10 minutes': '10 minutes',
  '1 hour': '1 heure',
  '8 hours': '8 heures',
  '24 hours': '24 heures',
  '7 days': '7 jours',
  '10 days': '10 jours',
  '30 days': '30 jours',
  'Up to 1 round': "Jusqu'à 1 round",
  'Up to 1 minute': "Jusqu'à 1 minute",
  'Up to 10 minutes': "Jusqu'à 10 minutes",
  'Up to 1 hour': "Jusqu'à 1 heure",
  'Up to 2 hours': "Jusqu'à 2 heures",
  'Up to 8 hours': "Jusqu'à 8 heures",
  'Up to 24 hours': "Jusqu'à 24 heures",
};

const MONSTER_SIZE_FR = {
  Tiny: 'Minuscule',
  Small: 'Petite',
  Medium: 'Moyenne',
  Large: 'Grande',
  Huge: 'Très grande',
  Gargantuan: 'Gigantesque',
};

const MONSTER_TYPE_FR = {
  aberration: 'aberration',
  beast: 'bête',
  celestial: 'céleste',
  construct: 'construction',
  dragon: 'dragon',
  elemental: 'élémentaire',
  fey: 'fée',
  fiend: 'démon',
  giant: 'géant',
  humanoid: 'humanoïde',
  monstrosity: 'monstruosité',
  ooze: 'vase',
  plant: 'plante',
  undead: 'mort-vivant',
  'swarm of Tiny beasts': 'essaim de bêtes minuscules',
};

const MONSTER_SUBTYPE_FR = {
  'any race': "n'importe quelle race",
  demon: 'démon',
  devil: 'diable',
  dwarf: 'nain',
  elf: 'elfe',
  gnoll: 'gnoll',
  gnome: 'gnome',
  goblinoid: 'gobelinoïde',
  grimlock: 'grimlock',
  human: 'humain',
  kobold: 'kobold',
  lizardfolk: 'homme-lézard',
  merfolk: 'triton',
  orc: 'orc',
  sahuagin: 'sahuagin',
  shapechanger: 'métamorphe',
  titan: 'titan',
};

const MONSTER_ALIGNMENT_FR = {
  'any alignment': "n'importe quel alignement",
  'any chaotic alignment': "n'importe quel alignement chaotique",
  'any evil alignment': "n'importe quel alignement mauvais",
  'any non-good alignment': "n'importe quel alignement non bon",
  'any non-lawful alignment': "n'importe quel alignement non loyal",
  'chaotic evil': 'chaotique mauvais',
  'chaotic good': 'chaotique bon',
  'chaotic neutral': 'chaotique neutre',
  'lawful evil': 'loyal mauvais',
  'lawful good': 'loyal bon',
  'lawful neutral': 'loyal neutre',
  neutral: 'neutre',
  'neutral evil': 'neutre mauvais',
  'neutral good': 'neutre bon',
  'neutral good (50%) or neutral evil (50%)': 'neutre bon (50 %) ou neutre mauvais (50 %)',
  unaligned: 'sans alignement',
};

const SPEED_LABEL_FR = {
  fly: 'vol',
  swim: 'nage',
  climb: 'escalade',
  burrow: 'fouissage',
};

function feetToMeters(feet) {
  const meters = feet * 0.3;
  const rounded = Math.round(meters * 10) / 10;
  return String(rounded).replace('.', ',');
}

function translateSpeed(speed) {
  if (!speed) return null;
  const segments = speed.split(',').map((s) => s.trim());
  const translated = segments.map((segment) => {
    if (segment === 'hover true') return 'vol stationnaire';
    const labeled = segment.match(/^(\w+)\s+(\d+)\s*ft\.?$/);
    if (labeled) {
      const [, label, feet] = labeled;
      const labelFr = SPEED_LABEL_FR[label] ?? label;
      return `${labelFr} ${feetToMeters(Number(feet))} mètres`;
    }
    const bare = segment.match(/^(\d+)\s*ft\.?$/);
    if (bare) {
      return `${feetToMeters(Number(bare[1]))} mètres`;
    }
    return segment;
  });
  return translated.join(', ');
}

const EQUIPMENT_CATEGORY_FR = {
  'Adventuring Gear': "Matériel d'aventurier",
  Armor: 'Armures',
  'Mounts and Vehicles': 'Montures et véhicules',
  Tools: 'Outils',
  Weapon: 'Armes',
};

const EQUIPMENT_SUBCATEGORY_FR = {
  Ammunition: 'Munitions',
  'Arcane Foci': 'Focaliseurs arcaniques',
  "Artisan's Tools": "Outils d'artisan",
  'Druidic Foci': 'Focaliseurs druidiques',
  'Equipment Packs': 'Paquetages',
  'Gaming Sets': 'Jeux',
  Heavy: 'Lourde',
  'Holy Symbols': 'Symboles sacrés',
  Kits: 'Kits',
  Light: 'Légère',
  Martial: 'De guerre',
  Medium: 'Intermédiaire',
  'Musical Instrument': 'Instrument de musique',
  'Other Tools': 'Autres outils',
  Shield: 'Bouclier',
  Simple: 'Courante',
  'Standard Gear': 'Équipement standard',
};

const DAMAGE_TYPE_FR = {
  Bludgeoning: 'Contondant',
  Piercing: 'Perforant',
  Slashing: 'Tranchant',
};

const MAGIC_ITEM_RARITY_FR = {
  Common: 'Commun',
  Uncommon: 'Peu commun',
  Rare: 'Rare',
  'Very Rare': 'Très rare',
  Legendary: 'Légendaire',
  Artifact: 'Artefact',
  Varies: 'Variable',
};

const MAGIC_ITEM_CATEGORY_FR = {
  Armor: 'Armure',
  Ammunition: 'Munition',
  'Wondrous Items': 'Objets merveilleux',
  Potion: 'Potion',
  Weapon: 'Arme',
  Ring: 'Anneau',
  Rod: 'Sceptre',
  Scroll: 'Parchemin',
  Staff: 'Bâton',
  Wand: 'Baguette',
};

async function translateSpells() {
  const spells = await prisma.dnd5eSpellImport.findMany();
  let updated = 0;
  for (const spell of spells) {
    await prisma.dnd5eSpellImport.update({
      where: { id: spell.id },
      data: {
        schoolFr: spell.school ? SPELL_SCHOOL_FR[spell.school] ?? null : null,
        castingTimeFr: spell.castingTime ? SPELL_CASTING_TIME_FR[spell.castingTime] ?? null : null,
        rangeFr: spell.range ? SPELL_RANGE_FR[spell.range] ?? null : null,
        durationFr: spell.duration ? SPELL_DURATION_FR[spell.duration] ?? null : null,
      },
    });
    updated += 1;
  }
  console.log(`✅ Sorts (dictionnaire) : ${updated} mis à jour`);
}

async function translateMonsters() {
  const monsters = await prisma.dndMonster.findMany();
  let updated = 0;
  for (const monster of monsters) {
    await prisma.dndMonster.update({
      where: { id: monster.id },
      data: {
        sizeFr: monster.size ? MONSTER_SIZE_FR[monster.size] ?? null : null,
        typeFr: monster.type ? MONSTER_TYPE_FR[monster.type] ?? null : null,
        subtypeFr: monster.subtype ? MONSTER_SUBTYPE_FR[monster.subtype] ?? null : null,
        alignmentFr: monster.alignment ? MONSTER_ALIGNMENT_FR[monster.alignment] ?? null : null,
        speedFr: translateSpeed(monster.speed),
      },
    });
    updated += 1;
  }
  console.log(`✅ Monstres (dictionnaire) : ${updated} mis à jour`);
}

async function translateEquipment() {
  const items = await prisma.dnd5eEquipment.findMany();
  let updated = 0;
  for (const item of items) {
    await prisma.dnd5eEquipment.update({
      where: { id: item.id },
      data: {
        categoryFr: item.category ? EQUIPMENT_CATEGORY_FR[item.category] ?? null : null,
        subcategoryFr: item.subcategory ? EQUIPMENT_SUBCATEGORY_FR[item.subcategory] ?? null : null,
        damageTypeFr: item.damageType ? DAMAGE_TYPE_FR[item.damageType] ?? null : null,
      },
    });
    updated += 1;
  }
  console.log(`✅ Équipement (dictionnaire) : ${updated} mis à jour`);
}

async function translateMagicItems() {
  const items = await prisma.dnd5eMagicItem.findMany();
  let updated = 0;
  for (const item of items) {
    await prisma.dnd5eMagicItem.update({
      where: { id: item.id },
      data: {
        rarityFr: item.rarity ? MAGIC_ITEM_RARITY_FR[item.rarity] ?? null : null,
        categoryNameFr: item.categoryName ? MAGIC_ITEM_CATEGORY_FR[item.categoryName] ?? null : null,
      },
    });
    updated += 1;
  }
  console.log(`✅ Objets magiques (dictionnaire) : ${updated} mis à jour`);
}

async function main() {
  await translateSpells();
  await translateMonsters();
  await translateEquipment();
  await translateMagicItems();
}

main()
  .catch((e) => {
    console.error('❌ Échec traduction dictionnaires:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
