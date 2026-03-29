const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
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
const SKILL_MASTERIES = ['NOT_PROFICIENT', 'PROFICIENT', 'EXPERTISE'];
const ABILITIES = ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'];
const CHARACTER_FEATURE_CATEGORIES = [
  'CLASS_FEATURE',
  'RACIAL_TRAIT',
  'FEAT',
  'PERSONALITY_AND_BACKGROUND',
  'OTHER_PROFICIENCIES_AND_LANGUAGES',
];

async function getAccessibleCharacterOrNull(characterId, user) {
  const where = {
    id: characterId,
    ...(user.role_name !== 'admin' && user.role_name !== 'gm' ? { userId: user.id } : {}),
  };
  return prisma.character.findFirst({ where, select: { id: true } });
}

function normalizeSkills(skillsInput) {
  if (!Array.isArray(skillsInput)) return [];
  return skillsInput
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      skill: typeof entry.skill === 'string' ? entry.skill.trim().toUpperCase() : '',
      mastery: typeof entry.mastery === 'string' ? entry.mastery.trim().toUpperCase() : '',
    }))
    .filter((entry) => DND_SKILLS.includes(entry.skill) && SKILL_MASTERIES.includes(entry.mastery));
}

function normalizeSavingThrows(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      ability: typeof entry.ability === 'string' ? entry.ability.trim().toUpperCase() : '',
      proficient: Boolean(entry.proficient),
    }))
    .filter((entry) => ABILITIES.includes(entry.ability));
}

function normalizeSpellSlots(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      level: Number.parseInt(String(entry.level), 10),
      slotsMax: entry.slotsMax !== undefined ? Number.parseInt(String(entry.slotsMax), 10) : undefined,
      slotsUsed: entry.slotsUsed !== undefined ? Number.parseInt(String(entry.slotsUsed), 10) : undefined,
    }))
    .filter((entry) => Number.isFinite(entry.level) && entry.level >= 0 && entry.level <= 9)
    .map((entry) => ({
      level: entry.level,
      slotsMax: entry.slotsMax !== undefined && Number.isFinite(entry.slotsMax) ? Math.max(0, entry.slotsMax) : undefined,
      slotsUsed: entry.slotsUsed !== undefined && Number.isFinite(entry.slotsUsed) ? Math.max(0, entry.slotsUsed) : undefined,
    }));
}

