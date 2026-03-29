const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function slugify(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeUniqueIndexFromName(name) {
  const base = slugify(name || 'spell') || 'spell';
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${base}__manual__${suffix}`;
}

// GET /api/spells?q=&level=&school=&limit=&page=
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const q = String(req.query.q || '').trim();
    const level = req.query.level != null ? Number.parseInt(req.query.level, 10) : null;
    const school = req.query.school ? String(req.query.school) : null;

    const and = [{ isActive: true }];
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { index: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (!Number.isNaN(level) && level != null) and.push({ level });
    if (school) and.push({ school });
    const where = { AND: and };

    const [items, total] = await Promise.all([
      prisma.spell.findMany({
        where,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        take: limit,
        skip,
      }),
      prisma.spell.count({ where }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erreur liste spells:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/spells/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const item = await prisma.spell.findFirst({ where: { id, isActive: true } });
    if (!item) return res.status(404).json({ error: 'Sort non trouvé' });
    res.json({ item });
  } catch (error) {
    console.error('Erreur détail spell:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/spells (admin/gm) -> créer un nouveau sort custom
router.post('/', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const {
      index,
      name,
      level,
      school,
      castingTime,
      range,
      components,
      duration,
      description,
      higherLevel,
      ritual,
      concentration,
      raw,
    } = req.body ?? {};

    const safeName = String(name || '').trim();
    if (!safeName) return res.status(400).json({ error: 'name requis' });

    const indexSeed = index ? slugify(index) : makeUniqueIndexFromName(safeName);

    let created = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const nextIndex = attempt === 0 ? indexSeed : makeUniqueIndexFromName(safeName);
      try {
        created = await prisma.spell.create({
          data: {
            index: nextIndex,
            name: safeName,
            level: level != null ? Number.parseInt(String(level), 10) : null,
            school: school != null ? String(school) : null,
            castingTime: castingTime != null ? String(castingTime) : null,
            range: range != null ? String(range) : null,
            components: components != null ? String(components) : null,
            duration: duration != null ? String(duration) : null,
            description: description != null ? String(description) : null,
            higherLevel: higherLevel != null ? String(higherLevel) : null,
            ritual: ritual != null ? Boolean(ritual) : null,
            concentration: concentration != null ? Boolean(concentration) : null,
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
    console.error('Erreur création spell:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/spells/:id
// - admin/gm: peut éditer n'importe quel sort
// - user: peut éditer un sort seulement s'il est dans le grimoire d'un de ses personnages
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const role = req.user?.role_name;
    const userId = req.user?.id;

    if (role !== 'admin' && role !== 'gm') {
      const owned = await prisma.grimoire.findFirst({
        where: {
          spellId: id,
          character: { userId },
        },
        select: { id: true },
      });
      if (!owned) return res.status(403).json({ error: 'Accès refusé' });
    }

    const {
      name,
      level,
      school,
      castingTime,
      range,
      components,
      duration,
      description,
      higherLevel,
      ritual,
      concentration,
      raw,
      isActive,
    } = req.body ?? {};

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (level !== undefined) data.level = level != null ? Number.parseInt(String(level), 10) : null;
    if (school !== undefined) data.school = school != null ? String(school) : null;
    if (castingTime !== undefined) data.castingTime = castingTime != null ? String(castingTime) : null;
    if (range !== undefined) data.range = range != null ? String(range) : null;
    if (components !== undefined) data.components = components != null ? String(components) : null;
    if (duration !== undefined) data.duration = duration != null ? String(duration) : null;
    if (description !== undefined) data.description = description != null ? String(description) : null;
    if (higherLevel !== undefined) data.higherLevel = higherLevel != null ? String(higherLevel) : null;
    if (ritual !== undefined) data.ritual = ritual != null ? Boolean(ritual) : null;
    if (concentration !== undefined) data.concentration = concentration != null ? Boolean(concentration) : null;
    if (raw !== undefined) data.raw = raw ?? null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    if (data.name !== undefined && !data.name) {
      return res.status(400).json({ error: 'name requis' });
    }
    if (data.level !== undefined && data.level != null && (Number.isNaN(data.level) || data.level < 0 || data.level > 9)) {
      return res.status(400).json({ error: 'level doit être entre 0 et 9' });
    }

    const updated = await prisma.spell.update({
      where: { id },
      data,
    });

    res.json({ item: updated });
  } catch (error) {
    console.error('Erreur update spell:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

