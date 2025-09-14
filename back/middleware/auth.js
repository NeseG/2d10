const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Vérifier que l'utilisateur existe toujours en base
    const result = await pool.query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1 AND u.is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé ou inactif' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Middleware pour vérifier le rôle admin
const requireAdmin = (req, res, next) => {
  if (req.user.role_name !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Privilèges administrateur requis.' });
  }
  next();
};

// Middleware pour vérifier le rôle (admin ou user)
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({ 
        error: `Accès refusé. Rôles autorisés: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole
};
