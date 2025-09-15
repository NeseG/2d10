# Guide d'utilisation Postman - API 2d10

## 📥 Import des fichiers

### 1. Importer la Collection
1. Ouvrez Postman
2. Cliquez sur **Import** (bouton en haut à gauche)
3. Sélectionnez le fichier `2d10_API_Collection.postman_collection.json`
4. Cliquez sur **Import**

### 2. Importer l'Environnement
1. Cliquez sur l'icône **Environnements** (œil) en haut à droite
2. Cliquez sur **Import**
3. Sélectionnez le fichier `2d10_Environment.postman_environment.json`
4. Cliquez sur **Import**
5. Sélectionnez l'environnement "2d10 Environment" dans la liste déroulante

## 🚀 Utilisation

### Étape 1 : Vérifier que l'API fonctionne
1. Exécutez la requête **"Health Check"**
2. Vous devriez recevoir une réponse avec le statut de la base de données

### Étape 2 : Se connecter en tant qu'admin
1. Exécutez la requête **"Login Admin"**
2. Le token sera automatiquement sauvegardé dans la variable `authToken`
3. Vous pouvez maintenant utiliser toutes les routes admin

### Étape 3 : Tester les fonctionnalités
- **Inscription** : Créez un nouvel utilisateur avec "Register User"
- **Profil** : Consultez votre profil avec "Get Profile"
- **Administration** : Utilisez les routes admin pour gérer les utilisateurs

## 🔧 Variables d'environnement

- `baseUrl` : URL de base de l'API (http://localhost:3000)
- `authToken` : Token JWT (rempli automatiquement après login)
- `adminEmail` : Email de l'admin par défaut
- `adminPassword` : Mot de passe de l'admin par défaut

## 📋 Ordre recommandé des tests

### Authentification
1. **Health Check** - Vérifier que l'API fonctionne
2. **API Info** - Voir les informations de l'API
3. **Login Admin** - Se connecter en tant qu'admin
4. **Get Profile** - Vérifier le profil admin

### Gestion des utilisateurs
5. **Get All Users** - Voir la liste des utilisateurs
6. **Register User** - Créer un nouvel utilisateur
7. **Get Statistics** - Voir les statistiques
8. **Update User** - Modifier un utilisateur
9. **Deactivate User** - Désactiver un utilisateur

### Gestion des personnages
10. **Create Character** - Créer un personnage
11. **Get All Characters** - Voir la liste des personnages
12. **Get Character by ID** - Consulter un personnage
13. **Update Character** - Modifier un personnage

### Gestion de l'inventaire
14. **Get Character Inventory** - Voir l'inventaire
15. **Get Items Catalog** - Consulter le catalogue d'objets
16. **Add Item to Inventory** - Ajouter un objet
17. **Update Inventory Item** - Modifier un objet (équiper)
18. **Get Character Purse** - Consulter la bourse
19. **Update Character Purse** - Modifier la bourse

### Gestion des objets (Admin/GM)
20. **Get All Items** - Voir tous les objets
21. **Get Item Types** - Voir les types d'objets
22. **Create New Item** - Créer un objet personnalisé
23. **Update Item** - Modifier un objet

## 🔐 Authentification automatique

La collection est configurée pour :
- **Extraire automatiquement** le token des réponses de login
- **Sauvegarder** le token dans la variable `authToken`
- **Utiliser** automatiquement ce token pour les requêtes authentifiées

## 🐛 Dépannage

### Erreur de connexion
- Vérifiez que Docker est démarré : `docker-compose ps`
- Vérifiez que l'API répond : `curl http://localhost:3000/health`

### Token expiré
- Reconnectez-vous avec "Login Admin"
- Le nouveau token sera automatiquement sauvegardé

### Erreur 403 (Accès refusé)
- Vérifiez que vous êtes connecté avec un compte admin
- Vérifiez que le token est présent dans l'en-tête Authorization

## 📊 Exemples de réponses

### Login réussi
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@2d10.com",
    "role_name": "admin",
    "created_at": "2025-09-14T13:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Liste des utilisateurs
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@2d10.com",
      "is_active": true,
      "created_at": "2025-09-14T13:00:00.000Z",
      "role_name": "admin"
    }
  ]
}
```

### Inventaire d'un personnage
```json
{
  "inventory": [
    {
      "id": 1,
      "quantity": 1,
      "is_equipped": true,
      "notes": "Équipé en main droite",
      "name": "Épée longue",
      "description": "Une épée à une main, arme de mêlée",
      "weight": 3.0,
      "value_gold": 15.0,
      "rarity": "common",
      "is_magical": false,
      "item_type": "Arme"
    }
  ],
  "total_weight": 3.0,
  "total_items": 1
}
```

### Bourse d'un personnage
```json
{
  "purse": {
    "id": 1,
    "character_id": 1,
    "copper_pieces": 50,
    "silver_pieces": 20,
    "electrum_pieces": 0,
    "gold_pieces": 100,
    "platinum_pieces": 5,
    "updated_at": "2025-09-14T13:00:00.000Z"
  },
  "total_gold_value": 155.5
}
```

### Catalogue d'objets
```json
{
  "items": [
    {
      "id": 1,
      "name": "Épée longue",
      "description": "Une épée à une main, arme de mêlée",
      "item_type_id": 1,
      "weight": 3.0,
      "value_gold": 15.0,
      "rarity": "common",
      "is_magical": false,
      "properties": null,
      "item_type": "Arme"
    }
  ]
}
```
