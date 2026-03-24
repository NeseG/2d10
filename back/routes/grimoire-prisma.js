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
      ...(level ? { spellLevel: parseInt(level, 10) } : {}),
      ...(school ? { spellSchool: school } : {}),
      ...(prepared_only === 'true' ? { isPrepared: true } : {}),
      ...(known_only === 'true' ? { isKnown: true } : {}),
    };

    const grimoire = await prisma.grimoire.findMany({
      where,
      orderBy: [{ spellLevel: 'asc' }, { spellName: 'asc' }],
    });

    const stats = {
      total_spells: grimoire.length,
      prepared_spells: grimoire.filter((s) => s.isPrepared).length,
      known_spells: grimoire.filter((s) => s.isKnown).length,
      spells_by_level: {},
      spells_by_school: {},
    };

    grimoire.forEach((spell) => {
      stats.spells_by_level[spell.spellLevel] = (stats.spells_by_level[spell.spellLevel] || 0) + 1;
      if (spell.spellSchool) {
        stats.spells_by_school[spell.spellSchool] = (stats.spells_by_school[spell.spellSchool] || 0) + 1;
      }
    });

    const spellSlugs = [...new Set(grimoire.map((s) => s.spellSlug))];
    const spellDetails = await prisma.dndSpell.findMany({
      where: { slug: { in: spellSlugs } },
    });
    const detailsMap = new Map(spellDetails.map((d) => [d.slug, d]));

    const formatted = grimoire.map((s) => {
      const d = detailsMap.get(s.spellSlug);
      return {
        id: s.id,
        character_id: s.characterId,
        spell_id: s.spellId,
        spell_slug: s.spellSlug,
        spell_name: s.spellName,
        spell_level: s.spellLevel,
        spell_school: s.spellSchool,
        is_prepared: s.isPrepared,
        is_known: s.isKnown,
        times_prepared: s.timesPrepared,
        times_cast: s.timesCast,
        notes: s.notes,
        learned_at: s.learnedAt,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        description: d?.description || null,
        casting_time: d?.castingTime || null,
        range: d?.range || null,
        components: d?.components || null,
        duration: d?.duration || null,
        higher_level: d?.higherLevel || null,
        ritual: d?.ritual || null,
        concentration: d?.concentration || null,
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
    const { spell_slug, spell_name, spell_level, spell_school, is_prepared = false, is_known = true, notes } = req.body;

    if (!spell_slug || !spell_name || spell_level === undefined) {
      return res.status(400).json({ error: 'spell_slug, spell_name et spell_level sont requis' });
    }

    const existing = await prisma.grimoire.findFirst({
      where: { characterId, spellSlug: spell_slug },
      select: { id: true },
    });
    if (existing) return res.status(400).json({ error: 'Ce sort est déjà dans le grimoire' });

    const spellDetails = await prisma.dndSpell.findUnique({ where: { slug: spell_slug } });

    const spell = await prisma.grimoire.create({
      data: {
        characterId,
        spellId: spellDetails?.id || null,
        spellSlug: spell_slug,
        spellName: spell_name,
        spellLevel: spell_level,
        spellSchool: spell_school,
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

    const spells = await prisma.dndSpell.findMany({
      where: {
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

    const existing = await prisma.grimoire.findMany({
      where: { characterId, spellSlug: { in: spells.map((s) => s.slug) } },
      select: { spellSlug: true, isPrepared: true, isKnown: true },
    });
    const existingMap = new Map(existing.map((g) => [g.spellSlug, g]));

    const result = spells.map((s) => ({
      ...s,
      in_grimoire: existingMap.has(s.slug),
      is_prepared: existingMap.get(s.slug)?.isPrepared || false,
      is_known: existingMap.get(s.slug)?.isKnown || false,
    }));

    res.json({ success: true, spells: result, count: result.length });
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
        by: ['spellLevel'],
        where: { characterId },
        _count: { _all: true },
        _sum: { timesCast: true },
        _avg: { timesCast: true },
        orderBy: { spellLevel: 'asc' },
      }),
      prisma.grimoire.groupBy({
        by: ['spellSchool'],
        where: { characterId, spellSchool: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { spellSchool: 'desc' } },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        by_level: byLevel.map((row) => ({
          total_spells: row._count._all,
          prepared_spells: null,
          known_spells: null,
          total_casts: row._sum.timesCast || 0,
          avg_casts_per_spell: row._avg.timesCast || 0,
          spell_level: row.spellLevel,
          spells_at_level: row._count._all,
        })),
        by_school: bySchool.map((row) => ({
          spell_school: row.spellSchool,
          count: row._count._all,
          prepared_count: null,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
