# 🎲 Intégration D&D avec Open5e API

> **Obsolète (proxy `/api/dnd`)** : la route Express `dnd-prisma` et les scripts `sync-dnd-*` ont été retirés du dépôt. Utiliser les données importées (`/api/dnd5e`, `/api/dnd-local`) et les scripts `import-dnd5e-*` décrits dans le README principal.

Cette page décrivait l’intégration historique avec l’API [Open5e](https://api.open5e.com/) pour un accès aux données D&D 5e.

## 🌟 Nouvelles Fonctionnalités

### 📚 Données D&D Disponibles
- **Sorts** : Tous les sorts avec descriptions, composants, niveaux
- **Monstres** : Créatures avec statistiques complètes et actions
- **Armes** : Armes de mêlée et à distance avec propriétés
- **Armures** : Protection avec bonus et catégories
- **Races** : Races jouables avec traits raciaux
- **Classes** : Classes de personnage avec capacités
- **Origines** : Backgrounds pour personnaliser les personnages
- **Dons** : Capacités spéciales
- **Conditions** : États affectant les personnages

### 🔍 Fonctionnalités de Recherche
- **Recherche par catégorie** : Filtrer par niveau, type, rareté, etc.
- **Recherche textuelle** : Recherche dans les noms et descriptions
- **Recherche globale** : Rechercher dans toutes les catégories simultanément
- **Pagination** : Navigation efficace dans les grandes listes

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 16+ 
- PostgreSQL 12+
- npm ou yarn

### Installation Automatique
```bash
cd back/
chmod +x install.sh
./install.sh
```

### Installation Manuelle
```bash
# Installer les dépendances
npm install

# Créer la base de données
createdb 2d10_db

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# Initialiser la base de données
node -e "const { Pool } = require('pg'); const fs = require('fs'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.connect().then(client => { client.query(fs.readFileSync('./init.sql', 'utf8')); console.log('DB initialisée'); client.release(); process.exit(0); });"

# Démarrer l'application
npm start
```

## 📡 API Endpoints

### Base URL
```
http://localhost:3000/api/dnd
```

### Sorts
```bash
# Tous les sorts
GET /api/dnd/spells

# Sorts de niveau 3
GET /api/dnd/spells?level=3

# Rechercher des sorts
GET /api/dnd/spells?search=fire

# Sort spécifique
GET /api/dnd/spells/fireball
```

### Monstres
```bash
# Tous les monstres
GET /api/dnd/monsters

# Monstres de CR 5
GET /api/dnd/monsters?challenge_rating=5

# Rechercher des dragons
GET /api/dnd/monsters?search=dragon

# Monstre spécifique
GET /api/dnd/monsters/ancient-red-dragon
```

### Armes
```bash
# Toutes les armes
GET /api/dnd/weapons

# Armes de mêlée
GET /api/dnd/weapons?category=melee

# Rechercher des épées
GET /api/dnd/weapons?search=sword

# Arme spécifique
GET /api/dnd/weapons/longsword
```

### Armures
```bash
# Toutes les armures
GET /api/dnd/armor

# Armures lourdes
GET /api/dnd/armor?armor_category=heavy

# Rechercher des armures de plaques
GET /api/dnd/armor?search=plate

# Armure spécifique
GET /api/dnd/armor/plate-armor
```

### Races
```bash
# Toutes les races
GET /api/dnd/races

# Rechercher des elfes
GET /api/dnd/races?search=elf

# Race spécifique
GET /api/dnd/races/high-elf
```

### Classes
```bash
# Toutes les classes
GET /api/dnd/classes

# Rechercher des magiciens
GET /api/dnd/classes?search=wizard

# Classe spécifique
GET /api/dnd/classes/wizard
```

### Recherche Globale
```bash
# Rechercher dans toutes les catégories
GET /api/dnd/search?q=magic

# Rechercher dans des catégories spécifiques
GET /api/dnd/search?q=fire&types=spells,monsters,weapons
```

## 🔧 Utilisation dans l'Application

### Création de Personnages
```javascript
// Récupérer les races disponibles
const races = await fetch('/api/dnd/races', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Récupérer les classes disponibles
const classes = await fetch('/api/dnd/classes', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Gestion d'Inventaire
```javascript
// Rechercher des armes pour l'inventaire
const weapons = await fetch('/api/dnd/weapons?search=sword', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Rechercher des armures
const armor = await fetch('/api/dnd/armor?armor_category=medium', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Système de Magie
```javascript
// Récupérer les sorts par niveau
const level3Spells = await fetch('/api/dnd/spells?level=3', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Rechercher un sort spécifique
const fireball = await fetch('/api/dnd/spells/fireball', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Encounters et Combat
```javascript
// Récupérer des monstres par CR
const cr5Monsters = await fetch('/api/dnd/monsters?challenge_rating=5', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Rechercher des dragons
const dragons = await fetch('/api/dnd/monsters?search=dragon', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 📊 Format des Données

### Exemple de Sort
```json
{
  "success": true,
  "data": {
    "id": "fireball",
    "name": "Fireball",
    "level": 3,
    "school": "evocation",
    "casting_time": "1 action",
    "range": "150 feet",
    "components": "V, S, M",
    "duration": "Instantaneous",
    "description": "A bright streak flashes from your pointing finger...",
    "higher_level": "When you cast this spell using a spell slot...",
    "ritual": false,
    "concentration": false
  }
}
```

### Exemple de Monstre
```json
{
  "success": true,
  "data": {
    "id": "ancient-red-dragon",
    "name": "Ancient Red Dragon",
    "size": "Gargantuan",
    "type": "dragon",
    "alignment": "chaotic evil",
    "armor_class": 22,
    "hit_points": 546,
    "challenge_rating": 24,
    "actions": [...],
    "legendary_actions": [...],
    "special_abilities": [...]
  }
}
```

## 🧪 Tests avec Postman

Collections Postman utiles (dans `back/postman/`) :

1. **2d10_Complete_API_Collection.postman_collection.json** — aperçu des routes courantes
2. **2d10_API_Collection_v2.postman_collection.json** — générée par `generate-postman-collection.js` si vous la régénérez

### Configuration Postman
1. Importer les collections
2. Configurer l'environnement avec :
   - `baseUrl`: `http://localhost:3000`
   - `authToken`: Token JWT (récupéré via login)

### Tests Recommandés
1. **Authentification** : Login admin
2. **API Info** : Vérifier la connectivité
3. **Recherche globale** : Tester la recherche
4. **Données spécifiques** : Tester chaque catégorie

## 🔒 Sécurité et Authentification

- Toutes les routes D&D nécessitent une authentification JWT
- Les tokens expirent après 24h par défaut
- Gestion des erreurs et timeouts
- Rate limiting respecté (API Open5e)

## 🚨 Limitations et Considérations

### API Open5e
- **Rate Limiting** : Respecter les limites de l'API
- **Données en lecture seule** : Pas de modification possible
- **Dépendance externe** : Nécessite une connexion internet
- **Latence** : Requêtes réseau supplémentaires

### Gestion des Erreurs
```javascript
// Vérifier le succès de la requête
if (response.success) {
  // Utiliser les données
  console.log(response.data);
} else {
  // Gérer l'erreur
  console.error(response.error);
}
```

## 🔄 Mise à Jour et Maintenance

### Mise à jour des dépendances
```bash
npm update
```

### Vérification d’un endpoint D&D local (exemple)
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/dnd-local/stats"
```

### Logs et Debug
```bash
# Activer les logs détaillés
NODE_ENV=development npm start
```

## 📈 Améliorations Futures

- **Cache local** : Mise en cache des données fréquemment utilisées
- **Synchronisation** : Mise à jour périodique des données
- **Filtres avancés** : Filtres combinés et recherche complexe
- **Export** : Export des données pour usage hors ligne
- **Intégration** : Liaison directe avec les personnages créés

## 🤝 Contribution

Pour contribuer à l'amélioration de l'intégration D&D :

1. Fork le repository
2. Créer une branche feature
3. Implémenter les améliorations
4. Tester avec les collections Postman
5. Soumettre une pull request

## 📞 Support

- **Documentation API** : `DND_API_DOCUMENTATION.md`
- **Collection Postman** : `back/postman/2d10_Complete_API_Collection.postman_collection.json`
- **Logs** : Vérifier les logs de l'application
- **API Open5e** : [Documentation officielle](https://open5e.com/api-docs)

---

**🎲 Bon jeu et que les dés soient avec vous !**
