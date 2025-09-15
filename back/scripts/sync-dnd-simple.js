#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const config = {
  open5eBaseUrl: 'https://api.open5e.com',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://2d10:2d10password@localhost:5432/2d10',
};

const pool = new Pool({
  connectionString: config.databaseUrl,
});

const httpClient = axios.create({
  baseURL: config.open5eBaseUrl,
  timeout: 10000,
});

// Fonction pour récupérer les données avec pagination
async function fetchAllData(endpoint, limit = 100) {
  const allData = [];
  let nextUrl = endpoint;
  let page = 1;

  console.log(`📥 Récupération des données depuis ${endpoint}...`);

  while (nextUrl) { // Récupérer toutes les pages disponibles
    try {
      console.log(`   Page ${page}...`);
      const response = await httpClient.get(nextUrl, {
        params: { limit, page }
      });
      
      const data = response.data;
      
      if (data.results && data.results.length > 0) {
        allData.push(...data.results);
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

// Créer les tables D&D
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
    )`
  ];
  
  for (const table of tables) {
    await pool.query(table);
  }
  
  console.log('✅ Tables créées');
}

// Synchroniser les sorts
async function syncSpells() {
  console.log('\n🔮 Synchronisation des sorts...');
  
  try {
    const spells = await fetchAllData('/v2/spells/');
    
    let syncedCount = 0;
    for (const spell of spells) {
      if (!spell.key || !spell.name) continue; // Ignorer les entrées invalides
      
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
        spell.key, // Utiliser 'key' au lieu de 'slug'
        spell.name,
        spell.level,
        spell.school?.name || null, // L'école est un objet avec une propriété 'name'
        spell.casting_time,
        spell.range_text, // Utiliser 'range_text' au lieu de 'range'
        spell.verbal ? (spell.somatic ? (spell.material ? 'V, S, M' : 'V, S') : (spell.material ? 'V, M' : 'V')) : (spell.somatic ? (spell.material ? 'S, M' : 'S') : (spell.material ? 'M' : '')), // Construire les composants
        spell.duration,
        spell.desc
      ]);
      
      syncedCount++;
      if (syncedCount % 100 === 0) {
        console.log(`   📊 ${syncedCount}/${spells.length} sorts synchronisés...`);
      }
    }
    
    console.log(`✅ ${syncedCount} sorts synchronisés`);
  } catch (error) {
    console.error('❌ Erreur sorts:', error.message);
  }
}

// Synchroniser les monstres
async function syncMonsters() {
  console.log('\n🐉 Synchronisation des monstres...');
  
  try {
    const monsters = await fetchAllData('/v1/monsters/');
    
    let syncedCount = 0;
    for (const monster of monsters) {
      if (!monster.slug || !monster.name) continue; // Ignorer les entrées invalides
      
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
      
      syncedCount++;
      if (syncedCount % 100 === 0) {
        console.log(`   📊 ${syncedCount}/${monsters.length} monstres synchronisés...`);
      }
    }
    
    console.log(`✅ ${syncedCount} monstres synchronisés`);
  } catch (error) {
    console.error('❌ Erreur monstres:', error.message);
  }
}

// Synchroniser les armes
async function syncWeapons() {
  console.log('\n⚔️ Synchronisation des armes...');
  
  try {
    const weapons = await fetchAllData('/v2/weapons/');
    
    let syncedCount = 0;
    for (const weapon of weapons) {
      if (!weapon.key || !weapon.name) continue; // Ignorer les entrées invalides
      
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
        weapon.key, // Utiliser 'key' au lieu de 'slug'
        weapon.name,
        weapon.is_simple ? 'Simple' : 'Martial', // Construire la catégorie
        weapon.damage_dice,
        weapon.damage_type?.name || null, // Le type de dégâts est un objet
        weapon.weight || null,
        weapon.desc || null
      ]);
      
      syncedCount++;
      if (syncedCount % 50 === 0) {
        console.log(`   📊 ${syncedCount}/${weapons.length} armes synchronisées...`);
      }
    }
    
    console.log(`✅ ${syncedCount} armes synchronisées`);
  } catch (error) {
    console.error('❌ Erreur armes:', error.message);
  }
}

// Synchroniser les armures
async function syncArmor() {
  console.log('\n🛡️ Synchronisation des armures...');
  
  try {
    const armor = await fetchAllData('/v2/armor/');
    
    let syncedCount = 0;
    for (const item of armor) {
      if (!item.key || !item.name) continue; // Ignorer les entrées invalides
      
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
        item.key, // Utiliser 'key' au lieu de 'slug'
        item.name,
        item.category, // Utiliser 'category' au lieu de 'armor_category'
        item.ac_base, // Utiliser 'ac_base' au lieu de 'armor_class'
        item.weight || null,
        item.desc || null
      ]);
      
      syncedCount++;
      if (syncedCount % 25 === 0) {
        console.log(`   📊 ${syncedCount}/${armor.length} armures synchronisées...`);
      }
    }
    
    console.log(`✅ ${syncedCount} armures synchronisées`);
  } catch (error) {
    console.error('❌ Erreur armures:', error.message);
  }
}

// Fonction principale
async function main() {
  console.log('🎲 Synchronisation des données D&D...');
  
  try {
    await createTables();
    await syncSpells();
    await syncMonsters();
    await syncWeapons();
    await syncArmor();
    
    console.log('\n🎉 Synchronisation terminée !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

// Exécuter
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
