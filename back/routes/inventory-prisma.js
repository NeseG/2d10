const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function checkCharacterOwnership(req, res, next) {
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
    console.error('Erreur lors de la vérification de propriété:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

function mapInventoryRow(inv, eqByItem) {
  const eq = eqByItem.get(inv.itemId);
  return {
    id: inv.id,
    quantity: inv.quantity,
    is_equipped: Boolean(eq?.isEquipped),
    notes: inv.notes,
    equipment_slot_id: eq?.slotId || null,
    slot_name: eq?.slot?.name || null,
    name: inv.item?.name,
    description: inv.item?.description,
    weight: inv.item?.weight,
    value_gold: inv.item?.value,
    rarity: inv.item?.rarity,
    is_magical: inv.item?.rarity ? inv.item.rarity !== 'common' : false,
    damage_dice: null,
    damage_type: null,
    weapon_range: null,
    weapon_type: null,
    armor_class_bonus: null,
    armor_type: null,
    stealth_disadvantage: false,
    requires_attunement: false,
    properties: inv.item?.properties,
    item_type: inv.item?.type?.name,
    created_at: inv.createdAt,
  };
}

router.get('/:characterId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);

    const [inventory, equipment] = await Promise.all([
      prisma.inventory.findMany({
        where: { characterId },
        include: { item: { include: { type: true } } },
        orderBy: { item: { name: 'asc' } },
      }),
      prisma.equipment.findMany({
        where: { characterId, isEquipped: true },
        include: { slot: true },
      }),
    ]);

    const eqByItem = new Map(equipment.map((e) => [e.itemId, e]));
    const rows = inventory.map((inv) => mapInventoryRow(inv, eqByItem));
    rows.sort((a, b) => Number(b.is_equipped) - Number(a.is_equipped) || a.name.localeCompare(b.name));

    const totalWeight = rows.reduce((sum, item) => sum + (Number(item.weight) || 0) * item.quantity, 0);

    res.json({
      inventory: rows,
      total_weight: totalWeight,
      total_items: rows.length,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:characterId/items', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const itemId = parseInt(req.body.item_id, 10);
    const quantity = req.body.quantity ?? 1;
    const { notes } = req.body;

    if (Number.isNaN(itemId)) return res.status(400).json({ error: 'ID de l\'objet requis' });

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Objet non trouvé' });

    const existing = await prisma.inventory.findFirst({
      where: { characterId, itemId },
      select: { id: true, quantity: true, notes: true },
    });

    if (existing) {
      const inventoryItem = await prisma.inventory.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity, ...(notes !== undefined ? { notes } : {}) },
      });
      return res.json({ message: 'Quantité mise à jour', inventory_item: inventoryItem });
    }

    const inventoryItem = await prisma.inventory.create({
      data: { characterId, itemId, quantity, notes },
    });
    res.status(201).json({ message: 'Objet ajouté à l\'inventaire', inventory_item: inventoryItem });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:characterId/items/:inventoryId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const inventoryId = parseInt(req.params.inventoryId, 10);
    const { quantity, is_equipped, equipment_slot_id, notes } = req.body;

    const existing = await prisma.inventory.findFirst({
      where: { id: inventoryId, characterId },
    });
    if (!existing) return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });

    const inventoryItem = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        ...(quantity !== undefined ? { quantity } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    if (is_equipped !== undefined) {
      if (is_equipped) {
        const slotId = parseInt(equipment_slot_id, 10);
        if (Number.isNaN(slotId)) {
          return res.status(400).json({ error: 'equipment_slot_id requis pour équiper' });
        }
        await prisma.equipment.upsert({
          where: { characterId_slotId: { characterId, slotId } },
          update: { itemId: existing.itemId, isEquipped: true },
          create: { characterId, itemId: existing.itemId, slotId, isEquipped: true },
        });
      } else {
        await prisma.equipment.updateMany({
          where: { characterId, itemId: existing.itemId, isEquipped: true },
          data: { isEquipped: false },
        });
      }
    }

    res.json({ message: 'Objet mis à jour', inventory_item: inventoryItem });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:characterId/items/:inventoryId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const inventoryId = parseInt(req.params.inventoryId, 10);

    const existing = await prisma.inventory.findFirst({
      where: { id: inventoryId, characterId },
      select: { id: true, itemId: true },
    });
    if (!existing) return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });

    await prisma.$transaction([
      prisma.equipment.updateMany({
        where: { characterId, itemId: existing.itemId, isEquipped: true },
        data: { isEquipped: false },
      }),
      prisma.inventory.delete({ where: { id: existing.id } }),
    ]);

    res.json({ message: 'Objet supprimé de l\'inventaire' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/items/catalog', authenticateToken, async (req, res) => {
  try {
    const { type, rarity, search } = req.query;

    const items = await prisma.item.findMany({
      where: {
        ...(rarity ? { rarity } : {}),
        ...(type ? { type: { name: { contains: type, mode: 'insensitive' } } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { type: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      items: items.map((i) => ({
        ...i,
        item_type: i.type?.name,
      })),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du catalogue:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
