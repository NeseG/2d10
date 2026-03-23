# Migration des Routes vers Prisma

Ce document explique comment migrer les routes du projet 2d10 de PostgreSQL direct vers Prisma ORM.

## 📋 Vue d'ensemble

La migration a été effectuée étape par étape, en commençant par les routes `admin` et `auth` comme demandé.

### Fichiers créés/modifiés

#### Nouveaux fichiers
- `routes/admin-prisma.js` - Routes admin utilisant Prisma
- `routes/auth-prisma.js` - Routes auth utilisant Prisma  
- `index-prisma.js` - Serveur principal utilisant les routes Prisma
- `test-prisma-routes.js` - Tests des nouvelles routes
- `scripts/migrate-to-prisma-routes.js` - Script de migration
- `scripts/rollback-to-postgres.js` - Script de rollback (généré automatiquement)

#### Fichiers modifiés
- `prisma/schema.prisma` - Ajout du champ `isActive` au modèle User
- `package.json` - Ajout des scripts de migration et test

## 🔧 Modifications du schéma Prisma

### Modèle User mis à jour
```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  email        String   @unique
  passwordHash String   // Renommé de 'password'
  isActive     Boolean  @default(true) // Nouveau champ
  roleId       Int
  role         Role     @relation(fields: [roleId], references: [id])
  // ... autres champs
}
```

## 🚀 Utilisation

### 1. Préparation
```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer les changements à la base de données
npm run prisma:push
# ou pour une migration complète
npm run prisma:migrate
```

### 2. Tester les nouvelles routes
```bash
# Tester les routes Prisma
npm run test:prisma-routes

# Démarrer le serveur avec Prisma
npm run start:prisma
# ou en mode développement
npm run dev:prisma
```

### 3. Migration complète (optionnel)
```bash
# Migrer complètement vers Prisma
npm run migrate:routes

# Revenir en arrière si nécessaire
npm run rollback:routes
```

## 📊 Comparaison des routes

### Routes Admin
| Fonctionnalité | PostgreSQL | Prisma |
|----------------|------------|--------|
| GET /users | ✅ | ✅ |
| GET /users/:id | ✅ | ✅ |
| POST /users | ✅ | ✅ |
| PUT /users/:id | ✅ | ✅ |
| DELETE /users/:id | ✅ | ✅ |
| GET /stats | ✅ | ✅ |

### Routes Auth
| Fonctionnalité | PostgreSQL | Prisma |
|----------------|------------|--------|
| POST /register | ✅ | ✅ |
| POST /login | ✅ | ✅ |
| GET /profile | ✅ | ✅ |
| POST /logout | ✅ | ✅ |

## 🔍 Différences techniques

### Requêtes SQL vs Prisma
```javascript
// Ancien (PostgreSQL direct)
const result = await pool.query(`
  SELECT u.id, u.username, u.email, u.is_active, u.created_at, u.updated_at, r.name as role_name
  FROM users u 
  JOIN roles r ON u.role_id = r.id 
  ORDER BY u.created_at DESC
`);

// Nouveau (Prisma)
const users = await prisma.user.findMany({
  include: {
    role: true
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

### Gestion des erreurs
- Prisma fournit des erreurs plus détaillées
- Meilleure gestion des contraintes de base de données
- Validation automatique des types

## 🧪 Tests

Le fichier `test-prisma-routes.js` inclut des tests pour :
- Inscription d'utilisateur
- Connexion
- Récupération des utilisateurs (admin)
- Création d'utilisateur (admin)
- Statistiques (admin)

## ⚠️ Points d'attention

1. **Compatibilité des données** : Assurez-vous que la base de données est à jour avec le nouveau schéma
2. **Performance** : Prisma peut avoir des performances légèrement différentes
3. **Logs** : Prisma inclut des logs de requêtes détaillés (configurable)
4. **Migrations** : Utilisez `prisma migrate` pour les changements de schéma en production

## 🔄 Prochaines étapes

1. Tester les routes migrées
2. Migrer les autres routes (characters, inventory, etc.)
3. Mettre à jour la documentation API
4. Déployer en production

## 📞 Support

En cas de problème :
1. Vérifiez les logs Prisma
2. Consultez la documentation Prisma
3. Testez avec `npm run test:prisma-routes`
4. Utilisez `npm run rollback:routes` si nécessaire
