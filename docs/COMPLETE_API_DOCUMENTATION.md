# 📚 Documentation Complète API 2d10 - D&D Character Management System

**Note :** le préfixe `/api/dnd` (proxy Open5e) n’existe plus. Référence à jour : **`/api/dnd-local`**, **`/api/dnd5e`**, **`/api/spells`**. Les données SRD importées sont chargées via les scripts `import-dnd5e-*` (voir [`README_DND_INTEGRATION.md`](./README_DND_INTEGRATION.md)).

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
- [Traits et capacités](#traits-et-capacités)

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
- [Chat de session live](#chat-de-session-live)
- [Statistiques des campagnes](#statistiques-des-campagnes)

### 🎲 Données D&D 5e importées (`/api/dnd5e`)
- [Équipement importé](#équipement-importé-dnd5e)
- [Objets magiques importés](#objets-magiques-importés-dnd5e)
- [Sorts importés (catalogue)](#sorts-importés-catalogue-dnd5e)
- [Copie vers personnage (admin/gm)](#copie-vers-personnage-admingm)

### ✨ Sorts applicatifs (`/api/spells`)
- [Liste et détail](#sorts-applicatifs-api-spells)
- [Création / mise à jour](#création-et-mise-à-jour-de-sort)

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

### Traits et capacités

Routes sous `/api/characters/:id/features` — traits affichés sur la fiche (onglet « Traits »).

`category` (obligatoire à la création) doit être l’une des valeurs :  
`CLASS_FEATURE`, `RACIAL_TRAIT`, `FEAT`, `PERSONALITY_AND_BACKGROUND`, `OTHER_PROFICIENCIES_AND_LANGUAGES`.

```
GET /api/characters/:id/features
Authorization: Bearer <token>
```

```
POST /api/characters/:id/features
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "CLASS_FEATURE",
  "name": "Action supplémentaire",
  "description": "Une fois par combat, tu peux…"
}
```

```
PUT /api/characters/:id/features/:featureId
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "CLASS_FEATURE",
  "name": "Action supplémentaire (mise à jour)",
  "description": "…"
}
```

```
DELETE /api/characters/:id/features/:featureId
Authorization: Bearer <token>
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
GET /api/purse/:characterId
Authorization: Bearer <token>
```

Réponse typique : `success`, `purse` (pièces en snake_case), `total_gold_value`.

### Remplacer les montants de la bourse
```
PUT /api/purse/:characterId
Authorization: Bearer <token>
Content-Type: application/json

{
  "copper": 50,
  "silver": 20,
  "electrum": 0,
  "gold": 100,
  "platinum": 5
}
```

### Ajouter ou retirer des pièces
```
POST /api/purse/:characterId/add
POST /api/purse/:characterId/remove
Authorization: Bearer <token>
Content-Type: application/json

{
  "copper": 10,
  "silver": 0,
  "electrum": 0,
  "gold": 0,
  "platinum": 0,
  "reason": "Butin de session"
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
  "spell_id": 42,
  "is_prepared": false,
  "is_known": true,
  "notes": "Référence un sort de la table applicative (GET /api/spells)"
}
```

`spell_id` est l’**identifiant numérique** d’une ligne `Spell` (`/api/spells`), pas l’`index` SRD.

### Modifier une entrée de grimoire
```
PUT /api/grimoire/:characterId/spells/:grimoireEntryId
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

`:grimoireEntryId` est l’**id de la ligne** dans la table grimoire (clé primaire), pas l’id du sort.

### Supprimer une entrée du grimoire
```
DELETE /api/grimoire/:characterId/spells/:grimoireEntryId
Authorization: Bearer <token>
```

### Préparer des sorts (classes préparatrices)
```
POST /api/grimoire/:characterId/prepare
Authorization: Bearer <token>
Content-Type: application/json

{
  "spell_ids": [101, 103, 105]
}
```

`spell_ids` : identifiants des **lignes grimoire** (`id` des entrées), pas les `spell_id` de la table `Spell`. Les entrées listées sont marquées préparées ; les autres du personnage le sont retirées.

### Lancer un sort (incrémenter le compteur)
```
POST /api/grimoire/:characterId/cast/:grimoireEntryId
Authorization: Bearer <token>
```

`:grimoireEntryId` : id de la **ligne grimoire** (identique au segment utilisé pour `PUT` / `DELETE` sur une entrée).

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
GET /api/campaigns/:campaignId
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
PUT /api/campaigns/:campaignId
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
DELETE /api/campaigns/:campaignId
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

### Sessions actives (liste pour l’utilisateur connecté)
```
GET /api/sessions/active
Authorization: Bearer <token>
```

### Obtenir toutes les sessions d'une campagne
```
GET /api/sessions/campaign/:campaignId
Authorization: Bearer <token>
```

### Obtenir une session par ID
Réponse enrichie : détails session, **`attendance`** (personnages inscrits / présence), **`campaign_characters`**, métadonnées campagne (`gm_id`, etc.).

```
GET /api/sessions/:sessionId
Authorization: Bearer <token>
```

### Créer une session (MJ de la campagne ou admin)
La campagne est dans l’URL ; `session_number` et `session_date` sont **requis**.

```
POST /api/sessions/campaign/:campaignId
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
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

### Modifier une session (MJ de la campagne ou admin)
```
PUT /api/sessions/:sessionId
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "title": "Le Commencement de l'Aventure - Session Étendue",
  "session_date": "2025-01-20",
  "xp_awarded": 150,
  "gold_awarded": 75.0,
  "is_active": true
}
```

### Supprimer une session (soft delete)
```
DELETE /api/sessions/:sessionId
Authorization: Bearer <gm_or_admin_token>
```

### Présence (upsert) — MJ / admin
```
POST /api/sessions/:sessionId/attendance
Authorization: Bearer <gm_or_admin_token>
Content-Type: application/json

{
  "character_id": 1,
  "attended": true,
  "xp_earned": 100,
  "gold_earned": 50.0,
  "notes": "Présent toute la session"
}
```

Le personnage doit déjà être rattaché à la campagne de la session.

### Chat de session live

Historique HTTP et diffusion en temps réel via WebSocket (`session_chat`). Les participants autorisés (même périmètre que la session live) peuvent lire et poster.

**Liste des messages**

```
GET /api/sessions/:sessionId/chat/messages?limit=50&before_id=<optionnel>
Authorization: Bearer <token>
```

Réponse : `{ "success": true, "messages": [ ... ] }`. Chaque message contient `id`, `user_id`, `display_name`, `body`, `created_at`, et éventuellement **`image_url`** (chemin relatif API vers la pièce jointe) si une image est associée.

**Message texte**

```
POST /api/sessions/:sessionId/chat/messages
Authorization: Bearer <token>
Content-Type: application/json

{ "body": "Texte du message" }
```

Corps obligatoire, 2000 caractères maximum.

**Message avec image**

```
POST /api/sessions/:sessionId/chat/messages/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

- Champ fichier : **`image`** (JPEG, PNG, GIF ou WebP, 5 Mo max).
- Champ optionnel : **`body`** (légende, 2000 caractères max).

Réponse `201` : `{ "success": true, "message": { ... } }` avec `image_url` renseigné.

**Téléchargement / affichage d’une image**

```
GET /api/sessions/:sessionId/chat/attachments/:filename
Authorization: Bearer <token>
```

Le client doit envoyer le JWT (par exemple requête `fetch` avec en-tête `Authorization`) : un simple `<img src="...">` sans en-tête ne fonctionnera pas.

### État de jeu en session (PV, dés de vie) — joueur, MJ de la campagne ou admin

Données stockées sur la **liaison campagne–personnage** (`CampaignCharacter`) pour la durée de la campagne ; utilisées notamment par la **session live**.

```
GET /api/sessions/:sessionId/characters/:characterId/state
PUT /api/sessions/:sessionId/characters/:characterId/state
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_hit_points": 12,
  "hit_dice_remaining": 2
}
```

Variantes acceptées : `currentHitPoints`, `hitDiceRemaining`.

### Statistiques agrégées des sessions (GM / admin)
```
GET /api/sessions/stats/overview
Authorization: Bearer <gm_or_admin_token>
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

## 🎲 Données D&D 5e importées (`/api/dnd5e`)

Ces routes lisent les tables remplies par les scripts `npm run import-dnd5e-*` (source [D&D 5e API](https://www.dnd5eapi.co/), règles 2014). Authentification JWT obligatoire.

### Équipement importé (D&D 5e)

```
GET /api/dnd5e/equipment?limit=20&page=1&type=weapon&category=&q=&sortBy=name&sortDir=asc
GET /api/dnd5e/equipment/:index
GET /api/dnd5e/equipment/search?q=épée
```

Réponses liste : `items`, `pagination` (`page`, `limit`, `total`, `totalPages`).

### Objets magiques importés (D&D 5e)

```
GET /api/dnd5e/magic-items?limit=20&page=1&q=&rarity=&category=&sortBy=name&sortDir=asc
GET /api/dnd5e/magic-items/:index
```

### Sorts importés (catalogue D&D 5e)

```
GET /api/dnd5e/spells?limit=20&page=1&q=&level=&school=
GET /api/dnd5e/spells/:index
```

### Copie vers personnage (admin / gm)

Duplique une entrée importée vers les tables applicatives (`Item` / `Spell`) et inventaire ou grimoire.

```
POST /api/dnd5e/characters/:characterId/inventory
Content-Type: application/json
{ "equipment_id": 123, "quantity": 1 }
```

```
POST /api/dnd5e/characters/:characterId/inventory/magic-item
Content-Type: application/json
{ "magic_item_id": 45, "quantity": 1 }
```

```
POST /api/dnd5e/characters/:characterId/grimoire
Content-Type: application/json
{ "spell_index": "fireball", "is_known": true, "is_prepared": false, "notes": null }
```

```
GET /api/dnd5e/characters/:characterId/inventory
```

---

## ✨ Sorts applicatifs (`/api/spells`)

Sorts utilisés par le grimoire en jeu : copies issues des imports (`source: dnd5e`), sorts **custom** (`source: custom`), etc.

### Liste et détail

```
GET /api/spells?q=&level=&school=&limit=&page=
GET /api/spells/:id
```

### Création et mise à jour de sort

```
POST /api/spells
Authorization: Bearer <admin_or_gm_token>
```

Corps minimal : `name` (obligatoire). Champs optionnels : `index`, `level`, `school`, `castingTime`, `range`, `components`, `duration`, `description`, `higherLevel`, `ritual`, `concentration`, `raw`.

```
PUT /api/spells/:id
Authorization: Bearer <token>
```

- **admin** / **gm** : tout sort.
- **user** : uniquement un sort lié au grimoire d’un de ses personnages.

---

## 🏠 Données D&D Locales (`/api/dnd-local`)

Données complémentaires en base (monstres, armes, armures, vue `dnd_items`, etc.). Les réponses listes utilisent souvent `success`, `data`, `count`, `page`, `limit`.

### Sorts (jeu importé — même famille que le catalogue)

```
GET /api/dnd-local/spells?level=&school=&search=&limit=&page=
GET /api/dnd-local/spells/:index
```

### Monstres, armes, armures, items

```
GET /api/dnd-local/monsters?challenge_rating=&type=&search=&limit=&page=
GET /api/dnd-local/monsters/:slug

GET /api/dnd-local/weapons?category=&search=&limit=&page=
GET /api/dnd-local/weapons/:slug

GET /api/dnd-local/armor?armor_category=&search=&limit=&page=
GET /api/dnd-local/armor/:slug

GET /api/dnd-local/items?category=&rarity=&search=&limit=&page=
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

### Formats de réponse courants

- **`/api/dnd-local/*`** (listes) : `success`, `data`, `count`, `page`, `limit`.
- **`/api/dnd5e/*`** (listes paginées) : `items`, `pagination` avec `total`, `totalPages`.
- **`/api/spells`** : `items`, `pagination` ou `item` selon la route.
- Les champs métier sont en **camelCase** côté Prisma (ex. `castingTime`, `higherLevel`) dans les JSON renvoyés par l’API applicative.

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

### Santé de l’API
```bash
curl -s "http://localhost:3000/health"
```

### Sorts importés D&D 5e (catalogue)
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd5e/spells?level=3&limit=10&page=1"
```

### Sorts applicatifs (table `Spell`)
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/spells?q=fire&limit=10&page=1"
```

### Statistiques des données locales
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd-local/stats"
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
curl -X POST http://localhost:3000/api/sessions/campaign/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
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
    "spell_id": 42,
    "is_prepared": true,
    "is_known": true,
    "notes": "Référence l’id d’un sort (GET /api/spells)"
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
