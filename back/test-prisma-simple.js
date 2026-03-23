const prisma = require('./lib/prisma');

// Fonction pour créer des données de test
async function setupTestData() {
  try {
    console.log('🔧 Configuration des données de test...');
    
    // Créer des rôles de test
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' }
    });

    const userRole = await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user' }
    });

    console.log('✅ Rôles de test créés');
    return { adminRole, userRole };
  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error);
    throw error;
  }
}

// Test de création d'utilisateur
async function testUserCreation() {
  console.log('\n👤 Test de création d\'utilisateur...');
  
  try {
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        roleId: 2, // user role
        isActive: true
      },
      include: {
        role: true
      }
    });

    console.log('✅ Utilisateur créé avec succès:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive
    });

    return user;
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
    throw error;
  }
}

// Test de récupération des utilisateurs
async function testUserRetrieval() {
  console.log('\n📋 Test de récupération des utilisateurs...');
  
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ ${users.length} utilisateur(s) trouvé(s)`);
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role.name}`);
    });

    return users;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
    throw error;
  }
}

// Test de mise à jour d'utilisateur
async function testUserUpdate(userId) {
  console.log('\n✏️ Test de mise à jour d\'utilisateur...');
  
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: 'testuser_updated',
        isActive: false
      },
      include: {
        role: true
      }
    });

    console.log('✅ Utilisateur mis à jour avec succès:', {
      id: updatedUser.id,
      username: updatedUser.username,
      isActive: updatedUser.isActive
    });

    return updatedUser;
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de l\'utilisateur:', error);
    throw error;
  }
}

// Test des statistiques
async function testStats() {
  console.log('\n📊 Test des statistiques...');
  
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    });
    const adminUsers = await prisma.user.count({
      where: {
        isActive: true,
        role: {
          name: 'admin'
        }
      }
    });

    console.log('✅ Statistiques récupérées:', {
      total_users: totalUsers,
      active_users: activeUsers,
      admin_users: adminUsers
    });

    return { totalUsers, activeUsers, adminUsers };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
}

// Fonction pour nettoyer les données de test
async function cleanupTestData() {
  console.log('\n🧹 Nettoyage des données de test...');
  
  try {
    // Supprimer les utilisateurs de test
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'admin@example.com']
        }
      }
    });

    console.log(`✅ ${deletedUsers.count} utilisateur(s) de test supprimé(s)`);
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Fonction principale de test
async function runTests() {
  console.log('🚀 Démarrage des tests Prisma...\n');
  
  let createdUser = null;
  
  try {
    // Configuration des données de test
    await setupTestData();
    
    // Test de création d'utilisateur
    createdUser = await testUserCreation();
    
    // Test de récupération des utilisateurs
    await testUserRetrieval();
    
    // Test de mise à jour d'utilisateur
    if (createdUser) {
      await testUserUpdate(createdUser.id);
    }
    
    // Test des statistiques
    await testStats();
    
    console.log('\n✅ Tous les tests sont passés avec succès !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
  } finally {
    // Nettoyage
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Exécuter les tests si le fichier est appelé directement
if (require.main === module) {
  runTests();
}

module.exports = { runTests, setupTestData, cleanupTestData };
