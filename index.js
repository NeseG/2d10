const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const config = require('./back/config');

// Import des routes
const authRoutes = require('./back/routes/auth');
const adminRoutes = require('./back/routes/admin');
const characterRoutes = require('./back/routes/characters');
const inventoryRoutes = require('./back/routes/inventory');
const itemRoutes = require('./back/routes/items');
const equipmentRoutes = require('./back/routes/equipment');

const app = express();
const port = config.port;

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/equipment', equipmentRoutes);

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
});
