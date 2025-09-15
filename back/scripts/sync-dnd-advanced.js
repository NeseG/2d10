const { Pool } = require('pg');
const axios = require('axios');

// Configuration
const config = {
  open5eBaseUrl: 'https://api.open5e.com',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://2d10:2d10_password@localhost:5432/2d10_db'
};

const pool = new Pool({
  connectionString: config.databaseUrl,
});

const httpClient = axios.create({
  baseURL: config.open5eBaseUrl,
  timeout: 30000,
});

// Configuration de synchronisation
const syncConfig = {
  // Types de données disponibles
  availableTypes: ['spells', 'monsters', 'weapons', 'armor', 'items'],
  
  // Configuration par défaut (peut être modifiée via les arguments)
  defaultSync: {
    spells: true,
    monsters: true,
    weapons: true,
    armor: true,
    items: true
  },
  
  // Options de synchronisation
  options: {
    force: false,        // Forcer la synchronisation même si les données existent
    clear: false,        // Vider les tables avant la synchronisation
    limit: null,         // Limiter le nombre d'éléments (null = tous)
    dryRun: false        // Mode simulation (ne pas insérer les données)
  }
};

// Fonction pour récupérer les données avec pagination
async function fetchAllData(endpoint, limit = 100) {
  const allData = [];
  let nextUrl = endpoint;
  let page = 1;

  console.log(`📥 Récupération des données depuis ${endpoint}...`);

  while (nextUrl && (!syncConfig.options.limit || allData.length < syncConfig.options.limit)) {
    try {
      console.log(`   Page ${page}...`);
      const response = await httpClient.get(nextUrl, {
        params: { limit, page }
      });
      
      const data = response.data;
      
      if (data.results && data.results.length > 0) {
        // Limiter le nombre d'éléments si spécifié
        const itemsToAdd = syncConfig.options.limit 
          ? data.results.slice(0, syncConfig.options.limit - allData.length)
          : data.results;
        
        allData.push(...itemsToAdd);
        nextUrl = data.next;
        page++;
        
        // Afficher le progrès tous les 5 pages
        if (page % 5 === 0) {
          console.log(`   📊 ${allData.length} éléments récupérés jusqu'à présent...`);
        }
        
        // Petite pause entre les requêtes pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.log(`   ✅ Fin des données atteinte`);
        break;
      }
    } catch (error) {
      console.error(`❌ Erreur page ${page}:`, error.message);
      
      // Si c'est une erreur de rate limiting, attendre plus longtemps
      if (error.response && error.response.status === 429) {
        console.log(`   ⏳ Rate limit atteint, attente de 5 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue; // Réessayer la même page
      }
      
      // Pour les autres erreurs, essayer encore 2 fois
      if (page <= 3) {
        console.log(`   🔄 Nouvelle tentative dans 2 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      break;
    }
  }

  console.log(`✅ ${allData.length} éléments récupérés`);
  return allData;
}

// Fonction pour créer les tables D&D
async function createTables() {
  console.log('📋 Création des tables D&D...');
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS dnd_spells (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(200) UNIQUE NOT NULL,
      name VARCHAR(300) NOT NULL,
      level INTEGER,
      school VARCHAR(100),
      casting_time VARCHAR(200),
      range VARCHAR(200),
      components VARCHAR(200),
      duration VARCHAR(200),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS dnd_monsters (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      size VARCHAR(50),
      type VARCHAR(100),
      alignment VARCHAR(100),
      armor_class INTEGER,
      hit_points INTEGER,
      challenge_rating VARCHAR(10),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS dnd_weapons (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(200) UNIQUE NOT NULL,
      name VARCHAR(300) NOT NULL,
      category VARCHAR(100),
      damage_dice VARCHAR(50),
      damage_type VARCHAR(100),
      weight DECIMAL(5,2),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS dnd_armor (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(200) UNIQUE NOT NULL,
      name VARCHAR(300) NOT NULL,
      armor_category VARCHAR(100),
      armor_class INTEGER,
      weight DECIMAL(5,2),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS dnd_items (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(300) UNIQUE NOT NULL,
      name VARCHAR(500) NOT NULL,
      category VARCHAR(200),
      rarity VARCHAR(100),
      is_magic_item BOOLEAN DEFAULT false,
      weight DECIMAL(10,3),
      cost DECIMAL(15,2),
      requires_attunement BOOLEAN DEFAULT false,
      size VARCHAR(100),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS sync_log (
      id SERIAL PRIMARY KEY,
      sync_type VARCHAR(50) NOT NULL,
      items_synced INTEGER DEFAULT 0,
      sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration_seconds INTEGER,
      success BOOLEAN DEFAULT true,
      error_message TEXT
    )`
  ];

  for (const table of tables) {
    await pool.query(table);
  }
  
  console.log('✅ Tables créées');
}

// Fonction pour vérifier si des données existent déjà
async function checkExistingData(type) {
  const tableName = `dnd_${type}`;
  const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
  return parseInt(result.rows[0].count) > 0;
}

// Fonction pour vider une table
async function clearTable(type) {
  const tableName = `dnd_${type}`;
  await pool.query(`DELETE FROM ${tableName}`);
  console.log(`🗑️ Table ${tableName} vidée`);
}

// Fonction pour synchroniser les sorts
async function syncSpells() {
  console.log('\n🔮 Synchronisation des sorts...');
  
  try {
    const spells = await fetchAllData('/v2/spells/');
    
    let syncedCount = 0;
    for (const spell of spells) {
      if (!spell.key || !spell.name) continue;
      
      if (!syncConfig.options.dryRun) {
        await pool.query(`
          INSERT INTO dnd_spells (slug, name, level, school, casting_time, range, components, duration, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            level = EXCLUDED.level,
            school = EXCLUDED.school,
            casting_time = EXCLUDED.casting_time,
            range = EXCLUDED.range,
            components = EXCLUDED.components,
            duration = EXCLUDED.duration,
            description = EXCLUDED.description
        `, [
          spell.key,
          spell.name,
          spell.level,
          spell.school?.name || null,
          spell.casting_time,
          spell.range_text,
          spell.verbal ? (spell.somatic ? (spell.material ? 'V, S, M' : 'V, S') : (spell.material ? 'V, M' : 'V')) : (spell.somatic ? (spell.material ? 'S, M' : 'S') : (spell.material ? 'M' : '')),
          spell.duration,
          spell.desc
        ]);
      }
      
      syncedCount++;
      if (syncedCount % 100 === 0) {
        console.log(`   📊 ${syncedCount}/${spells.length} sorts synchronisés...`);
      }
    }
    
    console.log(`✅ ${syncedCount} sorts synchronisés`);
    return { success: true, count: syncedCount };
  } catch (error) {
    console.error('❌ Erreur sorts:', error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour synchroniser les monstres
async function syncMonsters() {
  console.log('\n🐉 Synchronisation des monstres...');
  
  try {
    const monsters = await fetchAllData('/v1/monsters/');
    
    let syncedCount = 0;
    for (const monster of monsters) {
      if (!monster.slug || !monster.name) continue;
      
      if (!syncConfig.options.dryRun) {
        await pool.query(`
          INSERT INTO dnd_monsters (slug, name, size, type, alignment, armor_class, hit_points, challenge_rating, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            size = EXCLUDED.size,
            type = EXCLUDED.type,
            alignment = EXCLUDED.alignment,
            armor_class = EXCLUDED.armor_class,
            hit_points = EXCLUDED.hit_points,
            challenge_rating = EXCLUDED.challenge_rating,
            description = EXCLUDED.description
        `, [
          monster.slug,
          monster.name,
          monster.size,
          monster.type,
          monster.alignment,
          monster.armor_class,
          monster.hit_points,
          monster.challenge_rating,
          monster.desc
        ]);
      }
      
      syncedCount++;
      if (syncedCount % 100 === 0) {
        console.log(`   📊 ${syncedCount}/${monsters.length} monstres synchronisés...`);
      }
    }
    
    console.log(`✅ ${syncedCount} monstres synchronisés`);
    return { success: true, count: syncedCount };
  } catch (error) {
    console.error('❌ Erreur monstres:', error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour synchroniser les armes
async function syncWeapons() {
  console.log('\n⚔️ Synchronisation des armes...');
  
  try {
    const weapons = await fetchAllData('/v2/weapons/');
    
    let syncedCount = 0;
    for (const weapon of weapons) {
      if (!weapon.key || !weapon.name) continue;
      
      if (!syncConfig.options.dryRun) {
        await pool.query(`
          INSERT INTO dnd_weapons (slug, name, category, damage_dice, damage_type, weight, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            damage_dice = EXCLUDED.damage_dice,
            damage_type = EXCLUDED.damage_type,
            weight = EXCLUDED.weight,
            description = EXCLUDED.description
        `, [
          weapon.key,
          weapon.name,
          weapon.is_simple ? 'Simple' : 'Martial',
          weapon.damage_dice,
          weapon.damage_type?.name || null,
          weapon.weight || null,
          weapon.desc || null
        ]);
      }
      
      syncedCount++;
      if (syncedCount % 50 === 0) {
        console.log(`   📊 ${syncedCount}/${weapons.length} armes synchronisées...`);
      }
    }
    
    console.log(`✅ ${syncedCount} armes synchronisées`);
    return { success: true, count: syncedCount };
  } catch (error) {
    console.error('❌ Erreur armes:', error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour synchroniser les armures
async function syncArmor() {
  console.log('\n🛡️ Synchronisation des armures...');
  
  try {
    const armor = await fetchAllData('/v2/armor/');
    
    let syncedCount = 0;
    for (const item of armor) {
      if (!item.key || !item.name) continue;
      
      if (!syncConfig.options.dryRun) {
        await pool.query(`
          INSERT INTO dnd_armor (slug, name, armor_category, armor_class, weight, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            armor_category = EXCLUDED.armor_category,
            armor_class = EXCLUDED.armor_class,
            weight = EXCLUDED.weight,
            description = EXCLUDED.description
        `, [
          item.key,
          item.name,
          item.category,
          item.ac_base,
          item.weight || null,
          item.desc || null
        ]);
      }
      
      syncedCount++;
      if (syncedCount % 25 === 0) {
        console.log(`   📊 ${syncedCount}/${armor.length} armures synchronisées...`);
      }
    }
    
    console.log(`✅ ${syncedCount} armures synchronisées`);
    return { success: true, count: syncedCount };
  } catch (error) {
    console.error('❌ Erreur armures:', error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour synchroniser les items
async function syncItems() {
  console.log('\n🎒 Synchronisation des items...');
  
  try {
    const items = await fetchAllData('/v2/items/');
    
    let syncedCount = 0;
    for (const item of items) {
      if (!item.key || !item.name) continue;
      
      if (!syncConfig.options.dryRun) {
        await pool.query(`
          INSERT INTO dnd_items (slug, name, category, rarity, is_magic_item, weight, cost, requires_attunement, size, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            rarity = EXCLUDED.rarity,
            is_magic_item = EXCLUDED.is_magic_item,
            weight = EXCLUDED.weight,
            cost = EXCLUDED.cost,
            requires_attunement = EXCLUDED.requires_attunement,
            size = EXCLUDED.size,
            description = EXCLUDED.description
        `, [
          item.key,
          item.name,
          item.category?.name || null,
          item.rarity?.name || 'common',
          item.is_magic_item || false,
          parseFloat(item.weight) || null,
          parseFloat(item.cost) || null,
          item.requires_attunement || false,
          item.size?.name || null,
          item.desc || null
        ]);
      }
      
      syncedCount++;
      if (syncedCount % 100 === 0) {
        console.log(`   📊 ${syncedCount}/${items.length} items synchronisés...`);
      }
    }
    
    console.log(`✅ ${syncedCount} items synchronisés`);
    return { success: true, count: syncedCount };
  } catch (error) {
    console.error('❌ Erreur items:', error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour enregistrer le log de synchronisation
async function logSync(type, result, duration) {
  if (!syncConfig.options.dryRun) {
    await pool.query(`
      INSERT INTO sync_log (sync_type, items_synced, duration_seconds, success, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      type,
      result.count || 0,
      Math.round(duration / 1000),
      result.success,
      result.error || null
    ]);
  }
}

// Fonction principale de synchronisation
async function syncData(typesToSync = null, options = {}) {
  const startTime = Date.now();
  
  // Mettre à jour la configuration avec les options
  Object.assign(syncConfig.options, options);
  
  // Déterminer quels types synchroniser
  const types = typesToSync || Object.keys(syncConfig.defaultSync).filter(type => syncConfig.defaultSync[type]);
  
  console.log('🎲 Synchronisation des données D&D...');
  console.log(`📋 Types à synchroniser: ${types.join(', ')}`);
  
  if (syncConfig.options.dryRun) {
    console.log('🔍 Mode simulation activé - aucune donnée ne sera insérée');
  }
  
  if (syncConfig.options.clear) {
    console.log('🗑️ Mode suppression activé - les tables seront vidées avant synchronisation');
  }
  
  // Créer les tables
  await createTables();
  
  const results = {};
  
  // Synchroniser chaque type
  for (const type of types) {
    if (!syncConfig.availableTypes.includes(type)) {
      console.log(`⚠️ Type '${type}' non supporté, ignoré`);
      continue;
    }
    
    const typeStartTime = Date.now();
    
    // Vérifier si des données existent déjà
    if (!syncConfig.options.force && !syncConfig.options.clear) {
      const hasData = await checkExistingData(type);
      if (hasData) {
        console.log(`⚠️ Des données ${type} existent déjà. Utilisez --force pour forcer la synchronisation ou --clear pour vider les tables.`);
        continue;
      }
    }
    
    // Vider la table si demandé
    if (syncConfig.options.clear) {
      await clearTable(type);
    }
    
    // Synchroniser selon le type
    let result;
    switch (type) {
      case 'spells':
        result = await syncSpells();
        break;
      case 'monsters':
        result = await syncMonsters();
        break;
      case 'weapons':
        result = await syncWeapons();
        break;
      case 'armor':
        result = await syncArmor();
        break;
      case 'items':
        result = await syncItems();
        break;
    }
    
    const typeDuration = Date.now() - typeStartTime;
    results[type] = result;
    
    // Enregistrer le log
    await logSync(type, result, typeDuration);
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Afficher le résumé
  console.log('\n📊 Résumé de la synchronisation:');
  console.log(`⏱️ Durée totale: ${Math.round(totalDuration / 1000)}s`);
  
  for (const [type, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${type}: ${result.count} éléments synchronisés`);
    } else {
      console.log(`❌ ${type}: Erreur - ${result.error}`);
    }
  }
  
  console.log('\n🎉 Synchronisation terminée !');
  
  await pool.end();
}

// Gestion des arguments de ligne de commande
function parseArguments() {
  const args = process.argv.slice(2);
  const types = [];
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--spells':
        types.push('spells');
        break;
      case '--monsters':
        types.push('monsters');
        break;
      case '--weapons':
        types.push('weapons');
        break;
      case '--armor':
        types.push('armor');
        break;
      case '--items':
        types.push('items');
        break;
      case '--all':
        types.push(...syncConfig.availableTypes);
        break;
      case '--force':
        options.force = true;
        break;
      case '--clear':
        options.clear = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--limit':
        if (i + 1 < args.length) {
          options.limit = parseInt(args[i + 1]);
          i++; // Skip next argument
        }
        break;
      case '--help':
        console.log(`
🎲 Script de synchronisation D&D avancé

Usage: node sync-dnd-advanced.js [options] [types]

Types disponibles:
  --spells     Synchroniser les sorts
  --monsters   Synchroniser les monstres
  --weapons    Synchroniser les armes
  --armor      Synchroniser les armures
  --items      Synchroniser les items
  --all        Synchroniser tout (défaut)

Options:
  --force      Forcer la synchronisation même si des données existent
  --clear      Vider les tables avant la synchronisation
  --dry-run    Mode simulation (ne pas insérer les données)
  --limit N    Limiter le nombre d'éléments à synchroniser
  --help       Afficher cette aide

Exemples:
  node sync-dnd-advanced.js --all
  node sync-dnd-advanced.js --spells --weapons --force
  node sync-dnd-advanced.js --items --dry-run
  node sync-dnd-advanced.js --items --limit 50
        `);
        process.exit(0);
        break;
    }
  }
  
  return {
    types: types.length > 0 ? types : null,
    options
  };
}

// Point d'entrée
if (require.main === module) {
  const { types, options } = parseArguments();
  syncData(types, options).catch(console.error);
}

module.exports = { syncData, syncConfig };
