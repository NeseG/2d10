const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Aligné sur l'enum Prisma `ItemTypeName`. */
const ITEM_TYPES_FROM_ENUM = [
  { name: 'Arme', description: 'Armes de mêlée et à distance' },
  { name: 'Armure', description: 'Protection corporelle' },
  { name: 'Bouclier', description: 'Protection supplémentaire' },
  { name: 'Objet magique', description: 'Objets dotés de propriétés magiques' },
  { name: 'Potion', description: 'Consommables magiques' },
  { name: 'Parchemin', description: 'Sorts sur parchemin' },
  { name: 'Gemme', description: 'Pierres précieuses et gemmes' },
  { name: 'Outils', description: "Outils d'artisanat et de profession" },
  { name: 'Vêtement', description: 'Vêtements et accessoires' },
  { name: 'Nourriture', description: 'Nourriture et boissons' },
  { name: 'Autre', description: 'Autres objets divers' },
];

async function main() {
  // 1) Rôles de base
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user' },
  });

  await prisma.role.upsert({
    where: { name: 'gm' },
    update: {},
    create: { name: 'gm' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  // 2) Admin par défaut
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@2d10.com' },
    update: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
      isActive: true,
    },
    create: {
      username: 'admin',
      email: 'admin@2d10.com',
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  // 3) Optionnel: utilisateur test basique
  const testPasswordHash = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { email: 'user@2d10.com' },
    update: {
      username: 'user',
      passwordHash: testPasswordHash,
      roleId: userRole.id,
      isActive: true,
    },
    create: {
      username: 'user',
      email: 'user@2d10.com',
      passwordHash: testPasswordHash,
      roleId: userRole.id,
      isActive: true,
    },
  });

  // 4) Types d'objets (enum ItemTypeName)
  for (const t of ITEM_TYPES_FROM_ENUM) {
    await prisma.itemType.upsert({
      where: { name: t.name },
      update: { description: t.description },
      create: { name: t.name, description: t.description },
    });
  }

  // 5) Slots d'équipement (requis pour équipement / inventaire)
  const EQUIPMENT_SLOTS = [
    { name: 'Main droite', description: 'Arme principale tenue en main droite' },
    { name: 'Main gauche', description: 'Arme secondaire ou bouclier en main gauche' },
    { name: 'Armure', description: 'Armure corporelle' },
    { name: 'Casque', description: 'Protection de la tête' },
    { name: 'Bottes', description: 'Chaussures et bottes' },
    { name: 'Gants', description: 'Gants et mitaines' },
    { name: 'Anneau 1', description: 'Premier anneau magique' },
    { name: 'Anneau 2', description: 'Deuxième anneau magique' },
    { name: 'Amulette', description: 'Collier et amulette' },
    { name: 'Cape', description: 'Cape et manteau' },
    { name: 'Sac', description: 'Sac à dos et contenants' },
    { name: 'Autre', description: 'Équipement actif divers (plusieurs objets possibles)' },
  ];
  for (const s of EQUIPMENT_SLOTS) {
    await prisma.equipmentSlot.upsert({
      where: { name: s.name },
      update: { description: s.description },
      create: { name: s.name, description: s.description },
    });
  }

  console.log('✅ Prisma seed terminé (roles + admin + user + item_types + equipment_slots)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed Prisma:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
