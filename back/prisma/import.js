const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_CHARACTER_SKILL_MASTERIES = {
  ACROBATICS: 'PROFICIENT',
  ANIMAL_HANDLING: 'NOT_PROFICIENT',
  ARCANA: 'NOT_PROFICIENT',
  ATHLETICS: 'NOT_PROFICIENT',
  DECEPTION: 'NOT_PROFICIENT',
  HISTORY: 'NOT_PROFICIENT',
  INSIGHT: 'PROFICIENT',
  INTIMIDATION: 'NOT_PROFICIENT',
  INVESTIGATION: 'PROFICIENT',
  MEDICINE: 'NOT_PROFICIENT',
  NATURE: 'NOT_PROFICIENT',
  PERCEPTION: 'NOT_PROFICIENT',
  PERFORMANCE: 'PROFICIENT',
  PERSUASION: 'NOT_PROFICIENT',
  RELIGION: 'NOT_PROFICIENT',
  SLEIGHT_OF_HAND: 'NOT_PROFICIENT',
  STEALTH: 'PROFICIENT',
  SURVIVAL: 'NOT_PROFICIENT',
};

const TEST_CHARACTER_SAVING_THROWS = {
  STRENGTH: true,
  DEXTERITY: true,
  CONSTITUTION: false,
  INTELLIGENCE: false,
  WISDOM: false,
  CHARISMA: false,
};

const TEST_CHARACTER_ITEMS = [
  {
    index: 'shield__copy__1775051682605-20a803a8',
    name: 'Shield',
    type: 'armor',
    category: 'Armor',
    subcategory: 'Shield',
    cost: '10 gp',
    weight: 6,
    description: '',
    damage: null,
    damageType: null,
    range: null,
    armorClass: 2,
    stealthDisadvantage: false,
    properties: {
      special: [],
      properties: [],
      armor_class: {
        base: 2,
        dex_bonus: false,
      },
      weapon_range: null,
      weapon_category: null,
      weapon_range_type: null,
    },
    raw: {
      url: '/api/2014/equipment/shield',
      cost: {
        unit: 'gp',
        quantity: 10,
      },
      desc: [],
      name: 'Shield',
      index: 'shield',
      weight: 6,
      special: [],
      contents: [],
      properties: [],
      updated_at: '2025-10-24T20:42:12.926Z',
      armor_class: {
        base: 2,
        dex_bonus: false,
      },
      str_minimum: 0,
      armor_category: 'Shield',
      equipment_category: {
        url: '/api/2014/equipment-categories/armor',
        name: 'Armor',
        index: 'armor',
      },
      stealth_disadvantage: false,
    },
    quantity: 1,
  },
  {
    index: 'reliquary__copy__1775051683682-ca9bcaf6',
    name: 'Reliquary',
    type: 'gear',
    category: 'Adventuring Gear',
    subcategory: 'Holy Symbols',
    cost: '5 gp',
    weight: 2,
    description:
      'A holy symbol is a representation of a god or pantheon. It might be an amulet depicting a symbol representing a deity, the same symbol carefully engraved or inlaid as an emblem on a shield, or a tiny box holding a fragment of a sacred relic.\nAppendix B lists the symbols commonly associated with many gods in the multiverse. A cleric or paladin can use a holy symbol as a spellcasting focus. To use the symbol in this way, the caster must hold it in hand, wear it visibly, or bear it on a shield.',
    damage: null,
    damageType: null,
    range: null,
    armorClass: null,
    stealthDisadvantage: null,
    properties: {
      special: [],
      properties: [],
      armor_class: null,
      weapon_range: null,
      weapon_category: null,
      weapon_range_type: null,
    },
    raw: {
      url: '/api/2014/equipment/reliquary',
      cost: {
        unit: 'gp',
        quantity: 5,
      },
      desc: [
        'A holy symbol is a representation of a god or pantheon. It might be an amulet depicting a symbol representing a deity, the same symbol carefully engraved or inlaid as an emblem on a shield, or a tiny box holding a fragment of a sacred relic.',
        'Appendix B lists the symbols commonly associated with many gods in the multiverse. A cleric or paladin can use a holy symbol as a spellcasting focus. To use the symbol in this way, the caster must hold it in hand, wear it visibly, or bear it on a shield.',
      ],
      name: 'Reliquary',
      index: 'reliquary',
      weight: 2,
      special: [],
      contents: [],
      properties: [],
      updated_at: '2025-10-24T20:42:12.926Z',
      gear_category: {
        url: '/api/2014/equipment-categories/holy-symbols',
        name: 'Holy Symbols',
        index: 'holy-symbols',
      },
      equipment_category: {
        url: '/api/2014/equipment-categories/adventuring-gear',
        name: 'Adventuring Gear',
        index: 'adventuring-gear',
      },
    },
    quantity: 1,
  },
];

