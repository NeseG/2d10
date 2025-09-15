#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  open5eBaseUrl: 'https://api.open5e.com',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://2d10:2d10password@localhost:5432/2d10',
  batchSize: 50,
  delayBetweenRequests: 100, // ms
  maxRetries: 3
};

// Initialiser la connexion à la base de données
const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Client HTTP pour Open5e
const httpClient = axios.create({
  baseURL: config.open5eBaseUrl,
  timeout: 10000,
  headers: {
    'User-Agent': '2d10-app/1.0.0'
  }
});

// Fonction utilitaire pour attendre
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour faire une requête avec retry
async function makeRequest(url, retries = config.maxRetries) {
  try {
    const response = await httpClient.get(url);
    return response.data;
  } catch (error) {
    if (retries > 0) {
      console.log(`Erreur lors de la requête ${url}, retry dans 2s... (${retries} tentatives restantes)`);
      await sleep(2000);
      return makeRequest(url, retries - 1);
    }
    throw error;
  }
}

// Fonction pour récupérer toutes les données paginées
async function fetchAllData(endpoint, params = {}) {
  const allData = [];
  let nextUrl = endpoint;
  let page = 1;

  console.log(`📥 Récupération des données depuis ${endpoint}...`);

  while (nextUrl) {
    try {
      console.log(`   Page ${page}...`);
      const data = await makeRequest(nextUrl, { ...params, page });
      
      if (data.results) {
        allData.push(...data.results);
        nextUrl = data.next;
      } else {
        allData.push(data);
        nextUrl = null;
      }
      
      page++;
      await sleep(config.delayBetweenRequests);
    } catch (error) {
      console.error(`Erreur lors de la récupération de la page ${page}:`, error.message);
      break;
    }
  }

  console.log(`✅ ${allData.length} éléments récupérés`);
  return allData;
}

// === FONCTIONS DE SYNCHRONISATION ===

// Synchroniser les sorts
async function syncSpells() {
  console.log('\n🔮 Synchronisation des sorts...');
  
  try {
    const spells = await fetchAllData('/v2/spells/');
    
    for (const spell of spells) {
      await pool.query(`
        INSERT INTO dnd_spells (
          slug, name, level, school, casting_time, range, components, 
          duration, description, higher_level, ritual, concentration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          level = EXCLUDED.level,
          school = EXCLUDED.school,
          casting_time = EXCLUDED.casting_time,
          range = EXCLUDED.range,
          components = EXCLUDED.components,
          duration = EXCLUDED.duration,
          description = EXCLUDED.description,
          higher_level = EXCLUDED.higher_level,
          ritual = EXCLUDED.ritual,
          concentration = EXCLUDED.concentration,
          updated_at = CURRENT_TIMESTAMP
      `, [
        spell.slug,
        spell.name,
        spell.level,
        spell.school,
        spell.casting_time,
        spell.range,
        spell.components,
        spell.desc,
        spell.higher_level,
        spell.ritual || false,
        spell.concentration || false
      ]);
    }
    
    console.log(`✅ ${spells.length} sorts synchronisés`);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des sorts:', error.message);
  }
}

// Synchroniser les monstres
async function syncMonsters() {
  console.log('\n🐉 Synchronisation des monstres...');
  
  try {
    const monsters = await fetchAllData('/v1/monsters/');
    
    for (const monster of monsters) {
      await pool.query(`
        INSERT INTO dnd_monsters (
          slug, name, size, type, subtype, alignment, armor_class, hit_points,
          hit_dice, speed, strength, dexterity, constitution, intelligence,
          wisdom, charisma, challenge_rating, xp, actions, legendary_actions,
          special_abilities, senses, languages, skills, saving_throws
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          size = EXCLUDED.size,
          type = EXCLUDED.type,
          subtype = EXCLUDED.subtype,
          alignment = EXCLUDED.alignment,
          armor_class = EXCLUDED.armor_class,
          hit_points = EXCLUDED.hit_points,
          hit_dice = EXCLUDED.hit_dice,
          speed = EXCLUDED.speed,
          strength = EXCLUDED.strength,
          dexterity = EXCLUDED.dexterity,
          constitution = EXCLUDED.constitution,
          intelligence = EXCLUDED.intelligence,
          wisdom = EXCLUDED.wisdom,
          charisma = EXCLUDED.charisma,
          challenge_rating = EXCLUDED.challenge_rating,
          xp = EXCLUDED.xp,
          actions = EXCLUDED.actions,
          legendary_actions = EXCLUDED.legendary_actions,
          special_abilities = EXCLUDED.special_abilities,
          senses = EXCLUDED.senses,
          languages = EXCLUDED.languages,
          skills = EXCLUDED.skills,
          saving_throws = EXCLUDED.saving_throws,
          updated_at = CURRENT_TIMESTAMP
      `, [
        monster.slug,
        monster.name,
        monster.size,
        monster.type,
        monster.subtype,
        monster.alignment,
        monster.armor_class,
        monster.hit_points,
        monster.hit_dice,
        JSON.stringify(monster.speed),
        monster.strength,
        monster.dexterity,
        monster.constitution,
        monster.intelligence,
        monster.wisdom,
        monster.charisma,
        monster.challenge_rating,
        monster.xp,
        JSON.stringify(monster.actions),
        JSON.stringify(monster.legendary_actions),
        JSON.stringify(monster.special_abilities),
        monster.senses,
        monster.languages,
        JSON.stringify(monster.skills),
        JSON.stringify(monster.saving_throws)
      ]);
    }
    
    console.log(`✅ ${monsters.length} monstres synchronisés`);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des monstres:', error.message);
  }
}