// Obtenir tous les personnages
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let whereClause = {};
    
    // Les admins et GM peuvent voir tous les personnages
    if (userRole !== 'admin' && userRole !== 'gm') {
      whereClause.userId = userId;
    }

    const characters = await prisma.character.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        grimoire: {
          include: {
            spell: {
              select: { id: true, index: true, name: true, level: true, school: true }
            }
          },
        },
        inventory: {
          include: {
            item: true
          }
        },
        skills: true,
        savingThrows: true,
        spellSlots: { orderBy: { level: 'asc' } },
        purse: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      characters,
      count: characters.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un personnage
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, race, class: characterClass, level, background, alignment,
      experiencePoints, hitPoints, hitPointsMax, hit_points_max, currentHitPoints, current_hit_points, hitDice, hit_dice, hitDiceRemaining, hit_dice_remaining, armorClass, speed,
      strength, dexterity, constitution, intelligence, wisdom, charisma,
      description, notes
    } = req.body;

    // Validation minimale: seul le nom est obligatoire
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du personnage est requis' });
    }

    const character = await prisma.character.create({
      data: {
        userId,
        name: name.trim(),
        race: race || undefined,
        class: characterClass || undefined,
        level: level ?? undefined,
        background,
        alignment,
        experiencePoints: experiencePoints || 0,
        hitPoints: (hitPointsMax ?? hit_points_max ?? hitPoints) ?? undefined,
        currentHitPoints: (currentHitPoints ?? current_hit_points) ?? (hitPointsMax ?? hit_points_max ?? hitPoints) ?? undefined,
        hitDice: typeof hitDice === 'string' && hitDice.trim() ? hitDice.trim() : typeof hit_dice === 'string' && hit_dice.trim() ? hit_dice.trim() : undefined,
        hitDiceRemaining: (hitDiceRemaining ?? hit_dice_remaining) ?? undefined,
        armorClass: armorClass ?? undefined,
        speed,
        strength: strength ?? undefined,
        dexterity: dexterity ?? undefined,
        constitution: constitution ?? undefined,
        intelligence: intelligence ?? undefined,
        wisdom: wisdom ?? undefined,
        charisma: charisma ?? undefined,
        description,
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    await prisma.characterSkill.createMany({
      data: DND_SKILLS.map((skill) => ({
        characterId: character.id,
        skill,
        mastery: 'NOT_PROFICIENT',
      })),
    });

    await prisma.characterSavingThrow.createMany({
      data: ABILITIES.map((ability) => ({
        characterId: character.id,
        ability,
        proficient: false,
      })),
    });

    await prisma.characterSpellSlot.createMany({
      data: Array.from({ length: 10 }, (_, lvl) => ({
        characterId: character.id,
        level: lvl,
        slotsMax: 0,
        slotsUsed: 0,
      })),
    });

    // Créer la bourse du personnage
    await prisma.purse.create({
      data: {
        characterId: character.id,
        copperPieces: 0,
        silverPieces: 0,
        electrumPieces: 0,
        goldPieces: 0,
        platinumPieces: 0,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Personnage créé avec succès',
      character
    });
  } catch (error) {
    console.error('Erreur lors de la création du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un personnage par ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    const character = await prisma.character.findFirst({
      where: {
        id: parseInt(id),
        ...(userRole !== 'admin' && userRole !== 'gm' ? { userId } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        grimoire: {
          include: { spell: true }
        },
        inventory: {
          include: {
            item: true
          }
        },
        equipment: {
          include: {
            item: true,
            slot: true
          }
        },
        skills: true,
        savingThrows: true,
        spellSlots: { orderBy: { level: 'asc' } },
        purse: true,
        campaignCharacters: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!character) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    res.json({
      success: true,
      character: {
        ...character,
        hitPointsMax: character.hitPoints ?? null,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===== Character Features (traits, dons, langues, etc.) =====
router.get('/:id/features', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id, 10);
    if (Number.isNaN(characterId)) return res.status(400).json({ error: 'ID personnage invalide' });

    const accessible = await getAccessibleCharacterOrNull(characterId, req.user);
    if (!accessible) return res.status(404).json({ error: 'Personnage non trouvé' });

    const features = await prisma.characterFeature.findMany({
      where: { characterId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      features: features.map((f) => ({
        id: f.id,
        character_id: f.characterId,
        category: f.category,
        name: f.name,
        description: f.description,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des features:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/features', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id, 10);
    if (Number.isNaN(characterId)) return res.status(400).json({ error: 'ID personnage invalide' });

    const accessible = await getAccessibleCharacterOrNull(characterId, req.user);
    if (!accessible) return res.status(404).json({ error: 'Personnage non trouvé' });

    const { category, name, description } = req.body;
    const normalizedCategory = typeof category === 'string' ? category.trim().toUpperCase() : '';
    if (!CHARACTER_FEATURE_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({ error: 'Catégorie invalide' });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const created = await prisma.characterFeature.create({
      data: {
        characterId,
        category: normalizedCategory,
        name: name.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
      },
    });

    res.status(201).json({
      success: true,
      feature: {
        id: created.id,
        character_id: created.characterId,
        category: created.category,
        name: created.name,
        description: created.description,
        created_at: created.createdAt,
        updated_at: created.updatedAt,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la création de la feature:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id/features/:featureId', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id, 10);
    const featureId = parseInt(req.params.featureId, 10);
    if (Number.isNaN(characterId) || Number.isNaN(featureId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const accessible = await getAccessibleCharacterOrNull(characterId, req.user);
    if (!accessible) return res.status(404).json({ error: 'Personnage non trouvé' });

    const existing = await prisma.characterFeature.findFirst({
      where: { id: featureId, characterId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Élément non trouvé' });

    const { category, name, description } = req.body;
    const updateData = {};
    if (category !== undefined) {
      const normalizedCategory = typeof category === 'string' ? category.trim().toUpperCase() : '';
      if (!CHARACTER_FEATURE_CATEGORIES.includes(normalizedCategory)) {
        return res.status(400).json({ error: 'Catégorie invalide' });
      }
      updateData.category = normalizedCategory;
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Le nom est requis' });
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = typeof description === 'string' && description.trim() ? description.trim() : null;
    }
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

    const updated = await prisma.characterFeature.update({
      where: { id: featureId },
      data: updateData,
    });

    res.json({
      success: true,
      feature: {
        id: updated.id,
        character_id: updated.characterId,
        category: updated.category,
        name: updated.name,
        description: updated.description,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la feature:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id/features/:featureId', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id, 10);
    const featureId = parseInt(req.params.featureId, 10);
    if (Number.isNaN(characterId) || Number.isNaN(featureId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const accessible = await getAccessibleCharacterOrNull(characterId, req.user);
    if (!accessible) return res.status(404).json({ error: 'Personnage non trouvé' });

    const existing = await prisma.characterFeature.findFirst({
      where: { id: featureId, characterId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Élément non trouvé' });

    await prisma.characterFeature.delete({ where: { id: featureId } });
    res.json({ success: true, message: 'Élément supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la feature:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un personnage
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Vérifier que l'utilisateur peut modifier ce personnage
    const existingCharacter = await prisma.character.findFirst({
      where: {
        id: parseInt(id),
        ...(userRole !== 'admin' && userRole !== 'gm' ? { userId } : {})
      }
    });

    if (!existingCharacter) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    const {
      skills,
      savingThrows,
      spellSlots,
      name,
      race,
      class: characterClass,
      level,
      background,
      alignment,
      experiencePoints,
      hitPoints,
      hitPointsMax,
      hit_points_max,
      currentHitPoints,
      current_hit_points,
      hitDice,
      hit_dice,
      hitDiceRemaining,
      hit_dice_remaining,
      armorClass,
      speed,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
      description,
      notes,
    } = req.body;

    const normalizedSkills = normalizeSkills(skills);
    const normalizedSavingThrows = normalizeSavingThrows(savingThrows);
    const normalizedSpellSlots = normalizeSpellSlots(spellSlots);
    const updatedCharacter = await prisma.$transaction(async (tx) => {
      const nextCharacter = await tx.character.update({
        where: { id: parseInt(id) },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(race !== undefined ? { race } : {}),
          ...(characterClass !== undefined ? { class: characterClass } : {}),
          ...(level !== undefined ? { level } : {}),
          ...(background !== undefined ? { background } : {}),
          ...(alignment !== undefined ? { alignment } : {}),
          ...(experiencePoints !== undefined ? { experiencePoints } : {}),
          ...((hitPointsMax !== undefined || hit_points_max !== undefined || hitPoints !== undefined)
            ? { hitPoints: (hitPointsMax ?? hit_points_max ?? hitPoints) }
            : {}),
          ...((currentHitPoints !== undefined || current_hit_points !== undefined)
            ? { currentHitPoints: (currentHitPoints ?? current_hit_points) }
            : {}),
          ...(hitDice !== undefined || hit_dice !== undefined
            ? { hitDice: typeof (hitDice ?? hit_dice) === 'string' && String(hitDice ?? hit_dice).trim() ? String(hitDice ?? hit_dice).trim() : null }
            : {}),
          ...((hitDiceRemaining !== undefined || hit_dice_remaining !== undefined)
            ? { hitDiceRemaining: (hitDiceRemaining ?? hit_dice_remaining) }
            : {}),
          ...(armorClass !== undefined ? { armorClass } : {}),
          ...(speed !== undefined ? { speed } : {}),
          ...(strength !== undefined ? { strength } : {}),
          ...(dexterity !== undefined ? { dexterity } : {}),
          ...(constitution !== undefined ? { constitution } : {}),
          ...(intelligence !== undefined ? { intelligence } : {}),
          ...(wisdom !== undefined ? { wisdom } : {}),
          ...(charisma !== undefined ? { charisma } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(notes !== undefined ? { notes } : {}),
          updatedAt: new Date(),
        },
      });

      if (normalizedSkills.length > 0) {
        await Promise.all(
          normalizedSkills.map((entry) =>
            tx.characterSkill.upsert({
              where: {
                characterId_skill: {
                  characterId: parseInt(id),
                  skill: entry.skill,
                },
              },
              update: {
                mastery: entry.mastery,
              },
              create: {
                characterId: parseInt(id),
                skill: entry.skill,
                mastery: entry.mastery,
              },
            })
          )
        );
      }

      if (normalizedSavingThrows.length > 0) {
        await Promise.all(
          normalizedSavingThrows.map((entry) =>
            tx.characterSavingThrow.upsert({
              where: {
                characterId_ability: {
                  characterId: parseInt(id),
                  ability: entry.ability,
                },
              },
              update: {
                proficient: entry.proficient,
              },
              create: {
                characterId: parseInt(id),
                ability: entry.ability,
                proficient: entry.proficient,
              },
            })
          )
        );
      }

      if (normalizedSpellSlots.length > 0) {
        await Promise.all(
          normalizedSpellSlots.map((entry) =>
            tx.characterSpellSlot.upsert({
              where: {
                characterId_level: {
                  characterId: parseInt(id),
                  level: entry.level,
                },
              },
              update: {
                ...(entry.slotsMax !== undefined ? { slotsMax: entry.slotsMax } : {}),
                ...(entry.slotsUsed !== undefined ? { slotsUsed: entry.slotsUsed } : {}),
              },
              create: {
                characterId: parseInt(id),
                level: entry.level,
                slotsMax: entry.slotsMax ?? 0,
                slotsUsed: entry.slotsUsed ?? 0,
              },
            })
          )
        );
      }

      return tx.character.findUnique({
        where: { id: nextCharacter.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          skills: true,
          savingThrows: true,
          spellSlots: { orderBy: { level: 'asc' } },
        },
      });
    });

    res.json({
      success: true,
      message: 'Personnage modifié avec succès',
      character:
        updatedCharacter
          ? { ...updatedCharacter, hitPointsMax: updatedCharacter.hitPoints ?? null }
          : updatedCharacter
    });
  } catch (error) {
    console.error('Erreur lors de la modification du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un personnage
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;
    const characterId = parseInt(id, 10);

    if (Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID personnage invalide' });
    }

    // Vérifier que l'utilisateur peut supprimer ce personnage
    const existingCharacter = await prisma.character.findFirst({
      where: {
        id: characterId,
        ...(userRole !== 'admin' && userRole !== 'gm' ? { userId } : {})
      }
    });

    if (!existingCharacter) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    // Supprimer les relations enfants avant le personnage (FK)
    await prisma.$transaction(async (tx) => {
      await tx.characterSkill.deleteMany({ where: { characterId } });
      await tx.characterSavingThrow.deleteMany({ where: { characterId } });
      await tx.characterSpellSlot.deleteMany({ where: { characterId } });
      await tx.grimoire.deleteMany({ where: { characterId } });
      await tx.inventory.deleteMany({ where: { characterId } });
      await tx.equipment.deleteMany({ where: { characterId } });
      await tx.characterDnd5eInventory.deleteMany({ where: { characterId } });
      await tx.campaignCharacter.deleteMany({ where: { characterId } });
      await tx.sessionAttendance.deleteMany({ where: { characterId } });
      await tx.purse.deleteMany({ where: { characterId } });

      await tx.character.delete({ where: { id: characterId } });
    });

    res.json({
      success: true,
      message: 'Personnage supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques des personnages
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;

    let whereClause = {};
    if (userRole !== 'admin' && userRole !== 'gm') {
      whereClause.userId = userId;
    }

    const [
      totalCharacters,
      charactersByClass,
      charactersByRace,
      averageLevel
    ] = await Promise.all([
      prisma.character.count({ where: whereClause }),
      prisma.character.groupBy({
        by: ['class'],
        where: whereClause,
        _count: { class: true }
      }),
      prisma.character.groupBy({
        by: ['race'],
        where: whereClause,
        _count: { race: true }
      }),
      prisma.character.aggregate({
        where: whereClause,
        _avg: { level: true }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalCharacters,
        charactersByClass,
        charactersByRace,
        averageLevel: averageLevel._avg.level || 0
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

