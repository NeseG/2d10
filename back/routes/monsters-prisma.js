const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');

const router = express.Router();

function slugify(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeUniqueSlugFromName(name) {
  const base = slugify(name || 'monster') || 'monster';
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${base}__manual__${suffix}`;
}

// GET /api/monsters?q=&type=&challenge_rating=&limit=&page=
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const q = String(req.query.q || '').trim();
    const type = req.query.type ? String(req.query.type) : null;
    const challengeRating = req.query.challenge_rating ? String(req.query.challenge_rating) : null;

    const and = [{ isActive: true }];
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (type) and.push({ type });
    if (challengeRating) and.push({ challengeRating });
    const where = { AND: and };

    const [items, total] = await Promise.all([
      prisma.monster.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        take: limit,
        skip,
      }),
      prisma.monster.count({ where }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erreur liste monsters:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/monsters/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const item = await prisma.monster.findFirst({ where: { id, isActive: true } });
    if (!item) return res.status(404).json({ error: 'Monstre non trouvé' });
    res.json({ item });
  } catch (error) {
    console.error('Erreur détail monster:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/monsters -> créer un monstre custom (MJ ou admin)
router.post('/', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const {
      slug,
      name,
      size,
      type,
      subtype,
      alignment,
      armorClass,
      hitPoints,
      hitDice,
      speed,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
      challengeRating,
      xp,
      description,
      raw,
    } = req.body ?? {};

    const safeName = String(name || '').trim();
    if (!safeName) return res.status(400).json({ error: 'name requis' });

    const slugSeed = slug ? slugify(slug) : makeUniqueSlugFromName(safeName);

    let created = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const nextSlug = attempt === 0 ? slugSeed : makeUniqueSlugFromName(safeName);
      try {
        created = await prisma.monster.create({
          data: {
            slug: nextSlug,
            name: safeName,
            size: size != null ? String(size) : null,
            type: type != null ? String(type) : null,
            subtype: subtype != null ? String(subtype) : null,
            alignment: alignment != null ? String(alignment) : null,
            armorClass: armorClass != null ? Number.parseInt(String(armorClass), 10) : null,
            hitPoints: hitPoints != null ? Number.parseInt(String(hitPoints), 10) : null,
            hitDice: hitDice != null ? String(hitDice) : null,
            speed: speed != null ? String(speed) : null,
            strength: strength != null ? Number.parseInt(String(strength), 10) : null,
            dexterity: dexterity != null ? Number.parseInt(String(dexterity), 10) : null,
            constitution: constitution != null ? Number.parseInt(String(constitution), 10) : null,
            intelligence: intelligence != null ? Number.parseInt(String(intelligence), 10) : null,
            wisdom: wisdom != null ? Number.parseInt(String(wisdom), 10) : null,
            charisma: charisma != null ? Number.parseInt(String(charisma), 10) : null,
            challengeRating: challengeRating != null ? String(challengeRating) : null,
            xp: xp != null ? Number.parseInt(String(xp), 10) : null,
            description: description != null ? String(description) : null,
            source: 'custom',
            raw: raw ?? null,
          },
        });
        break;
      } catch (e) {
        if (e?.code === 'P2002' && attempt < 2) continue;
        throw e;
      }
    }

    res.status(201).json({ item: created });
  } catch (error) {
    console.error('Erreur création monster:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/** Slug stable dans `dnd_monsters` pour un monstre validé depuis une fiche custom. */
function validatedCatalogSlug(monsterId) {
  return `validated-monster-${monsterId}`;
}

// POST /api/monsters/:id/validate-catalog — admin : copie le monstre dans la base « monstres importés » (DndMonster)
router.post('/:id/validate-catalog', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const monster = await prisma.monster.findFirst({ where: { id, isActive: true } });
    if (!monster) return res.status(404).json({ error: 'Monstre non trouvé' });

    if (monster.source !== 'custom') {
      return res.status(400).json({
        error: 'Seuls les monstres personnalisés (source custom) peuvent être validés pour le catalogue importé.',
      });
    }

    const importSlug = validatedCatalogSlug(id);

    const importRow = await prisma.dndMonster.upsert({
      where: { slug: importSlug },
      create: {
        slug: importSlug,
        name: monster.name,
        size: monster.size,
        type: monster.type,
        subtype: monster.subtype,
        alignment: monster.alignment,
        armorClass: monster.armorClass,
        hitPoints: monster.hitPoints,
        hitDice: monster.hitDice,
        speed: monster.speed,
        strength: monster.strength,
        dexterity: monster.dexterity,
        constitution: monster.constitution,
        intelligence: monster.intelligence,
        wisdom: monster.wisdom,
        charisma: monster.charisma,
        challengeRating: monster.challengeRating,
        xp: monster.xp,
        description: monster.description,
        raw: monster.raw,
      },
      update: {
        name: monster.name,
        size: monster.size,
        type: monster.type,
        subtype: monster.subtype,
        alignment: monster.alignment,
        armorClass: monster.armorClass,
        hitPoints: monster.hitPoints,
        hitDice: monster.hitDice,
        speed: monster.speed,
        strength: monster.strength,
        dexterity: monster.dexterity,
        constitution: monster.constitution,
        intelligence: monster.intelligence,
        wisdom: monster.wisdom,
        charisma: monster.charisma,
        challengeRating: monster.challengeRating,
        xp: monster.xp,
        description: monster.description,
        raw: monster.raw,
      },
    });

    const updatedMonster = await prisma.monster.update({
      where: { id },
      data: { source: 'dnd5e' },
    });

    res.json({
      message: 'Monstre validé et ajouté à la base des monstres importés.',
      item: updatedMonster,
      dnd_monster: {
        id: importRow.id,
        slug: importRow.slug,
        name: importRow.name,
        type: importRow.type,
        challengeRating: importRow.challengeRating,
      },
    });
  } catch (error) {
    console.error('Erreur validation monstre catalogue:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/monsters/:id — admin/gm uniquement
router.put('/:id', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const {
      name,
      size,
      type,
      subtype,
      alignment,
      armorClass,
      hitPoints,
      hitDice,
      speed,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
      challengeRating,
      xp,
      description,
      raw,
      isActive,
      source,
    } = req.body ?? {};

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (size !== undefined) data.size = size != null ? String(size) : null;
    if (type !== undefined) data.type = type != null ? String(type) : null;
    if (subtype !== undefined) data.subtype = subtype != null ? String(subtype) : null;
    if (alignment !== undefined) data.alignment = alignment != null ? String(alignment) : null;
    if (armorClass !== undefined) data.armorClass = armorClass != null ? Number.parseInt(String(armorClass), 10) : null;
    if (hitPoints !== undefined) data.hitPoints = hitPoints != null ? Number.parseInt(String(hitPoints), 10) : null;
    if (hitDice !== undefined) data.hitDice = hitDice != null ? String(hitDice) : null;
    if (speed !== undefined) data.speed = speed != null ? String(speed) : null;
    if (strength !== undefined) data.strength = strength != null ? Number.parseInt(String(strength), 10) : null;
    if (dexterity !== undefined) data.dexterity = dexterity != null ? Number.parseInt(String(dexterity), 10) : null;
    if (constitution !== undefined) data.constitution = constitution != null ? Number.parseInt(String(constitution), 10) : null;
    if (intelligence !== undefined) data.intelligence = intelligence != null ? Number.parseInt(String(intelligence), 10) : null;
    if (wisdom !== undefined) data.wisdom = wisdom != null ? Number.parseInt(String(wisdom), 10) : null;
    if (charisma !== undefined) data.charisma = charisma != null ? Number.parseInt(String(charisma), 10) : null;
    if (challengeRating !== undefined) data.challengeRating = challengeRating != null ? String(challengeRating) : null;
    if (xp !== undefined) data.xp = xp != null ? Number.parseInt(String(xp), 10) : null;
    if (description !== undefined) data.description = description != null ? String(description) : null;
    if (raw !== undefined) data.raw = raw ?? null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (source !== undefined) {
      const s = source != null ? String(source).trim() : '';
      data.source = s || null;
    }

    if (data.name !== undefined && !data.name) {
      return res.status(400).json({ error: 'name requis' });
    }

    const updated = await prisma.monster.update({
      where: { id },
      data,
    });

    res.json({ item: updated });
  } catch (error) {
    console.error('Erreur update monster:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
