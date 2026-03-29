# 🎲 2d10 - D&D Character Management System

Application de gestion de personnages D&D 5e : backend **Express + Prisma**, frontend **React (Vite)**, données de référence importées depuis l’API publique [D&D 5e API](https://www.dnd5eapi.co/) (scripts `import-dnd5e-*` dans `back/`).

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

### 🌟 Données D&D 5e
- **Imports** : sorts, équipement et objets magiques SRD via `npm run import-dnd5e-*`
- **API** : `/api/dnd5e` (catalogue importé), `/api/dnd-local` (données en base), `/api/spells` (sorts de jeu)
- **Recherche** : recherche globale sur les jeux de données locaux (`/api/dnd-local/search`)

## 🚀 Installation Rapide

### Option 1 : Docker
```bash
# Base + pgAdmin + backend
docker compose --profile back up -d

# Backend + frontend Vite (ports 3000 et 5173)
docker compose --profile full up -d
```

### Option 2 : Backend et front en local
```bash
cd back && npm install
# Créer `.env` (DATABASE_URL, JWT_SECRET), puis :
npm run prisma:generate && npm run prisma:push && npm run prisma:seed
npm start

cd ../front && npm install && npm run dev
```

### Option 3 : `install.sh` (si présent)
```bash
cd back && chmod +x install.sh && ./install.sh
```

## 🐳 Docker

### 📋 Profils Disponibles

#### Backend (+ db + pgAdmin)
`docker compose --profile back up -d`

#### Backend + frontend (dev Vite)
`docker compose --profile full up -d` — frontend sur **http://localhost:5173**, API sur **http://localhost:3000**.

#### Production (Nginx)
`docker compose --profile production up -d`

### 🚀 Commandes Utiles

#### Démarrer les services
```bash
# Backend uniquement
docker compose --profile back up -d

# Application complète (à venir)
docker compose --profile full up -d

# Production (à venir)
docker compose --profile production up -d
```

#### Gestion des services
```bash
# Arrêter les services
docker compose down

# Voir les logs
docker compose logs

# Service spécifique
docker compose logs back
docker compose logs db

# Reconstruire les images
docker compose build --no-cache
```

#### Accès aux services
- **Backend API** : http://localhost:3000
- **pgAdmin** : http://localhost:5050
- **Frontend (profil full)** : http://localhost:5173
- **Nginx** : http://localhost:80 (profil production)

### 🔧 Configuration

#### Variables d'environnement
Les variables sont définies dans le fichier `docker-compose.yml` :
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
docker compose up db pgadmin -d

# Lancer le backend en local
cd back/
npm install
npm run dev
```

#### Mode production
```bash
# Construire et démarrer en production
docker compose --profile production up --build -d
```

### 🔍 Dépannage

#### Vérifier l'état des conteneurs
```bash
docker compose ps
```

#### Accéder aux conteneurs
```bash
# Backend
docker compose exec back sh

# Base de données
docker compose exec db psql -U 2d10 -d 2d10
```

#### Nettoyer
```bash
# Supprimer les conteneurs et volumes
docker compose down -v

# Supprimer les images
docker compose down --rmi all
```


### Import D&D 5e (données locales)
Dans `back/` : `npm run import-dnd5e-spells`, `import-dnd5e-equipment`, `import-dnd5e-magic-items` alimentent les tables consommées par `/api/dnd5e` et en partie `/api/dnd-local`. Détail : [docs/README_DND_INTEGRATION.md](docs/README_DND_INTEGRATION.md).

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

> **📖 Voir [back/README.md](back/README.md) et [docs/COMPLETE_API_DOCUMENTATION.md](docs/COMPLETE_API_DOCUMENTATION.md).**

## 🧪 Tests

### 📋 Collections Postman
- **[Collection](back/postman/2d10_Complete_API_Collection.postman_collection.json)** — principaux endpoints
- **Configuration** : `baseUrl: http://localhost:3000`
- **Authentification** : Token JWT automatique

### 🔑 Compte de Test
- **Email** : `admin@2d10.com`
- **Mot de passe** : `admin123`

> **📖 Voir le [guide de test complet](back/README.md#-tests) pour plus de détails**

## 🏗️ Architecture

```
2d10/
├── back/           # API Express, Prisma, scripts import D&D 5e
├── front/          # SPA React + TypeScript (Vite)
├── docs/           # Documentation API et guides
├── nginx/          # Config reverse proxy (profil production)
└── README.md
```

## 🛠️ Technologies

### Backend
- **Node.js** + **Express.js** - Serveur API
- **PostgreSQL** - Base de données
- **JWT** - Authentification
- **Axios** - Client HTTP pour Open5e
- **bcryptjs** - Hachage des mots de passe

### Données D&D
- **D&D 5e API** (import batch) + tables Prisma
- **REST** sous `/api/dnd5e`, `/api/dnd-local`, `/api/spells`

## 📚 Documentation

### 📖 Documentation Générale
- **[Documentation Complète](docs/README.md)** - Index de toute la documentation
- **[Backend Documentation](back/README.md)** - Documentation complète du backend
- **[Frontend](front/README.md)** — gabarit Vite + scripts npm

### 🔧 Documentation Technique
- **[API Documentation Complète](docs/COMPLETE_API_DOCUMENTATION.md)** - Référence complète de l'API
- **[Collection Postman](back/postman/2d10_Complete_API_Collection.postman_collection.json)**

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

### Rechercher des sorts (catalogue importé ou local)
```javascript
const imported = await fetch('/api/dnd5e/spells?q=fire&limit=20&page=1', {
  headers: { Authorization: `Bearer ${token}` },
});
const local = await fetch('/api/dnd-local/spells?search=fire&limit=20', {
  headers: { Authorization: `Bearer ${token}` },
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

- **D&D 5e API** - Données SRD utilisées pour les imports
- **Wizards of the Coast** - D&D 5e
- **Communauté D&D** - Inspiration et feedback

## 📞 Support

- **Issues** : Utiliser les GitHub Issues
- **Documentation** : Consulter les fichiers .md
- **API** : Tester avec Postman

---

**🎲 Que l'aventure commence !**

*Créé avec ❤️ pour la communauté D&D*
