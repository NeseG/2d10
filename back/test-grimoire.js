const axios = require('axios');
const config = require('./config');

const API_BASE_URL = `http://localhost:${config.port}`;

// Fonction pour obtenir un token d'authentification
async function getAuthToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
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
  console.log('\n🔍 Test de la recherche de sorts...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/grimoire/1/search`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: 'fire',
        level: 3,
        school: 'evocation',
        limit: 5
      }
    });

    console.log('✅ Recherche de sorts réussie');
    console.log(`📊 ${response.data.count} sorts trouvés`);
    
    if (response.data.spells.length > 0) {
      console.log('📖 Premier sort trouvé:');
      console.log(`   - Nom: ${response.data.spells[0].name}`);
      console.log(`   - Niveau: ${response.data.spells[0].level}`);
      console.log(`   - École: ${response.data.spells[0].school}`);
      console.log(`   - Dans le grimoire: ${response.data.spells[0].in_grimoire}`);
    }

    return response.data.spells;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de sorts:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return [];
  }
}

// Fonction pour tester l'ajout d'un sort au grimoire
async function testAddSpellToGrimoire(token, spell) {
  console.log('\n➕ Test de l\'ajout d\'un sort au grimoire...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/grimoire/1/spells`, {
      spell_slug: spell.slug,
      spell_name: spell.name,
      spell_level: spell.level,
      spell_school: spell.school,
      is_prepared: false,
      is_known: true,
      notes: 'Sort ajouté via test'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Sort ajouté au grimoire avec succès');
    console.log(`📖 ID du sort dans le grimoire: ${response.data.spell.id}`);
    return response.data.spell;
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du sort:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return null;
  }
}

// Fonction pour tester la récupération du grimoire
async function testGetGrimoire(token) {
  console.log('\n📚 Test de la récupération du grimoire...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/grimoire/1`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Grimoire récupéré avec succès');
    console.log(`📊 Statistiques:`);
    console.log(`   - Total des sorts: ${response.data.stats.total_spells}`);
    console.log(`   - Sorts préparés: ${response.data.stats.prepared_spells}`);
    console.log(`   - Sorts connus: ${response.data.stats.known_spells}`);
    
    if (response.data.grimoire.length > 0) {
      console.log('📖 Sorts dans le grimoire:');
      response.data.grimoire.forEach((spell, index) => {
        console.log(`   ${index + 1}. ${spell.spell_name} (Niveau ${spell.spell_level}, ${spell.spell_school})`);
        console.log(`      - Préparé: ${spell.is_prepared}, Connu: ${spell.is_known}`);
        console.log(`      - Lancé ${spell.times_cast} fois`);
      });
    }

    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du grimoire:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return null;
  }
}

// Fonction pour tester la préparation de sorts
async function testPrepareSpells(token, spellIds) {
  console.log('\n🔮 Test de la préparation de sorts...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/grimoire/1/prepare`, {
      spell_ids: spellIds
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Sorts préparés avec succès');
    console.log(`📊 ${spellIds.length} sorts préparés`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la préparation des sorts:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return false;
  }
}

// Fonction pour tester le lancement d'un sort
async function testCastSpell(token, spellId) {
  console.log('\n⚡ Test du lancement d\'un sort...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/grimoire/1/cast/${spellId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Sort lancé avec succès');
    console.log(`📊 Sort lancé ${response.data.spell.times_cast} fois au total`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du lancement du sort:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return false;
  }
}

// Fonction pour tester les statistiques du grimoire
async function testGrimoireStats(token) {
  console.log('\n📊 Test des statistiques du grimoire...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/grimoire/1/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Statistiques récupérées avec succès');
    console.log('📈 Statistiques par niveau:');
    response.data.stats.by_level.forEach(level => {
      console.log(`   - Niveau ${level.spell_level}: ${level.spells_at_level} sorts`);
    });
    
    console.log('📈 Statistiques par école:');
    response.data.stats.by_school.forEach(school => {
      console.log(`   - ${school.spell_school}: ${school.count} sorts (${school.prepared_count} préparés)`);
    });

    return response.data.stats;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return null;
  }
}

// Fonction pour tester la modification d'un sort
async function testUpdateSpell(token, spellId) {
  console.log('\n✏️ Test de la modification d\'un sort...');
  try {
    const response = await axios.put(`${API_BASE_URL}/api/grimoire/1/spells/${spellId}`, {
      is_prepared: true,
      notes: 'Sort modifié via test'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Sort modifié avec succès');
    console.log(`📖 Sort préparé: ${response.data.spell.is_prepared}`);
    console.log(`📝 Notes: ${response.data.spell.notes}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la modification du sort:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
    return false;
  }
}

// Fonction principale de test
async function testGrimoire() {
  console.log('🧪 Test du système de grimoire');
  console.log('================================');

  // 1. Authentification
  console.log('\n🔐 Authentification...');
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ Impossible de s\'authentifier. Arrêt des tests.');
    return;
  }
  console.log('✅ Authentification réussie');

  // 2. Recherche de sorts
  const spells = await testSpellSearch(token);
  if (spells.length === 0) {
    console.error('❌ Aucun sort trouvé. Vérifiez que la base de données D&D est synchronisée.');
    return;
  }

  // 3. Ajout d'un sort au grimoire
  const addedSpell = await testAddSpellToGrimoire(token, spells[0]);
  if (!addedSpell) {
    console.error('❌ Impossible d\'ajouter un sort au grimoire.');
    return;
  }

  // 4. Récupération du grimoire
  const grimoire = await testGetGrimoire(token);
  if (!grimoire) {
    console.error('❌ Impossible de récupérer le grimoire.');
    return;
  }

  // 5. Modification du sort
  await testUpdateSpell(token, addedSpell.id);

  // 6. Préparation de sorts
  await testPrepareSpells(token, [addedSpell.id]);

  // 7. Lancement d'un sort
  await testCastSpell(token, addedSpell.id);

  // 8. Statistiques du grimoire
  await testGrimoireStats(token);

  console.log('\n🎉 Tests du grimoire terminés avec succès !');
}

// Exécuter les tests
testGrimoire().catch(console.error);
