# API Documentation - 2d10 Application

## Authentification

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

## Administration (Admin seulement)

### Lister tous les utilisateurs
```
GET /api/admin/users
Authorization: Bearer <admin_token>
```

### Obtenir un utilisateur
```
GET /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### Créer un utilisateur
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

### Mettre à jour un utilisateur
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

### Désactiver un utilisateur
```
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### Statistiques
```
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

## Gestion des Personnages

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

## Gestion de l'Inventaire et de la Bourse

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

## Gestion des Objets (Admin/GM)

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

## Gestion de l'Équipement

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

## Propriétés des Armes et Armures

### Armes
- **damage_dice** : Dés de dégâts (ex: "1d8", "2d6")
- **damage_type** : Type de dégâts (Tranchant, Perforant, Contondant, Feu, etc.)
- **weapon_range** : Portée en mètres
- **weapon_type** : Type d'arme (Mêlée, Distance, Lancé)

### Armures
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

## Utilisateur par défaut

Un utilisateur admin est créé automatiquement :
- **Email :** admin@2d10.com
- **Mot de passe :** admin123
- **Rôle :** admin

## Codes de statut

- `200` : Succès
- `201` : Créé avec succès
- `400` : Erreur de validation
- `401` : Non authentifié
- `403` : Accès refusé (rôle insuffisant)
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## Rôles

- **user** : Utilisateur standard (peut gérer ses propres personnages)
- **gm** : Game Master (peut voir tous les personnages)
- **admin** : Administrateur avec tous les privilèges
