const axios = require('axios');

class DnDService {
  constructor() {
    this.baseURL = 'https://api.open5e.com';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '2d10-app/1.0.0'
      }
    });
  }

  // Méthode générique pour faire des requêtes avec gestion d'erreurs
  async makeRequest(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      console.error(`Erreur API Open5e (${endpoint}):`, error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500
      };
    }
  }

  // === SORTS ===
  async getSpells(params = {}) {
    return await this.makeRequest('/v2/spells/', params);
  }

  async getSpellById(id) {
    return await this.makeRequest(`/v2/spells/${id}/`);
  }

  async getSpellsByLevel(level) {
    return await this.makeRequest('/v2/spells/', { level });
  }

  async searchSpells(query) {
    return await this.makeRequest('/v2/spells/', { search: query });
  }

  // === MONSTRES ===
  async getMonsters(params = {}) {
    return await this.makeRequest('/v1/monsters/', params);
  }

  async getMonsterById(id) {
    return await this.makeRequest(`/v1/monsters/${id}/`);
  }

  async searchMonsters(query) {
    return await this.makeRequest('/v1/monsters/', { search: query });
  }

  async getMonstersByChallengeRating(cr) {
    return await this.makeRequest('/v1/monsters/', { challenge_rating: cr });
  }

  // === ARMES ===
  async getWeapons(params = {}) {
    return await this.makeRequest('/v2/weapons/', params);
  }

  async getWeaponById(id) {
    return await this.makeRequest(`/v2/weapons/${id}/`);
  }

  async searchWeapons(query) {
    return await this.makeRequest('/v2/weapons/', { search: query });
  }

  // === ARMURES ===
  async getArmor(params = {}) {
    return await this.makeRequest('/v2/armor/', params);
  }

  async getArmorById(id) {
    return await this.makeRequest(`/v2/armor/${id}/`);
  }

  async searchArmor(query) {
    return await this.makeRequest('/v2/armor/', { search: query });
  }

  // === OBJETS MAGIQUES ===
  async getMagicItems(params = {}) {
    return await this.makeRequest('/v1/magicitems/', params);
  }

  async getMagicItemById(id) {
    return await this.makeRequest(`/v1/magicitems/${id}/`);
  }

  async searchMagicItems(query) {
    return await this.makeRequest('/v1/magicitems/', { search: query });
  }

  // === RACES ===
  async getRaces(params = {}) {
    return await this.makeRequest('/v1/races/', params);
  }

  async getRaceById(id) {
    return await this.makeRequest(`/v1/races/${id}/`);
  }

  async searchRaces(query) {
    return await this.makeRequest('/v1/races/', { search: query });
  }

  // === CLASSES ===
  async getClasses(params = {}) {
    return await this.makeRequest('/v1/classes/', params);
  }

  async getClassById(id) {
    return await this.makeRequest(`/v1/classes/${id}/`);
  }

  async searchClasses(query) {
    return await this.makeRequest('/v1/classes/', { search: query });
  }

  // === ORIGINES ===
  async getBackgrounds(params = {}) {
    return await this.makeRequest('/v2/backgrounds/', params);
  }

  async getBackgroundById(id) {
    return await this.makeRequest(`/v2/backgrounds/${id}/`);
  }

  async searchBackgrounds(query) {
    return await this.makeRequest('/v2/backgrounds/', { search: query });
  }

  // === DONS ===
  async getFeats(params = {}) {
    return await this.makeRequest('/v2/feats/', params);
  }

  async getFeatById(id) {
    return await this.makeRequest(`/v2/feats/${id}/`);
  }

  async searchFeats(query) {
    return await this.makeRequest('/v2/feats/', { search: query });
  }

  // === CONDITIONS ===
  async getConditions(params = {}) {
    return await this.makeRequest('/v2/conditions/', params);
  }

  async getConditionById(id) {
    return await this.makeRequest(`/v2/conditions/${id}/`);
  }

  // === RECHERCHE GLOBALE ===
  async globalSearch(query, types = []) {
    const results = {};
    const searchTypes = types.length > 0 ? types : ['spells', 'monsters', 'weapons', 'armor', 'magicitems', 'races', 'classes'];
    
    const promises = searchTypes.map(async (type) => {
      try {
        const endpoint = this.getEndpointForType(type);
        const result = await this.makeRequest(endpoint, { search: query, limit: 5 });
        if (result.success) {
          results[type] = result.data;
        }
      } catch (error) {
        console.error(`Erreur lors de la recherche ${type}:`, error.message);
        results[type] = { error: error.message };
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Méthode utilitaire pour obtenir l'endpoint selon le type
  getEndpointForType(type) {
    const endpoints = {
      'spells': '/v2/spells/',
      'monsters': '/v1/monsters/',
      'weapons': '/v2/weapons/',
      'armor': '/v2/armor/',
      'magicitems': '/v1/magicitems/',
      'races': '/v1/races/',
      'classes': '/v1/classes/',
      'backgrounds': '/v2/backgrounds/',
      'feats': '/v2/feats/',
      'conditions': '/v2/conditions/'
    };
    return endpoints[type] || '/v2/spells/';
  }

  // === MÉTHODES UTILITAIRES ===
  
  // Formater les données pour l'affichage
  formatSpellForDisplay(spell) {
    return {
      id: spell.slug,
      name: spell.name,
      level: spell.level,
      school: spell.school,
      casting_time: spell.casting_time,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      description: spell.desc,
      higher_level: spell.higher_level,
      ritual: spell.ritual,
      concentration: spell.concentration
    };
  }

  formatMonsterForDisplay(monster) {
    return {
      id: monster.slug,
      name: monster.name,
      size: monster.size,
      type: monster.type,
      subtype: monster.subtype,
      alignment: monster.alignment,
      armor_class: monster.armor_class,
      hit_points: monster.hit_points,
      hit_dice: monster.hit_dice,
      speed: monster.speed,
      strength: monster.strength,
      dexterity: monster.dexterity,
      constitution: monster.constitution,
      intelligence: monster.intelligence,
      wisdom: monster.wisdom,
      charisma: monster.charisma,
      challenge_rating: monster.challenge_rating,
      xp: monster.xp,
      actions: monster.actions,
      legendary_actions: monster.legendary_actions,
      special_abilities: monster.special_abilities
    };
  }

  formatWeaponForDisplay(weapon) {
    return {
      id: weapon.slug,
      name: weapon.name,
      category: weapon.category,
      cost: weapon.cost,
      damage_dice: weapon.damage_dice,
      damage_type: weapon.damage_type,
      weight: weapon.weight,
      properties: weapon.properties,
      range: weapon.range,
      description: weapon.desc
    };
  }
}

module.exports = new DnDService();