// Synchroniser les armes
async function syncWeapons() {
  console.log('\n⚔️ Synchronisation des armes...');
  
  try {
    const weapons = await fetchAllData('/v2/weapons/');
    
    for (const weapon of weapons) {
      await pool.query(`
        INSERT INTO dnd_weapons (
          slug, name, category, cost, damage_dice, damage_type, weight,
          properties, range, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          cost = EXCLUDED.cost,
          damage_dice = EXCLUDED.damage_dice,
          damage_type = EXCLUDED.damage_type,
          weight = EXCLUDED.weight,
          properties = EXCLUDED.properties,
          range = EXCLUDED.range,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
      `, [
        weapon.slug,
        weapon.name,
        weapon.category,
        weapon.cost,
        weapon.damage_dice,
        weapon.damage_type,
        weapon.weight,
        JSON.stringify(weapon.properties),
        weapon.range,
        weapon.desc
      ]);
    }
    
    console.log(`✅ ${weapons.length} armes synchronisées`);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des armes:', error.message);
  }
}

// Synchroniser les armures
async function syncArmor() {
  console.log('\n🛡️ Synchronisation des armures...');
  
  try {
    const armor = await fetchAllData('/v2/armor/');
    
    for (const item of armor) {
      await pool.query(`
        INSERT INTO dnd_armor (
          slug, name, armor_category, cost, armor_class, weight,
          stealth_disadvantage, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          armor_category = EXCLUDED.armor_category,
          cost = EXCLUDED.cost,
          armor_class = EXCLUDED.armor_class,
          weight = EXCLUDED.weight,
          stealth_disadvantage = EXCLUDED.stealth_disadvantage,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
      `, [
        item.slug,
        item.name,
        item.armor_category,
        item.cost,
        item.armor_class,
        item.weight,
        item.stealth_disadvantage || false,
        item.desc
      ]);
    }
    
    console.log(`✅ ${armor.length} armures synchronisées`);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des armures:', error.message);
  }
}

// Synchroniser les races
async function syncRaces() {
  console.log('\n🧝 Synchronisation des races...');
  
  try {
    const races = await fetchAllData('/v1/races/');
    
    for (const race of races) {
      await pool.query(`
        INSERT INTO dnd_races (
          slug, name, description, ability_score_increases, traits,
          subraces, age, alignment, size, speed, languages
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          ability_score_increases = EXCLUDED.ability_score_increases,
          traits = EXCLUDED.traits,
          subraces = EXCLUDED.subraces,
          age = EXCLUDED.age,
          alignment = EXCLUDED.alignment,
          size = EXCLUDED.size,
          speed = EXCLUDED.speed,
          languages = EXCLUDED.languages,
          updated_at = CURRENT_TIMESTAMP
      `, [
        race.slug,
        race.name,
        race.desc,
        JSON.stringify(race.ability_score_increases),
        JSON.stringify(race.traits),
        JSON.stringify(race.subraces),
        race.age,
        race.alignment,
        race.size,
        race.speed,
        race.languages
      ]);
    }
    
    console.log(`✅ ${races.length} races synchronisées`);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des races:', error.message);
  }
}

