# 🎲 2d10 - D&D Character Management System

Une application complète de gestion de personnages D&D 5e avec intégration de l'API Open5e pour accéder aux données officielles du jeu.

## 📋 Sommaire

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Installation](#-installation)
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

### Option 1 : Installation Automatique
```bash
cd back/
chmod +x install.sh
./install.sh
```

### Option 2 : Installation Manuelle
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

## 📡 API Endpoints

L'API 2d10 propose **63 endpoints** organisés en 11 catégories principales :

### 🔐 Authentification (3 endpoints)
- Inscription, connexion, profil utilisateur

### 👑 Administration (2 endpoints)
- Gestion des utilisateurs et statistiques

### 🧙‍♂️ Personnages (6 endpoints)
- CRUD complet des personnages + statistiques

### 🎒 Inventaire et Bourse (6 endpoints)
- Gestion de l'inventaire et de la bourse

### ⚔️ Objets et Équipement (6 endpoints)
- Catalogue d'objets et système d'équipement

### 📖 Grimoire des Sorts (8 endpoints)
- Gestion complète des sorts et grimoire

### 🏰 Campagnes (8 endpoints)
- CRUD des campagnes + gestion des personnages

### 🎲 Sessions de Jeu (7 endpoints)
- Gestion des sessions et présence

### 🎲 D&D (13 endpoints)
- API externe Open5e + base locale

### 🔧 Utilitaires (2 endpoints)
- Informations API et santé

> **📖 Voir la [documentation complète des endpoints](back/README.md#-api-endpoints) pour tous les détails**

## 🧪 Tests

### 📋 Collections Postman
- **[Collection Complète](back/2d10_Complete_API_Collection.postman_collection.json)** - Tous les endpoints (63 routes)
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
│   ├── *.postman_*.json    # Collections Postman
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
- **[Backend Documentation](back/README.md)** - Documentation complète du backend
- **[Frontend Documentation](front/README.md)** - Documentation du frontend (à venir)

### 🔧 Documentation Technique
- **[API Documentation Complète](back/COMPLETE_API_DOCUMENTATION.md)** - Référence complète de l'API
- **[Collection Postman](back/2d10_Complete_API_Collection.postman_collection.json)** - Collection de test complète

### 🎲 Guides Spécialisés
- **[Guide d'intégration D&D](back/README_DND_INTEGRATION.md)** - Guide d'utilisation des fonctionnalités D&D
- **[Guide Postman](back/POSTMAN_GUIDE.md)** - Guide d'utilisation Postman

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
