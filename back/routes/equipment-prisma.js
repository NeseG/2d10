const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function checkCharacterOwnership(req, res, next) {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const { id: userId, role_name: roleName } = req.user;

    if (Number.isNaN(characterId)) {
      return res.status(400).json({ error: 'ID personnage invalide' });
    }

    if (roleName === 'admin' || roleName === 'gm') return next();

    const character = await prisma.character.findFirst({
      where: { id: characterId, isActive: true },
      select: { userId: true },
    });

    if (!character) return res.status(404).json({ error: 'Personnage non trouvé' });
    if (character.userId !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Ce personnage ne vous appartient pas.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

function checkSlotCompatibility(itemType, slotName) {
  const compatibility = {
    Arme: ['Main droite', 'Main gauche', 'Autre'],
    Armure: ['Armure', 'Autre'],
    Bouclier: ['Main gauche', 'Autre'],
    'Objet magique': ['Anneau 1', 'Anneau 2', 'Amulette', 'Cape', 'Autre'],
    Vêtement: ['Cape', 'Casque', 'Bottes', 'Gants', 'Autre'],
    Outils: ['Sac', 'Autre'],
    Potion: ['Sac', 'Autre'],
    Parchemin: ['Sac', 'Autre'],
    Gemme: ['Sac', 'Autre'],
    Nourriture: ['Sac', 'Autre'],
    Autre: ['Sac', 'Autre'],
  };

  const allowedSlots = compatibility[itemType] || ['Autre'];
  return allowedSlots.includes(slotName);
}

router.get('/slots/available', authenticateToken, async (req, res) => {
  try {
    const equipmentSlots = await prisma.equipmentSlot.findMany({ orderBy: { id: 'asc' } });
    res.json({ equipment_slots: equipmentSlots });
  } catch (error) {
    console.error('Erreur lors de la récupération des slots:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:characterId', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);

    const equipment = await prisma.equipment.findMany({
      where: { characterId, isEquipped: true },
      include: {
        slot: true,
        item: true,
      },
      orderBy: [{ slotId: 'asc' }, { item: { name: 'asc' } }],
    });

    const formatted = equipment.map((e) => ({
      id: e.id,
      quantity: 1,
      is_equipped: e.isEquipped,
      notes: null,
      equipment_slot_id: e.slotId,
      slot_name: e.slot?.name,
      slot_description: e.slot?.description,
      name: e.item?.name,
      description: e.item?.description,
      weight: e.item?.weight,
      value_gold: e.item?.value,
      rarity: e.item?.rarity,
      is_magical: e.item?.rarity ? e.item.rarity !== 'common' : false,
      damage_dice: null,
      damage_type: null,
      weapon_range: null,
      weapon_type: null,
      armor_class_bonus: null,
      armor_type: null,
      stealth_disadvantage: false,
      requires_attunement: false,
      properties: e.item?.properties,
      item_type: e.item?.type?.name,
    }));

    const totalWeight = formatted.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const armorClassBonus = formatted.reduce((sum, item) => sum + (item.armor_class_bonus || 0), 0);
    const stealthDisadvantage = formatted.some((item) => item.stealth_disadvantage);

    res.json({
      equipment: formatted,
      stats: {
        total_weight: totalWeight,
        armor_class_bonus: armorClassBonus,
        stealth_disadvantage: stealthDisadvantage,
        total_items: formatted.length,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'équipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:characterId/equip', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const inventoryId = parseInt(req.body.inventory_id, 10);
    const equipmentSlotId = parseInt(req.body.equipment_slot_id, 10);

    if (Number.isNaN(inventoryId) || Number.isNaN(equipmentSlotId)) {
      return res.status(400).json({ error: 'ID de l\'inventaire et slot d\'équipement requis' });
    }

    const [inventoryItem, slot] = await Promise.all([
      prisma.inventory.findFirst({
        where: { id: inventoryId, characterId },
        include: { item: true },
      }),
      prisma.equipmentSlot.findUnique({ where: { id: equipmentSlotId } }),
    ]);

    if (!inventoryItem) return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });
    if (!slot) return res.status(404).json({ error: 'Slot d\'équipement non trouvé' });

    // Après alignement Item<->Dnd5eEquipment, on utilise category (fallback type)
    const itemType = inventoryItem.item?.category || inventoryItem.item?.type || 'Autre';
    if (!checkSlotCompatibility(itemType, slot.name)) {
      return res.status(400).json({
        error: `Ce type d'objet (${itemType}) ne peut pas être équipé dans ce slot (${slot.name})`,
      });
    }

    const equipment = await prisma.equipment.upsert({
      where: { characterId_itemId: { characterId, itemId: inventoryItem.itemId } },
      update: { slotId: equipmentSlotId, isEquipped: true },
      create: { characterId, itemId: inventoryItem.itemId, slotId: equipmentSlotId, isEquipped: true },
    });

    res.json({
      message: `${inventoryItem.item.name} équipé dans ${slot.name}`,
      equipment,
    });
  } catch (error) {
    console.error('Erreur lors de l\'équipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:characterId/unequip', authenticateToken, checkCharacterOwnership, async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    const inventoryId = parseInt(req.body.inventory_id, 10);

    if (Number.isNaN(inventoryId)) {
      return res.status(400).json({ error: 'ID de l\'inventaire requis' });
    }

    const inventoryItem = await prisma.inventory.findFirst({
      where: { id: inventoryId, characterId },
      select: { itemId: true },
    });

    if (!inventoryItem) {
      return res.status(404).json({ error: 'Objet non trouvé dans l\'inventaire' });
    }

    await prisma.equipment.updateMany({
      where: { characterId, itemId: inventoryItem.itemId, isEquipped: true },
      data: { isEquipped: false },
    });

    res.json({
      message: 'Objet déséquipé',
      equipment: { inventory_id: inventoryId, is_equipped: false },
    });
  } catch (error) {
    console.error('Erreur lors du déséquipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
