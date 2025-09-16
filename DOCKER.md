# 🐳 Docker - 2d10

Guide d'utilisation de Docker pour le projet 2d10.

## 📋 Profils Disponibles

### 🔧 Backend uniquement
```bash
docker-compose --profile back up
```
- Base de données PostgreSQL
- Interface pgAdmin
- Backend Node.js/Express

### 🎨 Frontend uniquement (à venir)
```bash
docker-compose --profile front up
```
- Frontend React/Vue/Angular
- Dépend du backend

### 🚀 Application complète
```bash
docker-compose --profile full up
```
- Backend + Frontend + Base de données
- Configuration de développement

### 🏭 Production
```bash
docker-compose --profile production up
```
- Backend + Frontend + Nginx
- Configuration de production

## 🚀 Commandes Utiles

### Démarrer les services
```bash
# Backend uniquement
docker-compose --profile back up -d

# Application complète
docker-compose --profile full up -d

# Production
docker-compose --profile production up -d
```

### Arrêter les services
```bash
docker-compose down
```

### Voir les logs
```bash
# Tous les services
docker-compose logs

# Service spécifique
docker-compose logs back
docker-compose logs db
```

### Reconstruire les images
```bash
docker-compose build --no-cache
```

### Accès aux services
- **Backend API** : http://localhost:3000
- **pgAdmin** : http://localhost:5050
- **Frontend** : http://localhost:3001 (à venir)
- **Nginx** : http://localhost:80 (production)

## 🔧 Configuration

### Variables d'environnement
Les variables sont définies dans le docker-compose.yml :
- `DATABASE_URL` : URL de connexion PostgreSQL
- `JWT_SECRET` : Clé secrète JWT
- `NODE_ENV` : Environnement (development/production)

### Volumes
- `db_data` : Données PostgreSQL persistantes
- `./back:/usr/src/app` : Code source backend (développement)

## 🛠️ Développement

### Mode développement
```bash
# Démarrer seulement la base de données
docker-compose up db pgadmin -d

# Lancer le backend en local
cd back/
npm install
npm run dev
```

### Mode production
```bash
# Construire et démarrer en production
docker-compose --profile production up --build -d
```

## 🔍 Dépannage

### Vérifier l'état des conteneurs
```bash
docker-compose ps
```

### Accéder au conteneur
```bash
# Backend
docker-compose exec back sh

# Base de données
docker-compose exec db psql -U 2d10 -d 2d10
```

### Nettoyer
```bash
# Supprimer les conteneurs et volumes
docker-compose down -v

# Supprimer les images
docker-compose down --rmi all
```

---

**🎲 Bon développement !**
