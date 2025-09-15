# 🎲 2d10 - D&D Character Management System

Un système complet de gestion de personnages D&D 5e avec intégration API Open5e.

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

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

### Personnages
- `GET /api/characters` - Liste des personnages
- `POST /api/characters` - Créer un personnage
- `PUT /api/characters/:id` - Modifier un personnage

### D&D (Open5e)
- `GET /api/dnd/spells` - Sorts
- `GET /api/dnd/monsters` - Monstres
- `GET /api/dnd/weapons` - Armes
- `GET /api/dnd/armor` - Armures

### D&D (Local)
- `GET /api/dnd-local/spells` - Sorts locaux
- `GET /api/dnd-local/monsters` - Monstres locaux
- `GET /api/dnd-local/items` - Items locaux

### Campagnes
- `GET /api/campaigns` - Liste des campagnes
- `POST /api/campaigns` - Créer une campagne
- `GET /api/campaigns/:id` - Détails d'une campagne
- `POST /api/campaigns/:id/characters` - Ajouter un personnage

### Sessions
- `GET /api/sessions/campaign/:id` - Sessions d'une campagne
- `POST /api/sessions` - Créer une session
- `POST /api/sessions/:id/attendance` - Marquer la présence

### Grimoire
- `GET /api/grimoire/:id` - Grimoire d'un personnage
- `POST /api/grimoire/:id/spells` - Ajouter un sort
- `GET /api/grimoire/:id/search` - Rechercher des sorts
- `POST /api/grimoire/:id/prepare` - Préparer des sorts

> Voir la [documentation complète](./COMPLETE_API_DOCUMENTATION.md) pour tous les endpoints.

## 🧪 Tests

### Avec Postman
1. Importer `2d10_API_Collection.postman_collection.json`
2. Importer `2d10_Environment.postman_environment.json`
3. Suivre le [Guide Postman](./POSTMAN_GUIDE.md)

### Avec curl
```bash
# Connexion
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@2d10.com","password":"admin123"}'

# Recherche de sorts
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd/spells?search=fire"
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
