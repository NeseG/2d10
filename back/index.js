const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const config = require('./config');

// Import des routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const characterRoutes = require('./routes/characters');
const inventoryRoutes = require('./routes/inventory');
const itemRoutes = require('./routes/items');
const equipmentRoutes = require('./routes/equipment');
const dndRoutes = require('./routes/dnd');
const dndLocalRoutes = require('./routes/dnd-local');
const purseRoutes = require('./routes/purse');
const campaignRoutes = require('./routes/campaigns');
// const sessionRoutes = require('./routes/sessions');

const app = express();
const port = config.port;

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser la base de données
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Lire et exécuter le fichier SQL d'initialisation
    const fs = require('fs');
    const path = require('path');
    const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    
    await client.query(initSQL);
    console.log('Base de données initialisée avec succès');
    
    client.release();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
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
// app.use('/api/sessions', sessionRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: '2d10 Application is running!',
    version: '1.0.0',
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
      sessions: '/api/sessions',
      health: '/health'
    }
  });
});

// Route de test de la base de données
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: result.rows[0].now 
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'Disconnected',
      error: err.message 
    });
  }
});

// Démarrer le serveur
app.listen(port, '0.0.0.0', async () => {
  console.log(`Server is running on port ${port}`);
  await initializeDatabase();
});
