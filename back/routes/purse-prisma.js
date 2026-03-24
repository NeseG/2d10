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

async function getOrCreateLegacyPurse(characterId) {
  const existing = await prisma.$queryRawUnsafe(
    'SELECT * FROM character_purse WHERE character_id = $1',
    characterId,
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const created = await prisma.$queryRawUnsafe(
    `
    INSERT INTO character_purse (character_id, copper_pieces, silver_pieces, electrum_pieces, gold_pieces, platinum_pieces)
    VALUES ($1, 0, 0, 0, 0, 0)
    RETURNING *
    `,
    characterId,
  );

  return created[0];
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

// Obtenir la bourse d'un personnage
router.get('/:characterId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const purse = await getOrCreateLegacyPurse(characterId);

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

// Ajouter des pièces à la bourse
router.post('/:characterId/add', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { copper = 0, silver = 0, electrum = 0, gold = 0, platinum = 0, reason = 'Ajout manuel' } = req.body;

    await getOrCreateLegacyPurse(characterId);

    const updatedRows = await prisma.$queryRawUnsafe(
      `
      UPDATE character_purse
      SET
        copper_pieces = copper_pieces + $1,
        silver_pieces = silver_pieces + $2,
        electrum_pieces = electrum_pieces + $3,
        gold_pieces = gold_pieces + $4,
        platinum_pieces = platinum_pieces + $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE character_id = $6
      RETURNING *
      `,
      copper,
      silver,
      electrum,
      gold,
      platinum,
      characterId,
    );

    const purse = updatedRows[0];

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

    const purse = await getOrCreateLegacyPurse(characterId);

    if (
      purse.copper_pieces < copper ||
      purse.silver_pieces < silver ||
      purse.electrum_pieces < electrum ||
      purse.gold_pieces < gold ||
      purse.platinum_pieces < platinum
    ) {
      return res.status(400).json({
        error: 'Fonds insuffisants',
        available: {
          copper: purse.copper_pieces,
          silver: purse.silver_pieces,
          electrum: purse.electrum_pieces,
          gold: purse.gold_pieces,
          platinum: purse.platinum_pieces,
        },
        requested: { copper, silver, electrum, gold, platinum },
      });
    }

    const updatedRows = await prisma.$queryRawUnsafe(
      `
      UPDATE character_purse
      SET
        copper_pieces = copper_pieces - $1,
        silver_pieces = silver_pieces - $2,
        electrum_pieces = electrum_pieces - $3,
        gold_pieces = gold_pieces - $4,
        platinum_pieces = platinum_pieces - $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE character_id = $6
      RETURNING *
      `,
      copper,
      silver,
      electrum,
      gold,
      platinum,
      characterId,
    );

    const updatedPurse = updatedRows[0];

    res.json({
      success: true,
      message: 'Pièces retirées de la bourse',
      purse: updatedPurse,
      total_gold_value: computeTotalGoldValue(updatedPurse),
      removed: { copper, silver, electrum, gold, platinum },
      reason,
    });
  } catch (error) {
    console.error('Erreur lors du retrait de pièces:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
