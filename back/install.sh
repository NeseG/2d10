#!/bin/bash

# Script d'installation pour l'application 2d10
echo "🎲 Installation de l'application 2d10 D&D Character Management System"
echo "=================================================================="

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé."
    echo "📥 Installation de Node.js via Homebrew..."
    
    # Vérifier si Homebrew est installé
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew n'est pas installé. Installation de Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Installer Node.js
    brew install node
    echo "✅ Node.js installé avec succès"
else
    echo "✅ Node.js est déjà installé: $(node --version)"
fi

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL n'est pas installé."
    echo "📥 Installation de PostgreSQL via Homebrew..."
    brew install postgresql@15
    brew services start postgresql@15
    echo "✅ PostgreSQL installé et démarré"
else
    echo "✅ PostgreSQL est déjà installé: $(psql --version)"
fi

# Installer les dépendances npm
echo "📦 Installation des dépendances npm..."
npm install

# Créer la base de données
echo "🗄️  Création de la base de données..."
createdb 2d10_db 2>/dev/null || echo "Base de données 2d10_db existe déjà"

# Créer le fichier .env
echo "⚙️  Création du fichier de configuration .env..."
cat > .env << EOF
# Configuration de la base de données
DATABASE_URL=postgresql://localhost:5432/2d10_db

# Configuration JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-$(date +%s)
JWT_EXPIRES_IN=24h

# Configuration du serveur
PORT=3000
NODE_ENV=development
EOF

echo "✅ Fichier .env créé"

# Exécuter le script d'initialisation de la base de données
echo "🚀 Initialisation de la base de données..."
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  try {
    const client = await pool.connect();
    const initSQL = fs.readFileSync('./init.sql', 'utf8');
    await client.query(initSQL);
    console.log('✅ Base de données initialisée avec succès');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    process.exit(1);
  }
}

initDB();
"

echo ""
echo "🎉 Installation terminée !"
echo ""
echo "📋 Pour démarrer l'application :"
echo "   npm start"
echo ""
echo "🔧 Pour le développement :"
echo "   npm run dev"
echo ""
echo "🌐 L'application sera disponible sur :"
echo "   http://localhost:3000"
echo ""
echo "📚 Documentation API :"
echo "   - API principale : http://localhost:3000/"
echo "   - D&D local : http://localhost:3000/api/dnd-local/stats"
echo "   - Health check : http://localhost:3000/health"
echo ""
echo "🔑 Compte admin par défaut :"
echo "   Email: admin@2d10.com"
echo "   Mot de passe: admin123"
echo ""
echo "📖 Collections Postman disponibles :"
echo "   - 2d10_API_Collection.postman_collection.json"
