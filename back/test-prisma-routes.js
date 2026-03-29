const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');

// Import des routes Prisma
const adminRoutes = require('./routes/admin-prisma');
const authRoutes = require('./routes/auth-prisma');
const characterRoutes = require('./routes/characters-prisma');
const campaignRoutes = require('./routes/campaigns-prisma');
const dndLocalRoutes = require('./routes/dnd-local-prisma');
const itemRoutes = require('./routes/items-prisma');
const purseRoutes = require('./routes/purse-prisma');
const inventoryRoutes = require('./routes/inventory-prisma');
const equipmentRoutes = require('./routes/equipment-prisma');
const grimoireRoutes = require('./routes/grimoire-prisma');
const sessionsRoutes = require('./routes/sessions-prisma');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/characters', characterRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/dnd-local', dndLocalRoutes);
app.use('/items', itemRoutes);
app.use('/purse', purseRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/equipment', equipmentRoutes);
app.use('/grimoire', grimoireRoutes);
app.use('/sessions', sessionsRoutes);

// Fonction pour créer des données de test
async function setupTestData() {
  try {
    // Créer des rôles de test
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' }
    });

    const gmRole = await prisma.role.upsert({
      where: { name: 'gm' },
      update: {},
      create: { name: 'gm' }
    });

    const userRole = await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user' }
    });

    // Créer un admin de test
    const adminHash = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        username: 'adminuser',
        passwordHash: adminHash,
        roleId: adminRole.id,
        isActive: true
      },
      create: {
        username: 'adminuser',
        email: 'admin@example.com',
        passwordHash: adminHash,
        roleId: adminRole.id,
        isActive: true
      }
    });

    console.log('✅ Données de base de test créées');
    return { adminRole, gmRole, userRole };
  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error);
    throw error;
  }
}

// Fonction pour nettoyer les données de test
async function cleanupTestData() {
  try {
    // Supprimer les données liées puis les utilisateurs de test
    const users = await prisma.user.findMany({
      where: { email: { in: ['test@example.com', 'admin@example.com'] } },
      select: { id: true }
    });
    const userIds = users.map((u) => u.id);

    const characters = await prisma.character.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });
    const characterIds = characters.map((c) => c.id);

    await prisma.sessionAttendance.deleteMany({
      where: { characterId: { in: characterIds } }
    });
    await prisma.grimoire.deleteMany({
      where: { characterId: { in: characterIds } }
    });
    await prisma.equipment.deleteMany({
      where: { characterId: { in: characterIds } }
    });
    await prisma.inventory.deleteMany({
      where: { characterId: { in: characterIds } }
    });
    await prisma.purse.deleteMany({
      where: { characterId: { in: characterIds } }
    });
    await prisma.campaignCharacter.deleteMany({
      where: { characterId: { in: characterIds } }
    });
    await prisma.character.deleteMany({
      where: { id: { in: characterIds } }
    });

    await prisma.gameSession.deleteMany({
      where: { campaign: { gmId: { in: userIds } } }
    });
    await prisma.campaign.deleteMany({
      where: { gmId: { in: userIds } }
    });

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

// Tests des routes auth (retourne token user + token admin)
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

    // Test de connexion user
    console.log('  🔑 Test de connexion user...');
    const userLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    let userToken = null;
    if (userLoginResponse.status === 200) {
      console.log('  ✅ Connexion user réussie');
      userToken = userLoginResponse.body.token;
    } else {
      console.log('  ❌ Échec connexion user:', userLoginResponse.body);
    }

    // Test de connexion admin
    console.log('  🔑 Test de connexion admin...');
    const adminLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });

    let adminToken = null;
    if (adminLoginResponse.status === 200) {
      console.log('  ✅ Connexion admin réussie');
      adminToken = adminLoginResponse.body.token;
    } else {
      console.log('  ❌ Échec connexion admin:', adminLoginResponse.body);
    }

    return { userToken, adminToken };
  } catch (error) {
    console.error('  ❌ Erreur lors des tests auth:', error);
    return { userToken: null, adminToken: null };
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

function assertNotServerError(label, response) {
  if (response.status >= 500) {
    console.log(`  ❌ ${label}: statut ${response.status}`, response.body);
    return false;
  }
  console.log(`  ✅ ${label}: statut ${response.status}`);
  return true;
}

// Smoke tests des routes migrées récemment
async function testMigratedRoutes(userToken, adminToken) {
  console.log('\n🧪 Smoke tests des routes Prisma migrées...');

  if (!userToken || !adminToken) {
    console.log('  ❌ Tokens manquants, smoke tests ignorés');
    return;
  }

  // Créer un personnage de test pour les routes characterId
  const testUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
    select: { id: true }
  });

  const testCharacter = await prisma.character.create({
    data: {
      userId: testUser.id,
      name: 'Smoke Character',
      race: 'Human',
      class: 'Wizard',
      level: 1,
      hitPoints: 10,
      armorClass: 10,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    }
  });

  const characterId = testCharacter.id;

  // DND local
  assertNotServerError(
    'GET /dnd-local/spells',
    await request(app).get('/dnd-local/spells').set('Authorization', `Bearer ${userToken}`)
  );

  // Items / purse / inventory / equipment / grimoire
  assertNotServerError(
    'GET /items',
    await request(app).get('/items').set('Authorization', `Bearer ${userToken}`)
  );
  assertNotServerError(
    'GET /purse/:characterId',
    await request(app).get(`/purse/${characterId}`).set('Authorization', `Bearer ${userToken}`)
  );
  assertNotServerError(
    'GET /inventory/:characterId',
    await request(app).get(`/inventory/${characterId}`).set('Authorization', `Bearer ${userToken}`)
  );
  assertNotServerError(
    'GET /equipment/:characterId',
    await request(app).get(`/equipment/${characterId}`).set('Authorization', `Bearer ${userToken}`)
  );
  assertNotServerError(
    'GET /grimoire/:characterId',
    await request(app).get(`/grimoire/${characterId}`).set('Authorization', `Bearer ${userToken}`)
  );

  // Campaigns / sessions
  assertNotServerError(
    'GET /campaigns (admin)',
    await request(app).get('/campaigns').set('Authorization', `Bearer ${adminToken}`)
  );
  assertNotServerError(
    'GET /sessions/stats/overview (admin)',
    await request(app).get('/sessions/stats/overview').set('Authorization', `Bearer ${adminToken}`)
  );
}

// Fonction principale de test
async function runTests() {
  console.log('🚀 Démarrage des tests des routes Prisma...\n');
  
  try {
    // Configuration des données de test
    await setupTestData();
    
    // Tests des routes auth
    const { userToken, adminToken } = await testAuthRoutes();
    
    // Tests des routes admin
    await testAdminRoutes(adminToken);

    // Smoke tests routes récemment migrées
    await testMigratedRoutes(userToken, adminToken);
    
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
