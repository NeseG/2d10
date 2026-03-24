const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Vérifier que l'utilisateur existe toujours en base via Prisma
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true
      },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé ou inactif' });
    }

    // Garder un format compatible avec les routes existantes
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.roleId,
      role_name: user.role.name,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };
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

// Middleware pour vérifier la propriété d'un personnage
const checkCharacterOwnership = async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_name;

    // Les admins et GM peuvent accéder à tous les personnages
    if (userRole === 'admin' || userRole === 'gm') {
      return next();
    }

    // Vérifier que le personnage appartient à l'utilisateur via Prisma
    const character = await prisma.character.findFirst({
      where: {
        id: parseInt(characterId, 10),
        userId
      },
      select: { id: true }
    });

    if (!character) {
      return res.status(403).json({ 
        error: 'Accès refusé. Ce personnage ne vous appartient pas.' 
      });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  checkCharacterOwnership
};
