# 🎲 2d10 - D&D Character Management System

Une application complète de gestion de personnages D&D 5e avec intégration de l'API Open5e pour accéder aux données officielles du jeu.

## 📋 Sommaire

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Initialisation avec Docker Compose](#-initialisation-avec-docker-compose)
- [Documentation](#-documentation)
- [Démarrage Rapide](#-démarrage-rapide)
- [Contribution](#-contribution)

## 🌟 Vue d'ensemble

### 🧙‍♂️ Gestion des Personnages
- Création et gestion de personnages D&D 5e
- Système de statistiques complet (Force, Dextérité, Constitution, etc.)
- Gestion des niveaux et points d'expérience
- Système de races et classes intégré

### 🎒 Inventaire et Équipement
- Inventaire complet avec gestion des objets
- Système d'équipement avec slots spécialisés
- Gestion de la bourse (pièces d'or, d'argent, etc.)
- Catalogue d'objets avec propriétés détaillées

### 📖 Grimoire des Sorts
- Gestion des sorts connus et préparés
- Recherche et ajout de sorts depuis la base D&D
- Système de préparation pour les classes préparatrices
- Suivi des lancements et statistiques

### 🏰 Gestion de Campagnes
- Création et gestion de campagnes
- Attribution de personnages aux campagnes
- Sessions de jeu et suivi des parties
- Gestion de la présence aux sessions

### 🔐 Authentification et Administration
- Système d'authentification JWT sécurisé
- Gestion des rôles (User, GM, Admin)
- Panel d'administration complet
- Statistiques globales

### 🌟 Intégration D&D 5e
- **Sorts** : Accès à tous les sorts avec descriptions complètes
- **Monstres** : Base de données complète des créatures
- **Armes & Armures** : Catalogue officiel avec propriétés
- **Races & Classes** : Toutes les options de personnalisation
- **Recherche globale** : Recherche dans toutes les données D&D
- **API Open5e** : Intégration avec la base de données officielle

## 🚀 Installation Rapide

### Option 1 : Docker (Recommandé)
```bash
# Backend uniquement
docker-compose --profile back up -d

# Application complète (à venir)
docker-compose --profile full up -d
```

### Option 2 : Installation Automatique
```bash
cd back/
chmod +x install.sh
./install.sh
```

### Option 3 : Installation Manuelle
```bash
# Backend
cd back/
npm install
createdb 2d10_db
cp .env.example .env
# Éditer .env avec vos paramètres
npm start

# Frontend (à venir)
cd ../front/
# Installation frontend
```

> **🐳 Voir le [guide Docker](DOCKER.md) pour plus d'options**

## 🐳 Initialisation avec Docker Compose

### Prérequis
- Docker et Docker Compose installés
- Port 3000 et 5432 disponibles

### Démarrage rapide avec Docker
```bash
# 1. Cloner le repository
git clone <repository-url>
cd 2d10

# 2. Naviguer vers le dossier backend
cd back/

# 3. Démarrer les services avec Docker Compose
docker-compose up -d

# 4. Vérifier que les services sont démarrés
docker-compose ps
```

### Services Docker
- **Backend API** : `http://localhost:3000`
- **PostgreSQL** : `localhost:5432`
- **Base de données** : `2d10_db`

### Commandes utiles
```bash
# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down

# Redémarrer les services
docker-compose restart

# Reconstruire les images
docker-compose up --build -d
```

### Configuration automatique
Docker Compose configure automatiquement :
- ✅ Base de données PostgreSQL
- ✅ Initialisation du schéma
- ✅ Variables d'environnement
- ✅ Réseau interne entre les services

### Synchronisation des données D&D
Une fois les services démarrés, synchronisez les données D&D officielles :

```bash
# Option 1 : Synchronisation simple (recommandée)
docker-compose exec backend npm run sync-dnd

# Option 2 : Synchronisation complète
docker-compose exec backend npm run sync-dnd-full

# Option 3 : Synchronisation avancée
docker-compose exec backend npm run sync-dnd-advanced
```

#### 🔧 Types de synchronisation disponibles :

- **🟢 Simple** (`sync-dnd`) : Synchronisation basique des sorts uniquement
- **🟡 Complète** (`sync-dnd-full`) : Sorts + monstres + armes + armures + items
- **🔴 Avancée** (`sync-dnd-advanced`) : Synchronisation complète avec options avancées

#### ⚙️ Fonctionnalités de la synchronisation avancée :

- **📊 Tables dédiées** : Crée des tables spécialisées (`dnd_spells`, `dnd_monsters`, etc.)
- **🔄 Gestion des conflits** : Mise à jour intelligente des données existantes
- **📈 Logs détaillés** : Suivi complet des synchronisations dans `sync_log`
- **⚡ Options flexibles** :
  - `--force` : Forcer la synchronisation même si des données existent
  - `--clear` : Vider les tables avant synchronisation
  - `--dry-run` : Mode simulation sans insertion
  - `--limit N` : Limiter le nombre d'éléments
  - `--spells`, `--monsters`, `--weapons`, `--armor`, `--items` : Synchroniser des types spécifiques

#### 💡 Exemples d'utilisation avancée :
```bash
# Synchroniser seulement les sorts et armes
docker-compose exec backend node scripts/sync-dnd-advanced.js --spells --weapons

# Mode simulation pour voir ce qui serait synchronisé
docker-compose exec backend node scripts/sync-dnd-advanced.js --dry-run

# Forcer la synchronisation complète
docker-compose exec backend node scripts/sync-dnd-advanced.js --all --force

# Synchroniser seulement 100 items
docker-compose exec backend node scripts/sync-dnd-advanced.js --items --limit 100
```

> **💡 Avantage** : Aucune installation manuelle requise, tout fonctionne en un seul commande !

## 📡 API Endpoints

L'API 2d10 propose **63 endpoints** organisés en 11 catégories principales :

- 🔐 **Authentification** (3 endpoints)
- 👑 **Administration** (2 endpoints)
- 🧙‍♂️ **Personnages** (6 endpoints)
- 🎒 **Inventaire et Bourse** (6 endpoints)
- ⚔️ **Objets et Équipement** (6 endpoints)
- 📖 **Grimoire des Sorts** (8 endpoints)
- 🏰 **Campagnes** (8 endpoints)
- 🎲 **Sessions de Jeu** (7 endpoints)
- 🎲 **D&D** (13 endpoints)
- 🔧 **Utilitaires** (2 endpoints)

> **📖 Voir la [documentation complète des endpoints](back/README.md#-api-endpoints) pour tous les détails**

## 🧪 Tests

### 📋 Collections Postman
- **[Collection Complète](back/postman/2d10_Complete_API_Collection.postman_collection.json)** - Tous les endpoints (63 routes)
- **Configuration** : `baseUrl: http://localhost:3000`
- **Authentification** : Token JWT automatique

### 🔑 Compte de Test
- **Email** : `admin@2d10.com`
- **Mot de passe** : `admin123`

> **📖 Voir le [guide de test complet](back/README.md#-tests) pour plus de détails**

## 🏗️ Architecture

```
2d10/
├── back/                    # Backend Node.js/Express
│   ├── routes/             # Routes API
│   ├── middleware/         # Middleware d'authentification
│   ├── services/           # Services (D&D API)
│   ├── postman/            # Collections et guides Postman
│   │   ├── *.postman_*.json # Collections Postman
│   │   ├── POSTMAN_GUIDE.md # Guide d'utilisation
│   │   └── generate-*.js    # Scripts de génération
│   └── *.md               # Documentation
├── front/                  # Frontend (à venir)
└── README.md              # Ce fichier
```

## 🛠️ Technologies

### Backend
- **Node.js** + **Express.js** - Serveur API
- **PostgreSQL** - Base de données
- **JWT** - Authentification
- **Axios** - Client HTTP pour Open5e
- **bcryptjs** - Hachage des mots de passe

### Intégration D&D
- **Open5e API** - Données officielles D&D 5e
- **REST API** - Interface standardisée
- **Recherche avancée** - Filtres et pagination

## 📚 Documentation

### 📖 Documentation Générale
- **[Documentation Complète](docs/README.md)** - Index de toute la documentation
- **[Backend Documentation](back/README.md)** - Documentation complète du backend
- **[Frontend Documentation](front/README.md)** - Documentation du frontend (à venir)

### 🔧 Documentation Technique
- **[API Documentation Complète](docs/COMPLETE_API_DOCUMENTATION.md)** - Référence complète de l'API
- **[Collection Postman](back/2d10_Complete_API_Collection.postman_collection.json)** - Collection de test complète

### 🎲 Guides Spécialisés
- **[Guide d'intégration D&D](docs/README_DND_INTEGRATION.md)** - Guide d'utilisation des fonctionnalités D&D
- **[Guide Postman](docs/POSTMAN_GUIDE.md)** - Guide d'utilisation Postman

## 🔧 Configuration

### Variables d'Environnement
```env
# Base de données
DATABASE_URL=postgresql://localhost:5432/2d10_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Serveur
PORT=3000
NODE_ENV=development
```

### Base de Données
- **PostgreSQL 12+** requis
- Script d'initialisation automatique
- Schéma complet avec relations
- Index optimisés pour les performances

## 🚀 Démarrage Rapide

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd 2d10
   ```

2. **Installer et configurer**
   ```bash
   cd back/
   chmod +x install.sh
   ./install.sh
   ```

3. **Démarrer l'application**
   ```bash
   npm start
   ```

4. **Synchroniser les données D&D** (optionnel)
   ```bash
   # Synchronisation simple
   npm run sync-dnd
   
   # Ou synchronisation complète
   npm run sync-dnd-full
   ```

5. **Tester l'API**
   - Ouvrir Postman
   - Importer les collections
   - Tester les endpoints

## 🎯 Exemples d'Utilisation

### Créer un Personnage avec Données D&D
```javascript
// 1. Récupérer les races disponibles
const races = await fetch('/api/dnd/races', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Récupérer les classes disponibles
const classes = await fetch('/api/dnd/classes', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Créer le personnage
const character = await fetch('/api/characters', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Aragorn",
    race: "Human",
    class: "Ranger",
    level: 5
  })
});
```

### Rechercher des Sorts
```javascript
// Sorts de niveau 3
const spells = await fetch('/api/dnd/spells?level=3', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Rechercher des sorts de feu
const fireSpells = await fetch('/api/dnd/spells?search=fire', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Gérer l'Inventaire
```javascript
// Ajouter une épée à l'inventaire
const addWeapon = await fetch('/api/inventory/1/items', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    item_id: 1,
    quantity: 1,
    notes: "Épée trouvée dans le donjon"
  })
});
```

## 🤝 Contribution

1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- **Open5e** - API officielle D&D 5e
- **Wizards of the Coast** - D&D 5e
- **Communauté D&D** - Inspiration et feedback

## 📞 Support

- **Issues** : Utiliser les GitHub Issues
- **Documentation** : Consulter les fichiers .md
- **API** : Tester avec Postman

---

**🎲 Que l'aventure commence !**

*Créé avec ❤️ pour la communauté D&D*