async function main() {
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@2d10.com' },
  });

  if (!adminUser) {
    throw new Error(
      "Impossible d'importer: l'utilisateur admin (admin@2d10.com) n'existe pas. Lance d'abord le seed Prisma."
    );
  }

  // Personnage de test de l'admin (copie seedable du personnage créé manuellement)
  const existingAdminCharacter = await prisma.character.findFirst({
    where: {
      userId: adminUser.id,
      name: 'Test',
    },
  });

  const adminTestCharacter = existingAdminCharacter
    ? await prisma.character.update({
        where: { id: existingAdminCharacter.id },
        data: {
          name: 'Test',
          race: 'Elfe',
          class: 'Clerc',
          level: 6,
          background: 'Stylé',
          alignment: 'Chill',
          experiencePoints: 0,
          hitPoints: 54,
          currentHitPoints: 54,
          hitDice: '3d10',
          hitDiceRemaining: null,
          armorClass: 13,
          speed: null,
          strength: 18,
          dexterity: 16,
          constitution: 10,
          intelligence: 8,
          wisdom: 11,
          charisma: 14,
          description: null,
          notes: null,
          isActive: true,
        },
      })
    : await prisma.character.create({
        data: {
          userId: adminUser.id,
          name: 'Test',
          race: 'Elfe',
          class: 'Clerc',
          level: 6,
          background: 'Stylé',
          alignment: 'Chill',
          experiencePoints: 0,
          hitPoints: 54,
          currentHitPoints: 54,
          hitDice: '3d10',
          hitDiceRemaining: null,
          armorClass: 13,
          speed: null,
          strength: 18,
          dexterity: 16,
          constitution: 10,
          intelligence: 8,
          wisdom: 11,
          charisma: 14,
          description: null,
          notes: null,
          isActive: true,
        },
      });

  for (const [skill, mastery] of Object.entries(TEST_CHARACTER_SKILL_MASTERIES)) {
    await prisma.characterSkill.upsert({
      where: {
        characterId_skill: {
          characterId: adminTestCharacter.id,
          skill,
        },
      },
      update: { mastery },
      create: {
        characterId: adminTestCharacter.id,
        skill,
        mastery,
      },
    });
  }

  for (const [ability, proficient] of Object.entries(TEST_CHARACTER_SAVING_THROWS)) {
    await prisma.characterSavingThrow.upsert({
      where: {
        characterId_ability: {
          characterId: adminTestCharacter.id,
          ability,
        },
      },
      update: { proficient },
      create: {
        characterId: adminTestCharacter.id,
        ability,
        proficient,
      },
    });
  }

  for (let level = 0; level <= 9; level += 1) {
    await prisma.characterSpellSlot.upsert({
      where: {
        characterId_level: {
          characterId: adminTestCharacter.id,
          level,
        },
      },
      update: {
        slotsMax: 0,
        slotsUsed: 0,
      },
      create: {
        characterId: adminTestCharacter.id,
        level,
        slotsMax: 0,
        slotsUsed: 0,
      },
    });
  }

  await prisma.purse.upsert({
    where: { characterId: adminTestCharacter.id },
    update: {
      copperPieces: 0,
      silverPieces: 0,
      electrumPieces: 0,
      goldPieces: 0,
      platinumPieces: 0,
    },
    create: {
      characterId: adminTestCharacter.id,
      copperPieces: 0,
      silverPieces: 0,
      electrumPieces: 0,
      goldPieces: 0,
      platinumPieces: 0,
    },
  });

  for (const itemData of TEST_CHARACTER_ITEMS) {
    const item = await prisma.item.upsert({
      where: { index: itemData.index },
      update: {
        name: itemData.name,
        type: itemData.type,
        category: itemData.category,
        subcategory: itemData.subcategory,
        cost: itemData.cost,
        weight: itemData.weight,
        description: itemData.description,
        damage: itemData.damage,
        damageType: itemData.damageType,
        range: itemData.range,
        armorClass: itemData.armorClass,
        stealthDisadvantage: itemData.stealthDisadvantage,
        properties: itemData.properties,
        raw: itemData.raw,
        isActive: true,
      },
      create: {
        index: itemData.index,
        name: itemData.name,
        type: itemData.type,
        category: itemData.category,
        subcategory: itemData.subcategory,
        cost: itemData.cost,
        weight: itemData.weight,
        description: itemData.description,
        damage: itemData.damage,
        damageType: itemData.damageType,
        range: itemData.range,
        armorClass: itemData.armorClass,
        stealthDisadvantage: itemData.stealthDisadvantage,
        properties: itemData.properties,
        raw: itemData.raw,
        isActive: true,
      },
    });

    await prisma.inventory.upsert({
      where: {
        characterId_itemId: {
          characterId: adminTestCharacter.id,
          itemId: item.id,
        },
      },
      update: {
        quantity: itemData.quantity,
        notes: null,
      },
      create: {
        characterId: adminTestCharacter.id,
        itemId: item.id,
        quantity: itemData.quantity,
        notes: null,
      },
    });
  }

  console.log('✅ Import terminé (admin_character + skills + saving throws + spell slots + purse + items + inventory)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

