# 📚 Documentation Complète API 2d10 - D&D Character Management System

**Note :** le préfixe `/api/dnd` (route `dnd-prisma.js`) et les scripts `sync-dnd-*` ont été retirés du dépôt. À jour côté produit : `/api/dnd-local`, `/api/dnd5e`, `/api/spells`. Les sections ci-dessous qui décrivent encore `/api/dnd` sont obsolètes.

## 📋 Table des matières

### 🔐 Authentification
- [Inscription](#inscription)
- [Connexion](#connexion)
- [Profil utilisateur](#profil-utilisateur)
- [Déconnexion](#déconnexion)

### 👑 Administration (Admin seulement)
- [Gestion des utilisateurs](#gestion-des-utilisateurs)
- [Statistiques](#statistiques)

### 🧙‍♂️ Gestion des Personnages
- [CRUD Personnages](#gestion-des-personnages)
- [Statistiques des personnages](#statistiques-des-personnages)

### 🎒 Gestion de l'Inventaire et de la Bourse
- [Inventaire des personnages](#gestion-de-linventaire-et-de-la-bourse)
- [Catalogue d'objets](#catalogue-dobjets)
- [Bourse des personnages](#bourse-des-personnages)

### ⚔️ Gestion des Objets (Admin/GM)
- [CRUD Objets](#gestion-des-objets-admingm)
- [Types d'objets](#types-dobjets)

### 🛡️ Gestion de l'Équipement
- [Équipement des personnages](#gestion-de-léquipement)
- [Slots d'équipement](#slots-déquipement)

### 📖 Gestion du Grimoire
- [Grimoire des personnages](#gestion-du-grimoire)
- [Recherche de sorts](#recherche-de-sorts)
- [Préparation et lancement](#préparation-et-lancement)
- [Statistiques du grimoire](#statistiques-du-grimoire)

### 🏰 Gestion des Campagnes
- [CRUD Campagnes](#gestion-des-campagnes)
- [Personnages de campagne](#personnages-de-campagne)
- [Sessions de jeu](#sessions-de-jeu)
- [Statistiques des campagnes](#statistiques-des-campagnes)

### 🎲 Intégration D&D - API Open5e
- [Sorts](#sorts)
- [Monstres](#monstres)
- [Armes](#armes)
- [Armures](#armures)
- [Races](#races)
- [Classes](#classes)
- [Recherche globale](#recherche-globale)

### 🏠 Données D&D Locales
- [Sorts locaux](#sorts-locaux)
- [Monstres locaux](#monstres-locaux)
- [Armes locales](#armes-locales)
- [Armures locales](#armures-locales)
- [Items locaux](#items-locaux)
- [Recherche globale locale](#recherche-globale-locale)

### 📊 Informations et Statistiques
- [Codes de statut](#codes-de-statut)
- [Rôles](#rôles)
- [Utilisateur par défaut](#utilisateur-par-défaut)
- [Format des données](#format-des-données)

---

## 🔐 Authentification

### Inscription
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user" // optionnel, par défaut "user"
}
```

### Connexion
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Profil utilisateur
```
GET /api/auth/profile
Authorization: Bearer <token>
```

### Déconnexion
```
POST /api/auth/logout
Authorization: Bearer <token>
```

## 👑 Administration (Admin seulement)

### Gestion des utilisateurs

#### Lister tous les utilisateurs
```
GET /api/admin/users
Authorization: Bearer <admin_token>
```

#### Obtenir un utilisateur
```
GET /api/admin/users/:id
Authorization: Bearer <admin_token>
```

#### Créer un utilisateur
```
POST /api/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "new_user",
  "email": "new@example.com",
  "password": "password123",
  "role": "user"
}
```

#### Mettre à jour un utilisateur
```
PUT /api/admin/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "updated_username",
  "email": "updated@example.com",
  "role": "admin",
  "is_active": true
}
```

#### Désactiver un utilisateur
```
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### Statistiques
```
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

## 🧙‍♂️ Gestion des Personnages

### Obtenir tous les personnages
```
GET /api/characters
Authorization: Bearer <token>
```

### Obtenir un personnage
```
GET /api/characters/:id
Authorization: Bearer <token>
```

### Créer un personnage
```
POST /api/characters
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Aragorn",
  "race": "Humain",
  "class": "Rôdeur",
  "level": 5,
  "background": "Ranger du Nord",
  "alignment": "Loyal Bon",
  "experience_points": 6500,
  "hit_points": 45,
  "armor_class": 16,
  "speed": 30,
  "strength": 16,
  "dexterity": 14,
  "constitution": 13,
  "intelligence": 12,
  "wisdom": 15,
  "charisma": 10,
  "description": "Un rôdeur expérimenté des terres du Nord",
  "notes": "Spécialisé dans le combat à l'arc"
}
```

### Mettre à jour un personnage
```
PUT /api/characters/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "level": 6,
  "hit_points": 50,
  "experience_points": 8000
}
```

### Supprimer un personnage
```
DELETE /api/characters/:id
Authorization: Bearer <token>
```

### Statistiques des personnages (Admin/GM seulement)
```
GET /api/characters/stats/overview
Authorization: Bearer <admin_or_gm_token>
```

## 🎒 Gestion de l'Inventaire et de la Bourse

### Obtenir l'inventaire d'un personnage
```
GET /api/inventory/:characterId
Authorization: Bearer <token>
```

### Ajouter un objet à l'inventaire
```
POST /api/inventory/:characterId/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "item_id": 1,
  "quantity": 2,
  "notes": "Objet trouvé dans le donjon"
}
```

### Modifier un objet dans l'inventaire
```
PUT /api/inventory/:characterId/items/:inventoryId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3,
  "is_equipped": true,
  "notes": "Équipé en main droite"
}
```

### Supprimer un objet de l'inventaire
```
DELETE /api/inventory/:characterId/items/:inventoryId
Authorization: Bearer <token>
```

### Obtenir la bourse d'un personnage
```
GET /api/inventory/:characterId/purse
Authorization: Bearer <token>
```

### Modifier la bourse d'un personnage
```
PUT /api/inventory/:characterId/purse
Authorization: Bearer <token>
Content-Type: application/json

{
  "copper_pieces": 50,
  "silver_pieces": 20,
  "gold_pieces": 100,
  "platinum_pieces": 5
}
```

### Obtenir le catalogue d'objets
```
GET /api/inventory/items/catalog?type=Arme&rarity=common&search=épée
Authorization: Bearer <token>
```

## ⚔️ Gestion des Objets (Admin/GM)

### Obtenir tous les objets
```
GET /api/items?type=Arme&rarity=rare&magical=true
Authorization: Bearer <token>
```

### Obtenir un objet par ID
```
GET /api/items/:id
Authorization: Bearer <token>
```

### Créer un nouvel objet (Admin/GM)
```
POST /api/items
Authorization: Bearer <admin_or_gm_token>
Content-Type: application/json

{
  "name": "Épée flamboyante",
  "description": "Une épée qui brille d'une flamme magique",
  "item_type_id": 1,
  "weight": 3.5,
  "value_gold": 500,
  "rarity": "rare",
  "is_magical": true,
  "properties": {"damage": "1d8+1 feu", "bonus": "+1"}
}
```

### Modifier un objet (Admin/GM)
```
PUT /api/items/:id
Authorization: Bearer <admin_or_gm_token>
Content-Type: application/json

{
  "value_gold": 600,
  "properties": {"damage": "1d8+2 feu", "bonus": "+2"}
}
```

### Supprimer un objet (Admin)
```
DELETE /api/items/:id
Authorization: Bearer <admin_token>
```

### Obtenir les types d'objets
```
GET /api/items/types
Authorization: Bearer <token>
```

### Créer un type d'objet (Admin)
```
POST /api/items/types
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Instrument",
  "description": "Instruments de musique"
}
```

## 🛡️ Gestion de l'Équipement

### Obtenir l'équipement d'un personnage
```
GET /api/equipment/:characterId
Authorization: Bearer <token>
```

### Équiper un objet
```
POST /api/equipment/:characterId/equip
Authorization: Bearer <token>
Content-Type: application/json

{
  "inventory_id": 1,
  "equipment_slot_id": 1
}
```

### Déséquiper un objet
```
POST /api/equipment/:characterId/unequip
Authorization: Bearer <token>
Content-Type: application/json

{
  "inventory_id": 1
}
```

### Obtenir les slots d'équipement disponibles
```
GET /api/equipment/slots/available
Authorization: Bearer <token>
```

## 📖 Gestion du Grimoire

### Obtenir le grimoire d'un personnage
```
GET /api/grimoire/:characterId
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `level` (optionnel) : Filtrer par niveau de sort
- `school` (optionnel) : Filtrer par école de magie
- `prepared_only` (optionnel) : Afficher seulement les sorts préparés
- `known_only` (optionnel) : Afficher seulement les sorts connus

**Exemple :**
```bash
GET /api/grimoire/1?level=3&school=evocation&prepared_only=true
```

### Ajouter un sort au grimoire
```
POST /api/grimoire/:characterId/spells
Authorization: Bearer <token>
Content-Type: application/json

{
  "spell_slug": "fireball",
  "spell_name": "Fireball",
  "spell_level": 3,
  "spell_school": "evocation",
  "is_prepared": false,
  "is_known": true,
  "notes": "Sort appris au niveau 5"
}
```

### Modifier un sort dans le grimoire
```
PUT /api/grimoire/:characterId/spells/:spellId
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_prepared": true,
  "is_known": true,
  "times_prepared": 2,
  "times_cast": 5,
  "notes": "Sort favori du personnage"
}
```

### Supprimer un sort du grimoire
```
DELETE /api/grimoire/:characterId/spells/:spellId
Authorization: Bearer <token>
```

### Préparer des sorts (classes préparatrices)
```
POST /api/grimoire/:characterId/prepare
Authorization: Bearer <token>
Content-Type: application/json

{
  "spell_ids": [1, 3, 5, 7]
}
```

### Lancer un sort (incrémenter le compteur)
```
POST /api/grimoire/:characterId/cast/:spellId
Authorization: Bearer <token>
```

### Rechercher des sorts à ajouter
```
GET /api/grimoire/:characterId/search?q=fire&level=3&school=evocation&limit=10
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `q` (requis) : Terme de recherche
- `level` (optionnel) : Niveau du sort
- `school` (optionnel) : École de magie
- `limit` (optionnel) : Nombre de résultats (défaut: 20)

### Obtenir les statistiques du grimoire
```
GET /api/grimoire/:characterId/stats
Authorization: Bearer <token>
```

**Réponse inclut :**
- Statistiques par niveau de sort
- Statistiques par école de magie
- Nombre total de sorts, sorts préparés, sorts connus
- Nombre total de lancements

## 🏰 Gestion des Campagnes

### Obtenir toutes les campagnes
```
GET /api/campaigns
Authorization: Bearer <token>
```

**Réponse :**
- **Admin** : Voit toutes les campagnes
- **GM** : Voit seulement ses campagnes

### Obtenir une campagne par ID
```
GET /api/campaigns/:id
Authorization: Bearer <token>
```

**Réponse inclut :**
- Informations de la campagne
- Liste des personnages participants
- Liste des sessions de jeu

### Créer une campagne (GM/Admin)
```
POST /api/campaigns
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "name": "La Quête du Dragon Perdu",
  "description": "Une aventure épique dans les terres sauvages",
  "setting": "Forgotten Realms",
  "max_players": 4,
  "start_date": "2025-01-01",
  "notes": "Campagne pour débutants"
}
```

### Modifier une campagne (GM/Admin)
```
PUT /api/campaigns/:id
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "name": "La Quête du Dragon Perdu - Édition Étendue",
  "description": "Une aventure épique dans les terres sauvages avec de nouveaux défis",
  "status": "active",
  "max_players": 6
}
```

### Supprimer une campagne (GM/Admin)
```
DELETE /api/campaigns/:id
Authorization: Bearer <gm_or_admin_token>
```

## Personnages de campagne

### Ajouter un personnage à une campagne
```
POST /api/campaigns/:campaignId/characters
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "character_id": 1,
  "notes": "Magicien puissant spécialisé en divination"
}
```

### Retirer un personnage d'une campagne
```
DELETE /api/campaigns/:campaignId/characters/:characterId
Authorization: Bearer <gm_or_admin_token>
```

## Sessions de jeu

### Obtenir toutes les sessions d'une campagne
```
GET /api/sessions/campaign/:campaignId
Authorization: Bearer <token>
```

### Obtenir une session par ID
```
GET /api/sessions/:id
Authorization: Bearer <token>
```

### Créer une session (GM/Admin)
```
POST /api/sessions
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "campaign_id": 1,
  "session_number": 1,
  "title": "Le Commencement de l'Aventure",
  "description": "Première session où les héros se rencontrent",
  "session_date": "2025-01-15",
  "start_time": "19:00",
  "end_time": "23:00",
  "location": "Table de jeu principale",
  "notes": "Session d'introduction",
  "xp_awarded": 100,
  "gold_awarded": 50.0
}
```

### Modifier une session (GM/Admin)
```
PUT /api/sessions/:id
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "title": "Le Commencement de l'Aventure - Session Étendue",
  "description": "Première session où les héros se rencontrent et découvrent leur destin",
  "xp_awarded": 150,
  "gold_awarded": 75.0,
  "notes": "Session d'introduction avec combat d'initiation"
}
```

### Supprimer une session (GM/Admin)
```
DELETE /api/sessions/:id
Authorization: Bearer <gm_or_admin_token>
```

### Marquer la présence à une session
```
POST /api/sessions/:id/attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "character_id": 1,
  "attended": true,
  "xp_earned": 100,
  "gold_earned": 50.0,
  "notes": "Présent toute la session"
}
```

### Modifier la présence à une session
```
PUT /api/sessions/:id/attendance/:characterId
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "attended": true,
  "xp_earned": 120,
  "gold_earned": 60.0,
  "notes": "Présent avec bonus de participation"
}
```

## Statistiques des campagnes

### Obtenir les statistiques des campagnes (GM/Admin)
```
GET /api/campaigns/stats/overview
Authorization: Bearer <gm_or_admin_token>
```

**Réponse inclut :**
- Nombre total de campagnes
- Campagnes actives/inactives
- Nombre moyen de joueurs par campagne
- Statistiques des sessions

## 🎲 Intégration D&D - API Open5e

> **Note :** Toutes les routes D&D nécessitent une authentification via token JWT :
> ```
> Authorization: Bearer <token>
> ```

### Base URL
```
/api/dnd
```

## Sorts

### Obtenir tous les sorts
```
GET /api/dnd/spells
```

**Paramètres de requête :**
- `level` (optionnel) : Niveau du sort (1-9)
- `school` (optionnel) : École de magie
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

**Exemple :**
```bash
GET /api/dnd/spells?level=3&school=evocation&search=fire&limit=10
```

### Obtenir un sort par ID
```
GET /api/dnd/spells/:id
```

**Exemple :**
```bash
GET /api/dnd/spells/fireball
```

## Monstres

### Obtenir tous les monstres
```
GET /api/dnd/monsters
```

**Paramètres de requête :**
- `challenge_rating` (optionnel) : Indice de dangerosité
- `type` (optionnel) : Type de créature
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

**Exemple :**
```bash
GET /api/dnd/monsters?challenge_rating=5&type=dragon&search=red
```

### Obtenir un monstre par ID
```
GET /api/dnd/monsters/:id
```

**Exemple :**
```bash
GET /api/dnd/monsters/ancient-red-dragon
```

## Armes

### Obtenir toutes les armes
```
GET /api/dnd/weapons
```

**Paramètres de requête :**
- `category` (optionnel) : Catégorie d'arme
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

**Exemple :**
```bash
GET /api/dnd/weapons?category=melee&search=sword
```

### Obtenir une arme par ID
```
GET /api/dnd/weapons/:id
```

**Exemple :**
```bash
GET /api/dnd/weapons/longsword
```

## Armures

### Obtenir toutes les armures
```
GET /api/dnd/armor
```

**Paramètres de requête :**
- `armor_category` (optionnel) : Catégorie d'armure
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

**Exemple :**
```bash
GET /api/dnd/armor?armor_category=heavy&search=plate
```

### Obtenir une armure par ID
```
GET /api/dnd/armor/:id
```

**Exemple :**
```bash
GET /api/dnd/armor/plate-armor
```

## Races

### Obtenir toutes les races
```
GET /api/dnd/races
```

**Paramètres de requête :**
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

**Exemple :**
```bash
GET /api/dnd/races?search=elf
```

### Obtenir une race par ID
```
GET /api/dnd/races/:id
```

**Exemple :**
```bash
GET /api/dnd/races/high-elf
```

## Classes

### Obtenir toutes les classes
```
GET /api/dnd/classes
```

**Paramètres de requête :**
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

**Exemple :**
```bash
GET /api/dnd/classes?search=wizard
```

### Obtenir une classe par ID
```
GET /api/dnd/classes/:id
```

**Exemple :**
```bash
GET /api/dnd/classes/wizard
```

## Recherche globale

### Rechercher dans toutes les catégories
```
GET /api/dnd/search
```

**Paramètres de requête :**
- `q` (requis) : Terme de recherche
- `types` (optionnel) : Types à rechercher (séparés par des virgules)

**Exemple :**
```bash
GET /api/dnd/search?q=fire&types=spells,monsters,weapons
```

## Informations API

### Obtenir les informations sur l'API Open5e
```
GET /api/dnd/info
```

## 🏠 Données D&D Locales

> **Note :** Ces routes accèdent aux données D&D synchronisées localement pour des performances optimales.

### Base URL
```
/api/dnd-local
```

## Sorts locaux

### Obtenir tous les sorts locaux
```
GET /api/dnd-local/spells
```

**Paramètres de requête :**
- `level` (optionnel) : Niveau du sort (1-9)
- `school` (optionnel) : École de magie
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

### Obtenir un sort local par slug
```
GET /api/dnd-local/spells/:slug
```

## Monstres locaux

### Obtenir tous les monstres locaux
```
GET /api/dnd-local/monsters
```

**Paramètres de requête :**
- `challenge_rating` (optionnel) : Indice de dangerosité
- `type` (optionnel) : Type de créature
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

### Obtenir un monstre local par slug
```
GET /api/dnd-local/monsters/:slug
```

## Armes locales

### Obtenir toutes les armes locales
```
GET /api/dnd-local/weapons
```

**Paramètres de requête :**
- `category` (optionnel) : Catégorie d'arme
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

### Obtenir une arme locale par slug
```
GET /api/dnd-local/weapons/:slug
```

## Armures locales

### Obtenir toutes les armures locales
```
GET /api/dnd-local/armor
```

**Paramètres de requête :**
- `armor_category` (optionnel) : Catégorie d'armure
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

### Obtenir une armure locale par slug
```
GET /api/dnd-local/armor/:slug
```

## Items locaux

### Obtenir tous les items locaux
```
GET /api/dnd-local/items
```

**Paramètres de requête :**
- `category` (optionnel) : Catégorie d'item
- `rarity` (optionnel) : Rareté de l'item
- `search` (optionnel) : Recherche par nom
- `limit` (optionnel) : Nombre de résultats (défaut: 20)
- `page` (optionnel) : Page (défaut: 1)

### Obtenir un item local par slug
```
GET /api/dnd-local/items/:slug
```

## Recherche globale locale

### Rechercher dans toutes les catégories locales
```
GET /api/dnd-local/search
```

**Paramètres de requête :**
- `q` (requis) : Terme de recherche
- `types` (optionnel) : Types à rechercher (séparés par des virgules)

**Exemple :**
```bash
GET /api/dnd-local/search?q=magic&types=spells,items
```

### Statistiques des données locales
```
GET /api/dnd-local/stats
```

## 📊 Format des données

### Format de réponse standard
```json
{
  "success": true,
  "data": [...],
  "count": 25,
  "next": "https://api.open5e.com/v2/spells/?page=2",
  "previous": null
}
```

### Format de réponse pour un élément unique
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

### Format de réponse d'erreur
```json
{
  "success": false,
  "error": "Description de l'erreur"
}
```

### Exemple de Campagne
```json
{
  "success": true,
  "campaign": {
    "id": 1,
    "gm_id": 4,
    "name": "La Quête du Dragon Perdu",
    "description": "Une aventure épique dans les terres sauvages",
    "setting": "Forgotten Realms",
    "max_players": 4,
    "current_players": 2,
    "status": "active",
    "start_date": "2025-01-01",
    "end_date": null,
    "notes": "Campagne pour débutants",
    "is_active": true,
    "created_at": "2025-01-01T10:00:00.000Z",
    "updated_at": "2025-01-01T10:00:00.000Z",
    "gm_username": "admin",
    "gm_email": "admin@2d10.com",
    "characters": [
      {
        "id": 1,
        "campaign_id": 1,
        "character_id": 2,
        "joined_at": "2025-01-01T10:30:00.000Z",
        "left_at": null,
        "status": "active",
        "notes": "Magicien puissant spécialisé en divination",
        "is_active": true,
        "character_name": "Gandalf le Gris",
        "class": "Magicien",
        "level": 5,
        "race": "Humain",
        "player_username": "testplayer"
      }
    ],
    "sessions": [
      {
        "id": 1,
        "campaign_id": 1,
        "session_number": 1,
        "title": "Le Commencement de l'Aventure",
        "description": "Première session où les héros se rencontrent",
        "session_date": "2025-01-15",
        "start_time": "19:00",
        "end_time": "23:00",
        "location": "Table de jeu principale",
        "notes": "Session d'introduction",
        "xp_awarded": 100,
        "gold_awarded": 50.0,
        "is_active": true,
        "created_at": "2025-01-15T18:00:00.000Z"
      }
    ]
  }
}
```

### Exemple de Session
```json
{
  "success": true,
  "session": {
    "id": 1,
    "campaign_id": 1,
    "session_number": 1,
    "title": "Le Commencement de l'Aventure",
    "description": "Première session où les héros se rencontrent",
    "session_date": "2025-01-15",
    "start_time": "19:00",
    "end_time": "23:00",
    "location": "Table de jeu principale",
    "notes": "Session d'introduction",
    "xp_awarded": 100,
    "gold_awarded": 50.0,
    "is_active": true,
    "created_at": "2025-01-15T18:00:00.000Z",
    "updated_at": "2025-01-15T18:00:00.000Z",
    "attendance": [
      {
        "id": 1,
        "session_id": 1,
        "character_id": 1,
        "attended": true,
        "xp_earned": 100,
        "gold_earned": 50.0,
        "notes": "Présent toute la session",
        "created_at": "2025-01-15T19:00:00.000Z"
      }
    ]
  }
}
```

### Exemple de Grimoire
```json
{
  "success": true,
  "grimoire": [
    {
      "id": 1,
      "character_id": 1,
      "spell_id": 1333,
      "spell_slug": "srd_burning-hands",
      "spell_name": "Burning Hands",
      "spell_level": 1,
      "spell_school": "Evocation",
      "is_prepared": true,
      "is_known": true,
      "times_prepared": 3,
      "times_cast": 8,
      "notes": "Sort de base du magicien",
      "learned_at": "2025-01-01T10:00:00.000Z",
      "created_at": "2025-01-01T10:00:00.000Z",
      "updated_at": "2025-01-15T18:00:00.000Z",
      "description": "As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips...",
      "casting_time": "action",
      "range": "Self",
      "components": "V, S",
      "duration": "instantaneous",
      "higher_level": null,
      "ritual": false,
      "concentration": false
    }
  ],
  "stats": {
    "total_spells": 5,
    "prepared_spells": 3,
    "known_spells": 5,
    "spells_by_level": {
      "1": 3,
      "2": 2
    },
    "spells_by_school": {
      "Evocation": 3,
      "Abjuration": 2
    }
  }
}
```

### Exemple de Recherche de Sorts
```json
{
  "success": true,
  "spells": [
    {
      "id": 1333,
      "slug": "srd_burning-hands",
      "name": "Burning Hands",
      "level": 1,
      "school": "Evocation",
      "casting_time": "action",
      "range": "Self",
      "components": "V, S",
      "duration": "instantaneous",
      "description": "As you hold your hands with thumbs touching and fingers spread...",
      "in_grimoire": true,
      "is_prepared": true,
      "is_known": true
    }
  ],
  "count": 1
}
```

## 🛡️ Gestion de l'Équipement

### Propriétés des Armes et Armures

#### Armes
- **damage_dice** : Dés de dégâts (ex: "1d8", "2d6")
- **damage_type** : Type de dégâts (Tranchant, Perforant, Contondant, Feu, etc.)
- **weapon_range** : Portée en mètres
- **weapon_type** : Type d'arme (Mêlée, Distance, Lancé)

#### Armures
- **armor_class_bonus** : Bonus à la classe d'armure
- **armor_type** : Type d'armure (Légère, Intermédiaire, Lourde)
- **stealth_disadvantage** : Désavantage en discrétion

### Slots d'équipement
- **Main droite** : Arme principale
- **Main gauche** : Arme secondaire ou bouclier
- **Armure** : Protection corporelle
- **Casque** : Protection de la tête
- **Bottes** : Chaussures
- **Gants** : Gants et mitaines
- **Anneau 1/2** : Anneaux magiques
- **Amulette** : Collier et amulette
- **Cape** : Cape et manteau
- **Sac** : Sac à dos et contenants

## 📊 Codes de statut

- `200` : Succès
- `201` : Créé avec succès
- `400` : Erreur de validation
- `401` : Non authentifié
- `403` : Accès refusé (rôle insuffisant)
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## 👥 Rôles

- **user** : Utilisateur standard (peut gérer ses propres personnages)
- **gm** : Game Master (peut voir tous les personnages)
- **admin** : Administrateur avec tous les privilèges

## 🔑 Utilisateur par défaut

Un utilisateur admin est créé automatiquement :
- **Email :** admin@2d10.com
- **Mot de passe :** admin123
- **Rôle :** admin

---

## 🚀 Exemples d'utilisation

### Rechercher des sorts de niveau 3
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd/spells?level=3"
```

### Rechercher des dragons
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd/monsters?search=dragon"
```

### Recherche globale
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd/search?q=magic&types=spells,items"
```

### Recherche dans les données locales
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd-local/search?q=fire&types=spells,weapons"
```

### Créer une campagne
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "La Quête du Dragon Perdu",
    "description": "Une aventure épique",
    "setting": "Forgotten Realms",
    "max_players": 4
  }'
```

### Ajouter un personnage à une campagne
```bash
curl -X POST http://localhost:3000/api/campaigns/1/characters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 1,
    "notes": "Magicien puissant"
  }'
```

### Créer une session de jeu
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "session_number": 1,
    "title": "Le Commencement de l'\''Aventure",
    "session_date": "2025-01-15",
    "xp_awarded": 100
  }'
```

### Ajouter un sort au grimoire
```bash
curl -X POST http://localhost:3000/api/grimoire/1/spells \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "spell_slug": "fireball",
    "spell_name": "Fireball",
    "spell_level": 3,
    "spell_school": "evocation",
    "is_prepared": true,
    "notes": "Sort appris au niveau 5"
  }'
```

### Rechercher des sorts pour le grimoire
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/grimoire/1/search?q=fire&level=3&limit=5"
```

### Préparer des sorts
```bash
curl -X POST http://localhost:3000/api/grimoire/1/prepare \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "spell_ids": [1, 3, 5, 7]
  }'
```

---

**🎲 Bon jeu et que les dés soient avec vous !**
