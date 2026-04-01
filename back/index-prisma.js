const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const prisma = require('./lib/prisma');
const { attachSessionChatWss } = require('./ws/session-chat');
const { attachSessionInitiativeWss } = require('./ws/session-initiative');
const { attachSessionMapWss } = require('./ws/session-map');

// Import des routes (nouvelles routes Prisma)
const authRoutes = require('./routes/auth-prisma');
const adminRoutes = require('./routes/admin-prisma');
const characterRoutes = require('./routes/characters-prisma');
const inventoryRoutes = require('./routes/inventory-prisma');
const itemRoutes = require('./routes/items-prisma');
const equipmentRoutes = require('./routes/equipment-prisma');
const dndLocalRoutes = require('./routes/dnd-local-prisma');
const purseRoutes = require('./routes/purse-prisma');
const campaignRoutes = require('./routes/campaigns-prisma');
const grimoireRoutes = require('./routes/grimoire-prisma');
const sessionRoutes = require('./routes/sessions-prisma');
const usersRoutes = require('./routes/users-prisma');
const dnd5eEquipmentRoutes = require('./routes/dnd5e-equipment-prisma');
const dnd5eMagicItemsRoutes = require('./routes/dnd5e-magic-items-prisma');
const dnd5eSpellsRoutes = require('./routes/dnd5e-spells-prisma');
const spellRoutes = require('./routes/spells-prisma');

const app = express();
const server = http.createServer(app);
const port = config.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/dnd-local', dndLocalRoutes);
app.use('/api/purse', purseRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/grimoire', grimoireRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dnd5e', dnd5eEquipmentRoutes);
app.use('/api/dnd5e', dnd5eMagicItemsRoutes);
app.use('/api/dnd5e', dnd5eSpellsRoutes);
app.use('/api/spells', spellRoutes);

attachSessionChatWss(server);
attachSessionInitiativeWss(server);
attachSessionMapWss(server);

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
      dndLocal: '/api/dnd-local',
      dnd5e: '/api/dnd5e',
      spells: '/api/spells',
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

// Démarrer le serveur (HTTP + WebSocket chat session live)
server.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Serveur démarré sur le port ${port}`);
  console.log(`📊 Utilisation de Prisma comme ORM`);
  await initializeDatabase();
});