// Synchroniser les classes
async function syncClasses() {
  console.log('\n🧙 Synchronisation des classes...');
  
  try {
    const classes = await fetchAllData('/v1/classes/');
    
    for (const cls of classes) {
      await pool.query(`
        INSERT INTO dnd_classes (
          slug, name, description, hit_die, proficiency_choices,
          proficiencies, saving_throws, starting_equipment,
          starting_equipment_options, class_levels, multi_classing,
          spellcasting, spells, subclasses
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          hit_die = EXCLUDED.hit_die,
          proficiency_choices = EXCLUDED.proficiency_choices,
          proficiencies = EXCLUDED.proficiencies,
          saving_throws = EXCLUDED.saving_throws,
          starting_equipment = EXCLUDED.starting_equipment,
          starting_equipment_options = EXCLUDED.starting_equipment_options,
          class_levels = EXCLUDED.class_levels,
          multi_classing = EXCLUDED.multi_classing,
          spellcasting = EXCLUDED.spellcasting,
          spells = EXCLUDED.spells,
          subclasses = EXCLUDED.subclasses,
          updated_at = CURRENT_TIMESTAMP
      `, [
        cls.slug,
        cls.name,
        cls.desc,
        cls.hit_die,
        JSON.stringify(cls.proficiency_choices),
        JSON.stringify(cls.proficiencies),
        JSON.stringify(cls.saving_throws),
        JSON.stringify(cls.starting_equipment),
        JSON.stringify(cls.starting_equipment_options),
        JSON.stringify(cls.class_levels),
        JSON.stringify(cls.multi_classing),
        JSON.stringify(cls.spellcasting),
        JSON.stringify(cls.spells),
        JSON.stringify(cls.subclasses)
      ]);
    }
    
    console.log(`✅ ${classes.length} classes synchronisées`);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des classes:', error.message);
  }
}

// Fonction principale
async function main() {
  console.log('🎲 Début de la synchronisation des données D&D...');
  console.log(`📊 Base de données: ${config.databaseUrl}`);
  console.log(`🌐 API source: ${config.open5eBaseUrl}`);
  
  try {
    // Tester la connexion à la base de données
    await pool.query('SELECT NOW()');
    console.log('✅ Connexion à la base de données établie');
    
    // Créer les tables si elles n'existent pas
    await createTables();
    
    // Synchroniser toutes les données
    await syncSpells();
    await syncMonsters();
    await syncWeapons();
    await syncArmor();
    await syncRaces();
    await syncClasses();
    
    console.log('\n🎉 Synchronisation terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Créer les tables pour stocker les données D&D
async function createTables() {
  console.log('\n📋 Création des tables D&D...');
  
  const tables = [
    // Table des sorts
    `CREATE TABLE IF NOT EXISTS dnd_spells (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      level INTEGER,
      school VARCHAR(50),
      casting_time VARCHAR(100),
      range VARCHAR(100),
      components VARCHAR(100),
      duration VARCHAR(100),
      description TEXT,
      higher_level TEXT,
      ritual BOOLEAN DEFAULT false,
      concentration BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table des monstres
    `CREATE TABLE IF NOT EXISTS dnd_monsters (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      size VARCHAR(50),
      type VARCHAR(100),
      subtype VARCHAR(100),
      alignment VARCHAR(100),
      armor_class INTEGER,
      hit_points INTEGER,
      hit_dice VARCHAR(50),
      speed JSONB,
      strength INTEGER,
      dexterity INTEGER,
      constitution INTEGER,
      intelligence INTEGER,
      wisdom INTEGER,
      charisma INTEGER,
      challenge_rating VARCHAR(10),
      xp INTEGER,
      actions JSONB,
      legendary_actions JSONB,
      special_abilities JSONB,
      senses VARCHAR(200),
      languages VARCHAR(200),
      skills JSONB,
      saving_throws JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table des armes
    `CREATE TABLE IF NOT EXISTS dnd_weapons (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100),
      cost VARCHAR(50),
      damage_dice VARCHAR(50),
      damage_type VARCHAR(100),
      weight DECIMAL(5,2),
      properties JSONB,
      range VARCHAR(100),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table des armures
    `CREATE TABLE IF NOT EXISTS dnd_armor (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      armor_category VARCHAR(100),
      cost VARCHAR(50),
      armor_class INTEGER,
      weight DECIMAL(5,2),
      stealth_disadvantage BOOLEAN DEFAULT false,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table des races
    `CREATE TABLE IF NOT EXISTS dnd_races (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      ability_score_increases JSONB,
      traits JSONB,
      subraces JSONB,
      age VARCHAR(200),
      alignment VARCHAR(200),
      size VARCHAR(50),
      speed VARCHAR(100),
      languages VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table des classes
    `CREATE TABLE IF NOT EXISTS dnd_classes (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      hit_die VARCHAR(10),
      proficiency_choices JSONB,
      proficiencies JSONB,
      saving_throws JSONB,
      starting_equipment JSONB,
      starting_equipment_options JSONB,
      class_levels JSONB,
      multi_classing JSONB,
      spellcasting JSONB,
      spells JSONB,
      subclasses JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  for (const table of tables) {
    await pool.query(table);
  }
  
  console.log('✅ Tables D&D créées');
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  syncSpells,
  syncMonsters,
  syncWeapons,
  syncArmor,
  syncRaces,
  syncClasses,
  main
};
