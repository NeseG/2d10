#!/usr/bin/env node

const { Pool } = require('pg');
const prisma = require('../lib/prisma');

// Configuration de la base de données existante
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateToPrisma() {
  console.log('🚀 Début de la migration vers Prisma...');

  try {
    // 1. Générer le client Prisma
    console.log('📦 Génération du client Prisma...');
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // 2. Pousser le schéma vers la base de données
    console.log('🗄️ Synchronisation du schéma avec la base de données...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    // 3. Vérifier la connexion
    console.log('🔌 Test de la connexion Prisma...');
    await prisma.$connect();
    console.log('✅ Connexion Prisma réussie !');

    // 4. Vérifier les tables existantes
    console.log('📊 Vérification des tables existantes...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    console.log('Tables trouvées:', tables);

    // 5. Test d'une requête simple
    console.log('🧪 Test d\'une requête Prisma...');
    const userCount = await prisma.user.count();
    console.log(`Nombre d'utilisateurs: ${userCount}`);

    console.log('🎉 Migration vers Prisma terminée avec succès !');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Tester les routes avec Prisma');
    console.log('2. Remplacer les requêtes SQL brutes par Prisma');
    console.log('3. Utiliser Prisma Studio: npm run prisma:studio');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Exécuter la migration
migrateToPrisma();

