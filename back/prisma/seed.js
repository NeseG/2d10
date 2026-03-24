const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

  // 2) Admin par défaut (comme dans init.sql)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
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

  console.log('✅ Prisma seed terminé (roles + admin + user)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed Prisma:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
