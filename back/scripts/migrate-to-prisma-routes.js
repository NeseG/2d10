#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Migration vers les routes Prisma...\n');

// Fonction pour sauvegarder les anciens fichiers
function backupFile(filePath) {
  const backupPath = filePath + '.backup';
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Sauvegarde créée: ${backupPath}`);
  }
}

// Fonction pour remplacer les imports dans index.js
function migrateIndexFile() {
  const indexPath = path.join(__dirname, '..', 'index.js');
  const indexPrismaPath = path.join(__dirname, '..', 'index-prisma.js');
  
  console.log('📝 Migration du fichier index.js...');
  
  // Sauvegarder l'ancien fichier
  backupFile(indexPath);
  
  // Lire le nouveau fichier
  const newContent = fs.readFileSync(indexPrismaPath, 'utf8');
  
  // Écrire le nouveau contenu
  fs.writeFileSync(indexPath, newContent);
  
  console.log('✅ index.js migré vers Prisma');
}

// Fonction pour créer un script de rollback
function createRollbackScript() {
  const rollbackScript = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Rollback vers les routes PostgreSQL...\\n');

// Restaurer index.js
const indexPath = path.join(__dirname, '..', 'index.js');
const indexBackupPath = indexPath + '.backup';

if (fs.existsSync(indexBackupPath)) {
  fs.copyFileSync(indexBackupPath, indexPath);
  console.log('✅ index.js restauré depuis la sauvegarde');
} else {
  console.log('❌ Aucune sauvegarde trouvée pour index.js');
}

console.log('✅ Rollback terminé');
`;

  const rollbackPath = path.join(__dirname, 'rollback-to-postgres.js');
  fs.writeFileSync(rollbackPath, rollbackScript);
  fs.chmodSync(rollbackPath, '755');
  
  console.log('✅ Script de rollback créé: scripts/rollback-to-postgres.js');
}

// Fonction pour créer un script de test
function createTestScript() {
  const testScript = `#!/usr/bin/env node

const { runTests } = require('../test-prisma-routes');

console.log('🧪 Lancement des tests des routes Prisma...\\n');
runTests();
`;

  const testPath = path.join(__dirname, 'test-prisma-routes.js');
  fs.writeFileSync(testPath, testScript);
  fs.chmodSync(testPath, '755');
  
  console.log('✅ Script de test créé: scripts/test-prisma-routes.js');
}

// Fonction pour afficher les instructions
function displayInstructions() {
  console.log('\n📋 Instructions de migration:');
  console.log('1. Les anciens fichiers ont été sauvegardés avec l\'extension .backup');
  console.log('2. Le fichier index.js a été migré vers Prisma');
  console.log('3. Les nouvelles routes Prisma sont disponibles:');
  console.log('   - routes/admin-prisma.js');
  console.log('   - routes/auth-prisma.js');
  console.log('4. Pour tester la migration: npm run test:prisma-routes');
  console.log('5. Pour revenir en arrière: node scripts/rollback-to-postgres.js');
  console.log('\n⚠️  Important: Assurez-vous que Prisma est configuré et que la base de données est à jour');
  console.log('   Commandes Prisma:');
  console.log('   - npx prisma generate');
  console.log('   - npx prisma db push');
  console.log('   - npx prisma migrate dev');
}

// Fonction principale
async function main() {
  try {
    console.log('🚀 Début de la migration...\n');
    
    // Vérifier que les fichiers Prisma existent
    const adminPrismaPath = path.join(__dirname, '..', 'routes', 'admin-prisma.js');
    const authPrismaPath = path.join(__dirname, '..', 'routes', 'auth-prisma.js');
    
    if (!fs.existsSync(adminPrismaPath) || !fs.existsSync(authPrismaPath)) {
      console.error('❌ Les fichiers de routes Prisma n\'existent pas');
      console.error('   Assurez-vous que admin-prisma.js et auth-prisma.js sont créés');
      process.exit(1);
    }
    
    // Effectuer la migration
    migrateIndexFile();
    createRollbackScript();
    createTestScript();
    displayInstructions();
    
    console.log('\n✅ Migration terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Exécuter la migration
if (require.main === module) {
  main();
}

module.exports = { main, backupFile, migrateIndexFile };
