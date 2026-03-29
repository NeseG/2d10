# 🎲 2d10 - D&D Character Management System

Une application complète de gestion de personnages D&D 5e avec intégration de l'API Open5e pour accéder aux données officielles du jeu.

## 📋 Sommaire

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Docker](#-docker)
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

## 🐳 Docker

### 📋 Profils Disponibles

#### 🔧 Backend uniquement
```bash
docker-compose --profile back up -d
```
- Base de données PostgreSQL
- Interface pgAdmin
- Backend Node.js/Express

#### 🎨 Frontend uniquement (à venir)
```bash
docker-compose --profile front up -d
```
- Frontend React/Vue/Angular
- Dépend du backend

#### 🚀 Application complète (à venir)
```bash
docker-compose --profile full up -d
```
- Backend + Frontend + Base de données
- Configuration de développement

#### 🏭 Production (à venir)
```bash
docker-compose --profile production up -d
```
- Backend + Frontend + Nginx
- Configuration de production

### 🚀 Commandes Utiles

#### Démarrer les services
```bash
# Backend uniquement
docker-compose --profile back up -d

# Application complète (à venir)
docker-compose --profile full up -d

# Production (à venir)
docker-compose --profile production up -d
```

#### Gestion des services
```bash
# Arrêter les services
docker-compose down

# Voir les logs
docker-compose logs

# Service spécifique
docker-compose logs back
docker-compose logs db

# Reconstruire les images
docker-compose build --no-cache
```

#### Accès aux services
- **Backend API** : http://localhost:3000
- **pgAdmin** : http://localhost:5050
- **Frontend** : http://localhost:3001 (à venir)
- **Nginx** : http://localhost:80 (production)

### 🔧 Configuration

#### Variables d'environnement
Les variables sont définies dans le docker-compose.yml :
- `DATABASE_URL` : URL de connexion PostgreSQL
- `JWT_SECRET` : Clé secrète JWT
- `NODE_ENV` : Environnement (development/production)

#### Volumes
- `db_data` : Données PostgreSQL persistantes
- `./back:/usr/src/app` : Code source backend (développement)

### 🛠️ Développement

#### Mode développement
```bash
# Démarrer seulement la base de données
docker-compose up db pgadmin -d

# Lancer le backend en local
cd back/
npm install
npm run dev
```

#### Mode production
```bash
# Construire et démarrer en production
docker-compose --profile production up --build -d
```

### 🔍 Dépannage

#### Vérifier l'état des conteneurs
```bash
docker-compose ps
```

#### Accéder aux conteneurs
```bash
# Backend
docker-compose exec back sh

# Base de données
docker-compose exec db psql -U 2d10 -d 2d10
```

#### Nettoyer
```bash
# Supprimer les conteneurs et volumes
docker-compose down -v

# Supprimer les images
docker-compose down --rmi all
```


### Import D&D 5e (données locales)
Les scripts `npm run import-dnd5e-equipment` et `npm run import-dnd5e-spells` (dans `back/`) alimentent les tables utilisées par `/api/dnd5e` et `/api/dnd-local`.

## 📡 API Endpoints

L'API 2d10 expose de nombreux endpoints, organisés en catégories principales :

- 🔐 **Authentification** (3 endpoints)
- 👑 **Administration** (2 endpoints)
- 🧙‍♂️ **Personnages** (6 endpoints)
- 🎒 **Inventaire et Bourse** (6 endpoints)
- ⚔️ **Objets et Équipement** (6 endpoints)
- 📖 **Grimoire des Sorts** (8 endpoints)
- 🏰 **Campagnes** (8 endpoints)
- 🎲 **Sessions de Jeu** (7 endpoints)
- 🎲 **D&D local + D&D 5e importé** (`/api/dnd-local`, `/api/dnd5e`, `/api/spells`)
- 🔧 **Utilitaires** (2 endpoints)

> **📖 Voir la [documentation complète des endpoints](back/README.md#-api-endpoints) pour tous les détails**

## 🧪 Tests

### 📋 Collections Postman
- **[Collection complète](back/postman/2d10_Complete_API_Collection.postman_collection.json)** — principaux endpoints
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

4. **Tester l'API**
   - Ouvrir Postman
   - Importer les collections
   - Tester les endpoints

## 🎯 Exemples d'Utilisation

### Créer un personnage
```javascript
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

### Rechercher des sorts (base locale importée)
```javascript
const spells = await fetch('/api/dnd-local/spells?search=fire&limit=20', {
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
