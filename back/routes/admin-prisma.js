const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes admin nécessitent une authentification et le rôle admin
router.use(authenticateToken);
router.use(requireAdmin);

// Obtenir tous les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formater la réponse pour correspondre à l'API existante
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      role_name: user.role.name
    }));

    res.json({
      users: formattedUsers
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un utilisateur par ID
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Formater la réponse pour correspondre à l'API existante
    const formattedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      role_name: user.role.name
    };

    res.json({
      user: formattedUser
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouvel utilisateur (admin seulement)
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    // Validation des données
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà' });
    }

    // Récupérer l'ID du rôle
    const roleRecord = await prisma.role.findUnique({
      where: { name: role }
    });

    if (!roleRecord) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        roleId: roleRecord.id,
        isActive: true
      },
      include: {
        role: true
      }
    });

    // Formater la réponse pour correspondre à l'API existante
    const formattedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.roleId,
      is_active: user.isActive,
      created_at: user.createdAt
    };

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: formattedUser
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un utilisateur
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, is_active } = req.body;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer l'ID du rôle si fourni
    let roleId = null;
    if (role) {
      const roleRecord = await prisma.role.findUnique({
        where: { name: role }
      });
      if (!roleRecord) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }
      roleId = roleRecord.id;
    }

    // Construire les données de mise à jour
    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (roleId) updateData.roleId = roleId;
    if (typeof is_active === 'boolean') updateData.isActive = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true
      }
    });

    // Formater la réponse pour correspondre à l'API existante
    const formattedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.isActive,
      role_id: user.roleId,
      updated_at: user.updatedAt
    };

    res.json({
      message: 'Utilisateur mis à jour avec succès',
      user: formattedUser
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un utilisateur (désactiver)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Désactiver l'utilisateur au lieu de le supprimer
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    res.json({
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la désactivation de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques
router.get('/stats', async (req, res) => {
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

    res.json({
      stats: {
        total_users: totalUsers,
        active_users: activeUsers,
        admin_users: adminUsers
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
