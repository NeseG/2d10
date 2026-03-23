const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');

// Import des nouvelles routes
const adminRoutes = require('./routes/admin-prisma');
const authRoutes = require('./routes/auth-prisma');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);

// Fonction pour créer des données de test
async function setupTestData() {
  try {
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

// Fonction pour nettoyer les données de test
async function cleanupTestData() {
  try {
    // Supprimer les utilisateurs de test
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'admin@example.com']
        }
      }
    });

    console.log('✅ Données de test nettoyées');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Tests des routes auth
async function testAuthRoutes() {
  console.log('\n🔐 Test des routes d\'authentification...');
  
  try {
    // Test d'inscription
    console.log('  📝 Test d\'inscription...');
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      });

    if (registerResponse.status === 201) {
      console.log('  ✅ Inscription réussie');
    } else {
      console.log('  ❌ Échec de l\'inscription:', registerResponse.body);
    }

    // Test de connexion
    console.log('  🔑 Test de connexion...');
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    if (loginResponse.status === 200) {
      console.log('  ✅ Connexion réussie');
      return loginResponse.body.token;
    } else {
      console.log('  ❌ Échec de la connexion:', loginResponse.body);
      return null;
    }

  } catch (error) {
    console.error('  ❌ Erreur lors des tests auth:', error);
    return null;
  }
}

// Tests des routes admin
async function testAdminRoutes(token) {
  console.log('\n👑 Test des routes admin...');
  
  if (!token) {
    console.log('  ❌ Pas de token disponible pour les tests admin');
    return;
  }

  try {
    // Test de récupération des utilisateurs
    console.log('  📋 Test de récupération des utilisateurs...');
    const usersResponse = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`);

    if (usersResponse.status === 200) {
      console.log('  ✅ Récupération des utilisateurs réussie');
    } else {
      console.log('  ❌ Échec de la récupération des utilisateurs:', usersResponse.body);
    }

    // Test de création d'utilisateur admin
    console.log('  👤 Test de création d\'utilisateur admin...');
    const createUserResponse = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'adminuser',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
      });

    if (createUserResponse.status === 201) {
      console.log('  ✅ Création d\'utilisateur admin réussie');
    } else {
      console.log('  ❌ Échec de la création d\'utilisateur admin:', createUserResponse.body);
    }

    // Test des statistiques
    console.log('  📊 Test des statistiques...');
    const statsResponse = await request(app)
      .get('/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    if (statsResponse.status === 200) {
      console.log('  ✅ Récupération des statistiques réussie:', statsResponse.body.stats);
    } else {
      console.log('  ❌ Échec de la récupération des statistiques:', statsResponse.body);
    }

  } catch (error) {
    console.error('  ❌ Erreur lors des tests admin:', error);
  }
}

// Fonction principale de test
async function runTests() {
  console.log('🚀 Démarrage des tests des routes Prisma...\n');
  
  try {
    // Configuration des données de test
    await setupTestData();
    
    // Tests des routes auth
    const token = await testAuthRoutes();
    
    // Tests des routes admin
    await testAdminRoutes(token);
    
    console.log('\n✅ Tests terminés !');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
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
