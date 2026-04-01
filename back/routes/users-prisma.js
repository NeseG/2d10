const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Liste des utilisateurs (admin/gm) pour assigner un propriétaire de personnage
router.get('/', authenticateToken, requireRole(['admin', 'gm']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: { username: 'asc' },
    });

    res.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role_name: u.role?.name ?? null,
        is_active: u.isActive,
        created_at: u.createdAt,
        updated_at: u.updatedAt,
      })),
      count: users.length,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

