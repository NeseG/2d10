const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware pour vérifier la propriété du personnage
const checkCharacterOwnership = async (req, res, next) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const userId = req.user.id;
    const userRole = req.user.role_name;

    if (Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID personnage invalide' });
    }

    if (userRole === 'admin' || userRole === 'gm') {
      return next();
    }

    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Personnage non trouvé' });
    }

    if (character.userId !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous n\'êtes pas propriétaire de ce personnage.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/** Réponse JSON identique à l’ancien format SQL (snake_case). */
function purseRowToApi(purse) {
  return {
    id: purse.id,
    character_id: purse.characterId,
    copper_pieces: purse.copperPieces,
    silver_pieces: purse.silverPieces,
    electrum_pieces: purse.electrumPieces,
    gold_pieces: purse.goldPieces,
    platinum_pieces: purse.platinumPieces,
    updated_at: purse.updatedAt,
  };
}

async function getOrCreatePurse(characterId) {
  let purse = await prisma.purse.findUnique({ where: { characterId } });
  if (!purse) {
    purse = await prisma.purse.create({
      data: {
        characterId,
        copperPieces: 0,
        silverPieces: 0,
        electrumPieces: 0,
        goldPieces: 0,
        platinumPieces: 0,
      },
    });
  }
  return purse;
}

function computeTotalGoldValue(purse) {
  return (
    purse.copper_pieces / 100 +
    purse.silver_pieces / 10 +
    purse.electrum_pieces / 2 +
    purse.gold_pieces +
    purse.platinum_pieces * 10
  );
}

function parseNonNegativeInt(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? '').trim(), 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}

// Routes les plus spécifiques en premier
// Ajouter des pièces à la bourse
router.post('/:characterId/add', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { copper = 0, silver = 0, electrum = 0, gold = 0, platinum = 0, reason = 'Ajout manuel' } = req.body;

    await getOrCreatePurse(characterId);

    const row = await prisma.purse.update({
      where: { characterId },
      data: {
        copperPieces: { increment: copper },
        silverPieces: { increment: silver },
        electrumPieces: { increment: electrum },
        goldPieces: { increment: gold },
        platinumPieces: { increment: platinum },
      },
    });

    const purse = purseRowToApi(row);

    res.json({
      success: true,
      message: 'Pièces ajoutées à la bourse',
      purse,
      total_gold_value: computeTotalGoldValue(purse),
      added: { copper, silver, electrum, gold, platinum },
      reason,
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de pièces:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer des pièces de la bourse
router.post('/:characterId/remove', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { copper = 0, silver = 0, electrum = 0, gold = 0, platinum = 0, reason = 'Retrait manuel' } = req.body;

    const current = await getOrCreatePurse(characterId);

    if (
      current.copperPieces < copper ||
      current.silverPieces < silver ||
      current.electrumPieces < electrum ||
      current.goldPieces < gold ||
      current.platinumPieces < platinum
    ) {
      return res.status(400).json({
        error: 'Fonds insuffisants',
        available: {
          copper: current.copperPieces,
          silver: current.silverPieces,
          electrum: current.electrumPieces,
          gold: current.goldPieces,
          platinum: current.platinumPieces,
        },
        requested: { copper, silver, electrum, gold, platinum },
      });
    }

    const row = await prisma.purse.update({
      where: { characterId },
      data: {
        copperPieces: { increment: -copper },
        silverPieces: { increment: -silver },
        electrumPieces: { increment: -electrum },
        goldPieces: { increment: -gold },
        platinumPieces: { increment: -platinum },
      },
    });

    const purse = purseRowToApi(row);

    res.json({
      success: true,
      message: 'Pièces retirées de la bourse',
      purse,
      total_gold_value: computeTotalGoldValue(purse),
      removed: { copper, silver, electrum, gold, platinum },
      reason,
    });
  } catch (error) {
    console.error('Erreur lors du retrait de pièces:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir la bourse d'un personnage
router.get('/:characterId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const row = await getOrCreatePurse(characterId);
    const purse = purseRowToApi(row);

    res.json({
      success: true,
      purse,
      total_gold_value: computeTotalGoldValue(purse),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la bourse:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Remplacer les montants (saisie inventaire / bourse)
router.put('/:characterId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const {
      copper = 0,
      silver = 0,
      electrum = 0,
      gold = 0,
      platinum = 0,
    } = req.body || {};

    await getOrCreatePurse(characterId);

    const row = await prisma.purse.update({
      where: { characterId },
      data: {
        copperPieces: parseNonNegativeInt(copper),
        silverPieces: parseNonNegativeInt(silver),
        electrumPieces: parseNonNegativeInt(electrum),
        goldPieces: parseNonNegativeInt(gold),
        platinumPieces: parseNonNegativeInt(platinum),
      },
    });

    const purse = purseRowToApi(row);

    res.json({
      success: true,
      purse,
      total_gold_value: computeTotalGoldValue(purse),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la bourse:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
