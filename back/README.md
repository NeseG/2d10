# 🎲 2d10 - D&D Character Management System

Un système complet de gestion de personnages D&D 5e avec intégration API Open5e.

## 📋 Sommaire

### 📖 Documentation
- [Documentation](#-documentation)
- [Installation Rapide](#-installation-rapide)

### ✨ Fonctionnalités
- [Gestion des Personnages](#️-gestion-des-personnages)
- [Inventaire et Équipement](#-inventaire-et-équipement)
- [Grimoire des Sorts](#-grimoire-des-sorts)
- [Intégration D&D](#-intégration-dd)
- [Gestion de Campagnes](#-gestion-de-campagnes)
- [Administration](#-administration)

### 🔧 Technique
- [Technologies](#-technologies)
- [API Endpoints](#-api-endpoints)
  - [Authentification](#-authentification)
  - [Administration (Admin seulement)](#-administration-admin-seulement)
  - [Personnages](#️-personnages)
  - [Inventaire et Bourse](#-inventaire-et-bourse)
  - [Objets et Équipement](#️-objets-et-équipement)
  - [Grimoire des Sorts](#-grimoire-des-sorts-1)
  - [Campagnes](#-campagnes)
  - [Sessions de Jeu](#-sessions-de-jeu)
  - [D&D (API Externe - Open5e)](#-dd-api-externe---open5e)
  - [D&D (Base Locale)](#-dd-base-locale)
  - [Utilitaires](#-utilitaires)

### 🧪 Tests et Utilisation
- [Tests](#-tests)
- [Exemples d'Utilisation](#-exemples-dutilisation)
- [Contribution](#-contribution)
- [Support](#-support)

---

## 📚 Documentation

- **[Documentation API Complète](./COMPLETE_API_DOCUMENTATION.md)** - Référence complète de l'API
- **[Guide d'intégration D&D](./README_DND_INTEGRATION.md)** - Guide d'utilisation des fonctionnalités D&D
- **[Guide Postman](./POSTMAN_GUIDE.md)** - Guide de test avec Postman

## 🚀 Installation Rapide

```bash
# Cloner le repository
git clone https://github.com/NeseG/2d10.git
cd 2d10/back

# Installation automatique
chmod +x install.sh
./install.sh

# Démarrer l'application
npm start
```

## ✨ Fonctionnalités

### 🧙‍♂️ Gestion des Personnages
- Création et gestion de personnages D&D 5e
- Système de niveaux et d'expérience
- Statistiques complètes (FOR, DEX, CON, INT, SAG, CHA)

### 🎒 Inventaire et Équipement
- Gestion complète de l'inventaire
- Système d'équipement avec slots
- Bourse avec différentes monnaies
- Catalogue d'objets magiques et non-magiques

### 📖 Grimoire des Sorts
- Gestion des sorts connus et préparés
- Recherche et ajout de sorts depuis la base D&D
- Système de préparation pour les classes préparatrices
- Suivi des lancements et statistiques
- Notes personnelles sur les sorts

### 🎲 Intégration D&D
- **API Open5e** : Accès en temps réel aux données D&D officielles
- **Données locales** : Synchronisation pour des performances optimales
- Sorts, monstres, armes, armures, races, classes
- Recherche avancée et filtres

### 🏰 Gestion de Campagnes
- Création et gestion de campagnes
- Attribution de personnages aux campagnes
- Sessions de jeu et suivi des parties
- Gestion de la présence aux sessions
- Attribution d'XP et de récompenses
- Statistiques des campagnes

### 👑 Administration
- Gestion des utilisateurs et rôles
- Statistiques et monitoring
- Interface admin complète

## 🔧 Technologies

- **Backend** : Node.js, Express.js
- **Base de données** : PostgreSQL
- **Authentification** : JWT
- **API externe** : Open5e API
- **Documentation** : Markdown

## 📡 API Endpoints

### 🔐 Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

### 👑 Administration (Admin seulement)
- `GET /api/admin/users` - Liste des utilisateurs
- `GET /api/admin/stats` - Statistiques générales

### 🧙‍♂️ Personnages
- `GET /api/characters` - Liste des personnages
- `POST /api/characters` - Créer un personnage
- `GET /api/characters/:id` - Détails d'un personnage
- `PUT /api/characters/:id` - Modifier un personnage
- `DELETE /api/characters/:id` - Supprimer un personnage
- `GET /api/characters/stats` - Statistiques des personnages

### 🎒 Inventaire et Bourse
- `GET /api/inventory/:id` - Inventaire d'un personnage
- `POST /api/inventory/:id/items` - Ajouter un objet
- `PUT /api/inventory/:id/items/:itemId` - Modifier un objet
- `DELETE /api/inventory/:id/items/:itemId` - Supprimer un objet
- `GET /api/purse/:id` - Bourse d'un personnage
- `POST /api/purse/:id/add` - Ajouter de l'argent
- `POST /api/purse/:id/spend` - Dépenser de l'argent

### ⚔️ Objets et Équipement
- `GET /api/items` - Catalogue d'objets
- `POST /api/items` - Créer un objet (Admin/GM)
- `PUT /api/items/:id` - Modifier un objet (Admin/GM)
- `DELETE /api/items/:id` - Supprimer un objet (Admin/GM)
- `GET /api/equipment/:id` - Équipement d'un personnage
- `POST /api/equipment/:id/equip` - Équiper un objet
- `POST /api/equipment/:id/unequip` - Déséquiper un objet

### 📖 Grimoire des Sorts
- `GET /api/grimoire/:id` - Grimoire d'un personnage
- `POST /api/grimoire/:id/spells` - Ajouter un sort
- `PUT /api/grimoire/:id/spells/:spellId` - Modifier un sort
- `DELETE /api/grimoire/:id/spells/:spellId` - Supprimer un sort
- `GET /api/grimoire/:id/search` - Rechercher des sorts
- `POST /api/grimoire/:id/prepare` - Préparer des sorts
- `POST /api/grimoire/:id/cast/:spellId` - Lancer un sort
- `GET /api/grimoire/:id/stats` - Statistiques du grimoire

### 🏰 Campagnes
- `GET /api/campaigns` - Liste des campagnes
- `POST /api/campaigns` - Créer une campagne
- `GET /api/campaigns/:id` - Détails d'une campagne
- `PUT /api/campaigns/:id` - Modifier une campagne
- `DELETE /api/campaigns/:id` - Supprimer une campagne
- `POST /api/campaigns/:id/characters` - Ajouter un personnage
- `DELETE /api/campaigns/:id/characters/:charId` - Retirer un personnage
- `GET /api/campaigns/:id/stats` - Statistiques d'une campagne

### 🎲 Sessions de Jeu
- `GET /api/sessions/campaign/:id` - Sessions d'une campagne
- `POST /api/sessions` - Créer une session
- `GET /api/sessions/:id` - Détails d'une session
- `PUT /api/sessions/:id` - Modifier une session
- `DELETE /api/sessions/:id` - Supprimer une session
- `POST /api/sessions/:id/attendance` - Marquer la présence
- `PUT /api/sessions/:id/attendance/:charId` - Modifier la présence

### 🎲 D&D (Base locale + import 5e)
- `GET /api/dnd5e/equipment` — Équipement D&D 5e importé (pagination)
- `GET /api/dnd5e/spells` — Sorts D&D 5e importés (pagination)

### 🎲 D&D (Base locale — tables Prisma)
- `GET /api/dnd-local/spells` - Sorts locaux
- `GET /api/dnd-local/monsters` - Monstres locaux
- `GET /api/dnd-local/weapons` - Armes locales
- `GET /api/dnd-local/armor` - Armures locales
- `GET /api/dnd-local/races` - Races locales
- `GET /api/dnd-local/classes` - Classes locales
- `GET /api/dnd-local/search` - Recherche globale

### 🔧 Utilitaires
- `GET /` - Informations de l'API
- `GET /health` - État de santé de l'API

> Voir la [documentation complète](./COMPLETE_API_DOCUMENTATION.md) pour tous les endpoints.

## 🧪 Tests

### Avec Postman
1. Importer `2d10_Complete_API_Collection.postman_collection.json`
2. Configurer les variables d'environnement :
   - `baseUrl` : `http://localhost:3000`
   - `authToken` : (sera automatiquement rempli après login)
3. Commencer par la requête "Login" pour obtenir un token
4. Toutes les autres requêtes utiliseront automatiquement le token

### Avec curl
```bash
# Connexion
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@2d10.com","password":"admin123"}'

# Recherche de sorts (local)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd-local/spells?search=fire&limit=10"
```

## 🔑 Utilisateur par défaut

- **Email** : admin@2d10.com
- **Mot de passe** : admin123
- **Rôle** : admin

## 📊 Exemples de données

### Sort
```json
{
  "name": "Fireball",
  "level": 3,
  "school": "evocation",
  "casting_time": "1 action",
  "range": "150 feet",
  "components": "V, S, M",
  "duration": "Instantaneous"
}
```

### Personnage
```json
{
  "name": "Aragorn",
  "race": "Humain",
  "class": "Rôdeur",
  "level": 5,
  "hit_points": 45,
  "armor_class": 16
}
```

### Campagne
```json
{
  "name": "La Quête du Dragon Perdu",
  "description": "Une aventure épique dans les terres sauvages",
  "setting": "Forgotten Realms",
  "max_players": 4,
  "current_players": 2,
  "status": "active"
}
```

### Grimoire
```json
{
  "spell_name": "Fireball",
  "spell_level": 3,
  "spell_school": "evocation",
  "is_prepared": true,
  "is_known": true,
  "times_cast": 5,
  "notes": "Sort favori du magicien"
}
```

## 🤝 Contribution

1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

- **Documentation** : [Documentation complète](./COMPLETE_API_DOCUMENTATION.md)
- **Issues** : [GitHub Issues](https://github.com/NeseG/2d10/issues)
- **API Open5e** : [Documentation officielle](https://open5e.com/api-docs)

---

**🎲 Bon jeu et que les dés soient avec vous !**
