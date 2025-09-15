# 🎲 2d10 - D&D Character Management System

Une application complète de gestion de personnages D&D 5e avec intégration de l'API Open5e pour accéder aux données officielles du jeu.

## ✨ Fonctionnalités

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

### 🔐 Authentification et Administration
- Système d'authentification JWT sécurisé
- Gestion des rôles (User, GM, Admin)
- Panel d'administration complet
- Statistiques globales

### 🌟 Intégration D&D 5e (Nouveau !)
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

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur
- `POST /api/auth/logout` - Déconnexion

### Personnages
- `GET /api/characters` - Liste des personnages
- `POST /api/characters` - Créer un personnage
- `GET /api/characters/:id` - Détails d'un personnage
- `PUT /api/characters/:id` - Modifier un personnage
- `DELETE /api/characters/:id` - Supprimer un personnage

### Inventaire
- `GET /api/inventory/:characterId` - Inventaire d'un personnage
- `POST /api/inventory/:characterId/items` - Ajouter un objet
- `PUT /api/inventory/:characterId/items/:id` - Modifier un objet
- `DELETE /api/inventory/:characterId/items/:id` - Supprimer un objet

### Équipement
- `GET /api/equipment/:characterId` - Équipement d'un personnage
- `POST /api/equipment/:characterId/equip` - Équiper un objet
- `POST /api/equipment/:characterId/unequip` - Déséquiper un objet

### D&D Data (Nouveau !)
- `GET /api/dnd/spells` - Sorts D&D
- `GET /api/dnd/monsters` - Monstres D&D
- `GET /api/dnd/weapons` - Armes D&D
- `GET /api/dnd/armor` - Armures D&D
- `GET /api/dnd/races` - Races D&D
- `GET /api/dnd/classes` - Classes D&D
- `GET /api/dnd/search` - Recherche globale

## 🧪 Tests avec Postman

### Collections Disponibles
1. **2d10_API_Collection.postman_collection.json** - API principale
2. **DND_Postman_Collection.json** - Routes D&D spécifiques

### Configuration
1. Importer les collections dans Postman
2. Configurer l'environnement :
   - `baseUrl`: `http://localhost:3000`
   - `authToken`: Token JWT (récupéré via login)

### Compte de Test
- **Email** : `admin@2d10.com`
- **Mot de passe** : `admin123`

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

- [API Documentation](back/API_DOCUMENTATION.md) - Documentation API principale
- [D&D Integration](back/README_DND_INTEGRATION.md) - Guide d'intégration D&D
- [D&D API Reference](back/DND_API_DOCUMENTATION.md) - Référence API D&D
- [Postman Guide](back/POSTMAN_GUIDE.md) - Guide d'utilisation Postman

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
