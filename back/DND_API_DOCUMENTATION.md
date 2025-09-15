# Documentation API D&D - Intégration Open5e

Cette documentation décrit les nouvelles routes API pour accéder aux données D&D 5e via l'API [Open5e](https://api.open5e.com/).

## Authentification

Toutes les routes D&D nécessitent une authentification via token JWT :
```
Authorization: Bearer <token>
```

## Endpoints Disponibles

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

## Recherche Globale

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

## Réponses

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

## Codes de statut

- `200` : Succès
- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Accès refusé
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## Exemples d'utilisation

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

## Intégration avec l'application

Ces endpoints peuvent être utilisés pour :

1. **Création de personnages** : Récupérer les races et classes disponibles
2. **Gestion d'inventaire** : Rechercher des armes et armures
3. **Système de magie** : Accéder aux sorts et leurs descriptions
4. **Encounters** : Consulter les statistiques des monstres
5. **Recherche** : Fonction de recherche globale dans toutes les données D&D

## Limitations

- L'API Open5e a des limites de taux (rate limiting)
- Les données sont en lecture seule
- Certaines données peuvent ne pas être complètes
- La pagination est nécessaire pour les grandes listes

## Support

Pour plus d'informations sur l'API Open5e, consultez :
- [Documentation Open5e](https://open5e.com/api-docs)
- [API Open5e](https://api.open5e.com/)
