const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function checkCharacterAccess(req, res, next) {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const userId = req.user.id;
    const userRole = req.user.role_name;

    if (Number.isNaN(characterId)) return res.status(400).json({ error: 'ID personnage invalide' });
    if (userRole === 'admin' || userRole === 'gm') return next();

    const character = await prisma.character.findFirst({
      where: { id: characterId, isActive: true },
      select: { userId: true },
    });

    if (!character) return res.status(404).json({ error: 'Personnage non trouvé' });
    if (character.userId !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous n\'êtes pas propriétaire de ce personnage.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification d\'accès au personnage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

router.get('/:characterId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { level, school, prepared_only, known_only } = req.query;

    const where = {
      characterId,
      ...(level ? { spell: { level: parseInt(level, 10) } } : {}),
      ...(school ? { spell: { school: String(school) } } : {}),
      ...(prepared_only === 'true' ? { isPrepared: true } : {}),
      ...(known_only === 'true' ? { isKnown: true } : {}),
    };

    const grimoire = await prisma.grimoire.findMany({
      where,
      include: { spell: true },
      orderBy: [{ spell: { level: 'asc' } }, { spell: { name: 'asc' } }],
    });

    const stats = {
      total_spells: grimoire.length,
      prepared_spells: grimoire.filter((s) => s.isPrepared).length,
      known_spells: grimoire.filter((s) => s.isKnown).length,
      spells_by_level: {},
      spells_by_school: {},
    };

    grimoire.forEach((spell) => {
      const lvl = spell.spell?.level ?? null;
      const sch = spell.spell?.school ?? null;
      if (lvl != null) stats.spells_by_level[lvl] = (stats.spells_by_level[lvl] || 0) + 1;
      if (sch) stats.spells_by_school[sch] = (stats.spells_by_school[sch] || 0) + 1;
    });

    const formatted = grimoire.map((s) => {
      const d = s.spell;
      return {
        id: s.id,
        character_id: s.characterId,
        spell_id: s.spellId,
        spell_index: d?.index ?? null,
        spell_name: d?.name ?? null,
        spell_level: d?.level ?? null,
        spell_school: d?.school ?? null,
        is_prepared: s.isPrepared,
        is_known: s.isKnown,
        times_prepared: s.timesPrepared,
        times_cast: s.timesCast,
        notes: s.notes,
        learned_at: s.learnedAt,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        description: d?.description ?? null,
        casting_time: d?.castingTime ?? null,
        range: d?.range ?? null,
        components: d?.components ?? null,
        duration: d?.duration ?? null,
        higher_level: d?.higherLevel ?? null,
        ritual: d?.ritual ?? null,
        concentration: d?.concentration ?? null,
      };
    });

    res.json({ success: true, grimoire: formatted, stats });
  } catch (error) {
    console.error('Erreur lors de la récupération du grimoire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:characterId/spells', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { spell_id, is_prepared = false, is_known = true, notes } = req.body;

    const spellId = parseInt(spell_id, 10);
    if (Number.isNaN(spellId)) return res.status(400).json({ error: 'spell_id requis' });

    const spellDetails = await prisma.spell.findFirst({ where: { id: spellId, isActive: true } });
    if (!spellDetails) return res.status(404).json({ error: 'Sort non trouvé' });

    const spell = await prisma.grimoire.create({
      data: {
        characterId,
        spellId: spellDetails.id,
        isPrepared: is_prepared,
        isKnown: is_known,
        notes,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Sort ajouté au grimoire',
      spell,
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du sort au grimoire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:characterId/spells/:spellId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const spellId = parseInt(req.params.spellId, 10);
    const { is_prepared, is_known, times_prepared, times_cast, notes } = req.body;

    const existing = await prisma.grimoire.findFirst({ where: { id: spellId, characterId } });
    if (!existing) return res.status(404).json({ error: 'Sort non trouvé dans le grimoire' });

    const spell = await prisma.grimoire.update({
      where: { id: spellId },
      data: {
        ...(is_prepared !== undefined ? { isPrepared: is_prepared } : {}),
        ...(is_known !== undefined ? { isKnown: is_known } : {}),
        ...(times_prepared !== undefined ? { timesPrepared: times_prepared } : {}),
        ...(times_cast !== undefined ? { timesCast: times_cast } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    res.json({ success: true, message: 'Sort modifié avec succès', spell });
  } catch (error) {
    console.error('Erreur lors de la modification du sort:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:characterId/spells/:spellId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const spellId = parseInt(req.params.spellId, 10);

    const existing = await prisma.grimoire.findFirst({ where: { id: spellId, characterId } });
    if (!existing) return res.status(404).json({ error: 'Sort non trouvé dans le grimoire' });

    await prisma.grimoire.delete({ where: { id: spellId } });
    res.json({ success: true, message: 'Sort supprimé du grimoire' });
  } catch (error) {
    console.error('Erreur lors de la suppression du sort:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:characterId/prepare', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { spell_ids } = req.body;

    if (!Array.isArray(spell_ids)) return res.status(400).json({ error: 'spell_ids doit être un tableau' });

    await prisma.grimoire.updateMany({ where: { characterId }, data: { isPrepared: false } });
    if (spell_ids.length > 0) {
      await prisma.grimoire.updateMany({
        where: { characterId, id: { in: spell_ids.map((id) => parseInt(id, 10)) } },
        data: { isPrepared: true, timesPrepared: { increment: 1 } },
      });
    }

    res.json({ success: true, message: `${spell_ids.length} sorts préparés avec succès` });
  } catch (error) {
    console.error('Erreur lors de la préparation des sorts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:characterId/cast/:spellId', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const spellId = parseInt(req.params.spellId, 10);

    const existing = await prisma.grimoire.findFirst({ where: { id: spellId, characterId } });
    if (!existing) return res.status(404).json({ error: 'Sort non trouvé dans le grimoire' });

    const spell = await prisma.grimoire.update({
      where: { id: spellId },
      data: { timesCast: { increment: 1 } },
    });

    res.json({ success: true, message: 'Sort lancé avec succès', spell });
  } catch (error) {
    console.error('Erreur lors du lancement du sort:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:characterId/search', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { q, level, school, limit = 20 } = req.query;

    if (!q) return res.status(400).json({ error: 'Paramètre de recherche "q" requis' });

    const spells = await prisma.spell.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
        ...(level ? { level: parseInt(level, 10) } : {}),
        ...(school ? { school } : {}),
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      take: parseInt(limit, 10),
    });

    res.json({ success: true, spells, count: spells.length });
  } catch (error) {
    console.error('Erreur lors de la recherche de sorts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:characterId/stats', authenticateToken, checkCharacterAccess, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);

    const [byLevel, bySchool] = await Promise.all([
      prisma.grimoire.groupBy({
        by: ['spellId'],
        where: { characterId },
        _count: { _all: true },
        _sum: { timesCast: true },
        _avg: { timesCast: true },
      }),
      prisma.grimoire.findMany({ where: { characterId }, include: { spell: { select: { school: true, level: true } } } }),
    ]);

    const schoolCounts = {};
    const levelCounts = {};
    for (const row of bySchool) {
      const school = row.spell?.school;
      const lvl = row.spell?.level;
      if (school) schoolCounts[school] = (schoolCounts[school] || 0) + 1;
      if (lvl != null) levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
    }

    res.json({
      success: true,
      stats: {
        by_level: Object.entries(levelCounts)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([spell_level, count]) => ({ spell_level: Number(spell_level), count })),
        by_school: Object.entries(schoolCounts)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .map(([spell_school, count]) => ({ spell_school, count })),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
