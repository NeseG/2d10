#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://2d10:2d10password@localhost:5432/2d10',
  apiBaseUrl: 'http://localhost:3000/api'
};

const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Fonction pour obtenir un token d'authentification
async function getAuthToken() {
  try {
    const response = await axios.post(`${config.apiBaseUrl}/auth/login`, {
      email: 'admin@2d10.com',
      password: 'admin123'
    });
    
    return response.data.token;
  } catch (error) {
    console.error('❌ Erreur lors de l\'authentification:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return null;
  }
}

// Fonction pour tester la recherche de sorts
async function testSpellSearch(token) {
  console.log('\n🔮 Test de recherche de sorts...\n');
  
  const testCases = [
    {
      name: 'Recherche par nom - "fire"',
      url: `${config.apiBaseUrl}/dnd-local/spells?search=fire`,
      description: 'Recherche tous les sorts contenant "fire"'
    },
    {
      name: 'Recherche par niveau - niveau 3',
      url: `${config.apiBaseUrl}/dnd-local/spells?level=3`,
      description: 'Recherche tous les sorts de niveau 3'
    },
    {
      name: 'Recherche par école - "evocation"',
      url: `${config.apiBaseUrl}/dnd-local/spells?school=evocation`,
      description: 'Recherche tous les sorts d\'évocation'
    },
    {
      name: 'Recherche combinée - niveau 3 + école évocation',
      url: `${config.apiBaseUrl}/dnd-local/spells?level=3&school=evocation`,
      description: 'Recherche les sorts de niveau 3 d\'évocation'
    },
    {
      name: 'Recherche avec limite - 5 résultats',
      url: `${config.apiBaseUrl}/dnd-local/spells?limit=5`,
      description: 'Récupère seulement 5 sorts'
    },
    {
      name: 'Recherche globale - "magic"',
      url: `${config.apiBaseUrl}/dnd-local/search?q=magic&types=spells`,
      description: 'Recherche globale pour "magic" dans les sorts'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      const response = await axios.get(testCase.url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = response.data;
      
      if (data.success) {
        if (data.results) {
          // Recherche globale
          console.log(`   ✅ Succès - ${Object.keys(data.results).length} catégories trouvées`);
          for (const [category, items] of Object.entries(data.results)) {
            console.log(`      ${category}: ${items.length} éléments`);
            if (items.length > 0) {
              console.log(`      Exemple: ${items[0].name}`);
            }
          }
        } else {
          // Recherche spécifique
          console.log(`   ✅ Succès - ${data.count} sorts trouvés`);
          if (data.data && data.data.length > 0) {
            console.log(`   📝 Exemples:`);
            data.data.slice(0, 3).forEach((spell, index) => {
              console.log(`      ${index + 1}. ${spell.name} (niveau ${spell.level}, ${spell.school})`);
            });
          }
        }
      } else {
        console.log(`   ❌ Erreur: ${data.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur HTTP: ${error.message}`);
      if (error.response) {
        console.log(`   Détails: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
}

// Fonction pour vérifier les données dans la base
async function checkDatabaseData() {
  console.log('\n📊 Vérification des données dans la base...\n');
  
  try {
    // Vérifier si les tables existent
    const tables = ['dnd_spells', 'dnd_monsters', 'dnd_weapons', 'dnd_armor'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table}: ${count} éléments`);
        
        if (count > 0 && table === 'dnd_spells') {
          // Afficher quelques exemples de sorts
          const sampleResult = await pool.query(`SELECT name, level, school FROM ${table} LIMIT 3`);
          console.log(`   Exemples de sorts:`);
          sampleResult.rows.forEach((spell, index) => {
            console.log(`      ${index + 1}. ${spell.name} (niveau ${spell.level}, ${spell.school})`);
          });
        }
      } catch (error) {
        console.log(`   ${table}: Table n'existe pas ou erreur - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la base:', error.message);
  }
}

// Fonction principale
async function main() {
  console.log('🎲 Test de recherche de sorts D&D\n');
  
  // Vérifier les données dans la base
  await checkDatabaseData();
  
  // Obtenir un token d'authentification
  console.log('\n🔐 Authentification...');
  const token = await getAuthToken();
  
  if (!token) {
    console.log('❌ Impossible d\'obtenir un token d\'authentification');
    console.log('💡 Assurez-vous que le serveur est démarré et que l\'utilisateur admin existe');
    return;
  }
  
  console.log('✅ Token d\'authentification obtenu');
  
  // Tester la recherche de sorts
  await testSpellSearch(token);
  
  console.log('\n🎉 Tests terminés !');
}

// Exécuter
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
