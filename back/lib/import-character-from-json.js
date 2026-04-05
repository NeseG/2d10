const { nextInventorySortOrder } = require('./next-inventory-sort-order');

const DND_SKILLS = [
  'ACROBATICS',
  'ANIMAL_HANDLING',
  'ARCANA',
  'ATHLETICS',
  'DECEPTION',
  'HISTORY',
  'INSIGHT',
  'INTIMIDATION',
  'INVESTIGATION',
  'MEDICINE',
  'NATURE',
  'PERCEPTION',
  'PERFORMANCE',
  'PERSUASION',
  'RELIGION',
  'SLEIGHT_OF_HAND',
  'STEALTH',
  'SURVIVAL',
];

const ABILITIES = ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'];

const SKILL_MASTERIES = new Set(['NOT_PROFICIENT', 'PROFICIENT', 'EXPERTISE']);

function makeUniqueItemIndex(base) {
  const safeBase = String(base || 'item')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${safeBase || 'item'}__excel__${suffix}`;
}

/**
 * Crée un personnage complet (fiche type Excel → JSON).
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {number} userId
 * @param {Record<string, unknown>} data même forme que `scripts/examples/revan-feuille-excel.json`
 */
async function importCharacterFromJson(prismaClient, userId, data) {
  const name = String(data.name || '').trim();
  if (!name) {
    const err = new Error('Champ name requis');
    err.statusCode = 400;
    throw err;
  }

  const skillsInput = data.skills && typeof data.skills === 'object' ? data.skills : {};
  const savingInput = data.savingThrows && typeof data.savingThrows === 'object' ? data.savingThrows : {};

  return prismaClient.$transaction(async (tx) => {
    const created = await tx.character.create({
      data: {
        userId,
        name,
        race: data.race ?? null,
        class: data.class ?? null,
        archetype: data.archetype ?? null,
        background: data.background ?? null,
        alignment: data.alignment ?? null,
        level: data.level != null ? Number(data.level) : null,
        experiencePoints: data.experiencePoints != null ? Number(data.experiencePoints) : 0,
        hitPoints: data.hitPoints != null ? Number(data.hitPoints) : null,
        currentHitPoints: data.currentHitPoints != null ? Number(data.currentHitPoints) : null,
        hitDice: data.hitDice ?? null,
        hitDiceRemaining: data.hitDiceRemaining != null ? Number(data.hitDiceRemaining) : null,
        armorClass: data.armorClass != null ? Number(data.armorClass) : null,
        speed: data.speed != null ? Number(data.speed) : null,
        strength: data.strength != null ? Number(data.strength) : null,
        dexterity: data.dexterity != null ? Number(data.dexterity) : null,
        constitution: data.constitution != null ? Number(data.constitution) : null,
        intelligence: data.intelligence != null ? Number(data.intelligence) : null,
        wisdom: data.wisdom != null ? Number(data.wisdom) : null,
        charisma: data.charisma != null ? Number(data.charisma) : null,
        description: data.description ?? null,
        notes: data.notes ?? null,
        spellcastingAbility: data.spellcastingAbility ?? null,
        ...(data.destiny != null && String(data.destiny).trim() !== ''
          ? { destiny: Math.max(0, Number.parseInt(String(data.destiny), 10) || 0) }
          : {}),
      },
    });

    const cid = created.id;

    for (const ability of ABILITIES) {
      const proficient = Boolean(savingInput[ability]);
      await tx.characterSavingThrow.create({
        data: {
          characterId: cid,
          ability,
          proficient,
        },
      });
    }

    for (const skill of DND_SKILLS) {
      let mastery = 'NOT_PROFICIENT';
      const v = skillsInput[skill];
      if (typeof v === 'string' && SKILL_MASTERIES.has(v.toUpperCase())) {
        mastery = v.toUpperCase();
      } else if (v === true) {
        mastery = 'PROFICIENT';
      }
      await tx.characterSkill.create({
        data: {
          characterId: cid,
          skill,
          mastery,
        },
      });
    }

    if (Array.isArray(data.spellSlots)) {
      for (const row of data.spellSlots) {
        const lvl = Number.parseInt(String(row.level), 10);
        if (Number.isNaN(lvl) || lvl < 0 || lvl > 9) continue;
        const slotsMax = row.slotsMax != null ? Math.max(0, Number.parseInt(String(row.slotsMax), 10)) : 0;
        const slotsUsed =
          row.slotsUsed != null ? Math.max(0, Number.parseInt(String(row.slotsUsed), 10)) : 0;
        await tx.characterSpellSlot.create({
          data: { characterId: cid, level: lvl, slotsMax, slotsUsed },
        });
      }
    }

    if (data.purse && typeof data.purse === 'object') {
      const p = data.purse;
      await tx.purse.create({
        data: {
          characterId: cid,
          copperPieces: Number(p.copper) || 0,
          silverPieces: Number(p.silver) || 0,
          electrumPieces: Number(p.electrum) || 0,
          goldPieces: Number(p.gold) || 0,
          platinumPieces: Number(p.platinum) || 0,
        },
      });
    }

    if (Array.isArray(data.features)) {
      for (const f of data.features) {
        if (!f || !f.name) continue;
        await tx.characterFeature.create({
          data: {
            characterId: cid,
            category: f.category || 'CLASS_FEATURE',
            name: String(f.name).trim(),
            description: f.description != null ? String(f.description) : null,
          },
        });
      }
    }

    if (Array.isArray(data.inventory)) {
      for (const inv of data.inventory) {
        if (!inv || !inv.name) continue;
        const item = await tx.item.create({
          data: {
            index: makeUniqueItemIndex(inv.name),
            name: String(inv.name).trim(),
            type: inv.type || 'other',
            category: inv.category ?? null,
            description: inv.description ?? null,
            damage: inv.damage ?? null,
            damageType: inv.damageType ?? null,
            range: inv.range ?? null,
            properties: inv.properties != null ? inv.properties : undefined,
          },
        });
        const qty = inv.quantity != null ? Math.max(0, Number.parseInt(String(inv.quantity), 10)) : 1;
        const sortOrder = await nextInventorySortOrder(tx, cid);
        await tx.inventory.create({
          data: {
            characterId: cid,
            itemId: item.id,
            quantity: Number.isFinite(qty) ? qty : 1,
            notes: inv.notes ?? null,
            sortOrder,
          },
        });
      }
    }

    return created;
  });
}

module.exports = {
  importCharacterFromJson,
  DND_SKILLS,
  ABILITIES,
};
