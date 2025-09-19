# 🔄 Migration vers Prisma

Guide de migration de votre projet 2d10 vers Prisma ORM.

## 📋 État de la Migration

### ✅ **Étapes Complétées**
- [x] Installation de Prisma et @prisma/client
- [x] Configuration du schéma Prisma
- [x] Création du client Prisma centralisé
- [x] Configuration Docker Compose
- [x] Exemple de route refactorisée (characters-prisma.js)

### 🔄 **Étapes en Cours**
- [ ] Migration des données existantes
- [ ] Refactoring des routes principales
- [ ] Tests de validation

### ⏳ **Étapes à Venir**
- [ ] Migration des routes d'inventaire
- [ ] Migration des routes de grimoire
- [ ] Migration des routes de campagnes
- [ ] Suppression des requêtes SQL brutes

## 🚀 **Démarrage Rapide**

### 1. **Démarrer avec Docker**
```bash
# Démarrer les services
docker-compose --profile back up -d

# Vérifier les logs
docker-compose logs back
```

### 2. **Migrer les données**
```bash
# Exécuter le script de migration
docker-compose exec back node scripts/migrate-to-prisma.js
```

### 3. **Tester Prisma Studio**
```bash
# Ouvrir Prisma Studio
docker-compose exec back npm run prisma:studio
```

## 🔧 **Configuration**

### **Schéma Prisma**
- **Fichier** : `back/prisma/schema.prisma`
- **Modèles** : 20+ modèles couvrant tout le système
- **Relations** : Relations complètes entre entités

### **Client Prisma**
- **Fichier** : `back/lib/prisma.js`
- **Configuration** : Gestion des connexions et déconnexions
- **Logs** : Activation des logs de requêtes

### **Docker Compose**
- **Variables** : DATABASE_URL configurée
- **Volumes** : Code source monté pour développement
- **Réseau** : Communication avec PostgreSQL

## 📊 **Modèles Principaux**

### **Utilisateurs et Rôles**
```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  email     String   @unique
  password  String
  roleId    Int
  role      Role     @relation(fields: [roleId], references: [id])
  characters Character[]
  campaigns Campaign[]
}

model Role {
  id    Int    @id @default(autoincrement())
  name  String @unique
  users User[]
}
```

### **Personnages**
```prisma
model Character {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  name            String
  race            String
  class           String
  level           Int
  // ... autres propriétés
  grimoire        Grimoire[]
  inventory       Inventory[]
  equipment       Equipment[]
  purse           Purse?
}
```

### **Grimoire**
```prisma
model Grimoire {
  id          Int      @id @default(autoincrement())
  characterId Int
  character   Character @relation(fields: [characterId], references: [id])
  spellSlug   String
  spellName   String
  spellLevel  Int
  isPrepared  Boolean  @default(false)
  isKnown     Boolean  @default(true)
  timesCast   Int      @default(0)
}
```

## 🔄 **Migration des Routes**

### **Avant (SQL brut)**
```javascript
const result = await pool.query(
  'SELECT * FROM characters WHERE user_id = $1',
  [userId]
);
```

### **Après (Prisma)**
```javascript
const characters = await prisma.character.findMany({
  where: { userId },
  include: { 
    grimoire: true,
    inventory: { include: { item: true } }
  }
});
```

## 🧪 **Tests**

### **Tester la connexion**
```bash
# Dans le conteneur
docker-compose exec back node -e "
const prisma = require('./lib/prisma');
prisma.user.count().then(count => {
  console.log('Utilisateurs:', count);
  prisma.\$disconnect();
});
"
```

### **Tester une route**
```bash
# Tester la route characters-prisma
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/characters-prisma
```

## 📈 **Avantages de Prisma**

### **Type Safety**
- Types TypeScript générés automatiquement
- Validation des données à la compilation
- IntelliSense complet

### **Productivité**
- Syntaxe intuitive et lisible
- Relations automatiques
- Migrations automatiques

### **Performance**
- Optimisations des requêtes
- Connexion pooling
- Cache intelligent

### **Développement**
- Prisma Studio pour visualiser les données
- Logs de requêtes détaillés
- Debugging facilité

## 🚨 **Points d'Attention**

### **Migration Progressive**
- Garder les routes existantes pendant la transition
- Tester chaque route individuellement
- Valider les données avant suppression

### **Performance**
- Utiliser `select` pour limiter les champs
- Éviter les N+1 queries avec `include`
- Indexer les champs de recherche fréquents

### **Sécurité**
- Validation des entrées utilisateur
- Gestion des permissions
- Protection contre les injections

## 📚 **Ressources**

- [Documentation Prisma](https://www.prisma.io/docs/)
- [Guide de migration](https://www.prisma.io/docs/guides/migrate-to-prisma)
- [Prisma Studio](https://www.prisma.io/studio)
- [Exemples de requêtes](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

---

**🎲 Bonne migration !**
