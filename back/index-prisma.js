const express = require('express');
const cors = require('cors');
const config = require('./config');
const prisma = require('./lib/prisma');

// Import des routes (nouvelles routes Prisma)
const authRoutes = require('./routes/auth-prisma');
const adminRoutes = require('./routes/admin-prisma');
const characterRoutes = require('./routes/characters-prisma');
const inventoryRoutes = require('./routes/inventory');
const itemRoutes = require('./routes/items');
const equipmentRoutes = require('./routes/equipment');
const dndRoutes = require('./routes/dnd');
const dndLocalRoutes = require('./routes/dnd-local');
const purseRoutes = require('./routes/purse');
const campaignRoutes = require('./routes/campaigns');
const grimoireRoutes = require('./routes/grimoire');
// const sessionRoutes = require('./routes/sessions');

const app = express();
const port = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser la base de données avec Prisma
async function initializeDatabase() {
  try {
    // Tester la connexion Prisma
    await prisma.$connect();
    console.log('✅ Connexion Prisma établie avec succès');
    
    // Vérifier que les tables existent
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    
    console.log(`📊 Base de données initialisée - Utilisateurs: ${userCount}, Rôles: ${roleCount}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/dnd', dndRoutes);
app.use('/api/dnd-local', dndLocalRoutes);
app.use('/api/purse', purseRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/grimoire', grimoireRoutes);
// app.use('/api/sessions', sessionRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: '2d10 Application is running with Prisma!',
    version: '2.0.0',
    database: 'Prisma',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      characters: '/api/characters',
      inventory: '/api/inventory',
      items: '/api/items',
      equipment: '/api/equipment',
      dnd: '/api/dnd',
      dndLocal: '/api/dnd-local',
      purse: '/api/purse',
      campaigns: '/api/campaigns',
      grimoire: '/api/grimoire',
      sessions: '/api/sessions',
      health: '/health'
    }
  });
});

// Route de test de la base de données
app.get('/health', async (req, res) => {
  try {
    // Test de connexion Prisma
    await prisma.$queryRaw`SELECT NOW()`;
    
    // Récupérer quelques statistiques
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    
    res.json({ 
      status: 'OK', 
      database: 'Prisma Connected',
      timestamp: new Date().toISOString(),
      stats: {
        users: userCount,
        roles: roleCount
      }
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'Prisma Disconnected',
      error: err.message 
    });
  }
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

// Démarrer le serveur
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Serveur démarré sur le port ${port}`);
  console.log(`📊 Utilisation de Prisma comme ORM`);
  await initializeDatabase();
});
