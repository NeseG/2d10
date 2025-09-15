#!/usr/bin/env node

const fs = require('fs');

// Structure de base de la collection
const collection = {
  "info": {
    "name": "2d10 API Collection v2",
    "description": "Collection complète pour l'API 2d10 avec authentification, administration, campagnes et intégration D&D",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "version": "2.0.0"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "authToken",
      "value": "",
      "type": "string"
    },
    {
      "key": "adminEmail",
      "value": "admin@2d10.com",
      "type": "string"
    },
    {
      "key": "adminPassword",
      "value": "admin123",
      "type": "string"
    }
  ],
  "item": []
};

// Fonction pour créer une requête
function createRequest(name, method, path, headers = [], body = null, tests = null) {
  const request = {
    "name": name,
    "request": {
      "method": method,
      "header": [
        {
          "key": "Content-Type",
          "value": "application/json",
          "type": "text"
        },
        ...headers
      ],
      "url": {
        "raw": `{{baseUrl}}${path}`,
        "host": ["{{baseUrl}}"],
        "path": path.split('/').filter(p => p)
      }
    }
  };

  if (body) {
    request.request.body = {
      "mode": "raw",
      "raw": JSON.stringify(body, null, 2),
      "options": {
        "raw": {
          "language": "json"
        }
      }
    };
  }

  if (tests) {
    request.event = [
      {
        "listen": "test",
        "script": {
          "exec": tests,
          "type": "text/javascript"
        }
      }
    ];
  }

  return request;
}

// Fonction pour créer un dossier
function createFolder(name, items) {
  return {
    "name": name,
    "item": items
  };
}

// Routes de base
const healthCheck = createRequest("Health Check", "GET", "/health");
const apiInfo = createRequest("API Info", "GET", "/");

// Authentification
const authFolder = createFolder("Authentication", [
  createRequest("Login Admin", "POST", "/api/auth/login", [], 
    { "email": "{{adminEmail}}", "password": "{{adminPassword}}" },
    [
      "if (pm.response.code === 200) {",
      "    const response = pm.response.json();",
      "    pm.collectionVariables.set('authToken', response.token);",
      "    console.log('Token saved:', response.token);",
      "}"
    ]
  ),
  createRequest("Register User", "POST", "/api/auth/register", [], 
    {
      "username": "testuser",
      "email": "test@example.com",
      "password": "password123",
      "role": "user"
    }
  ),
  createRequest("Get Profile", "GET", "/api/auth/profile", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Logout", "POST", "/api/auth/logout", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// Administration
const adminFolder = createFolder("Administration", [
  createRequest("Get All Users", "GET", "/api/admin/users", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get User by ID", "GET", "/api/admin/users/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Create User", "POST", "/api/admin/users", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "username": "newuser",
      "email": "new@example.com",
      "password": "password123",
      "role": "user"
    }
  ),
  createRequest("Update User", "PUT", "/api/admin/users/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "username": "updateduser",
      "email": "updated@example.com",
      "role": "gm"
    }
  ),
  createRequest("Deactivate User", "DELETE", "/api/admin/users/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Statistics", "GET", "/api/admin/stats", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// Personnages
const charactersFolder = createFolder("Characters", [
  createRequest("Get All Characters", "GET", "/api/characters", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Character by ID", "GET", "/api/characters/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Create Character", "POST", "/api/characters", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "name": "Aragorn",
      "race": "Humain",
      "class": "Rôdeur",
      "level": 5,
      "background": "Ranger du Nord",
      "alignment": "Loyal Bon",
      "experience_points": 6500,
      "hit_points": 45,
      "armor_class": 16,
      "speed": 30,
      "strength": 16,
      "dexterity": 14,
      "constitution": 13,
      "intelligence": 12,
      "wisdom": 15,
      "charisma": 10,
      "description": "Un rôdeur expérimenté des terres du Nord",
      "notes": "Spécialisé dans le combat à l'arc"
    }
  ),
  createRequest("Update Character", "PUT", "/api/characters/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "level": 6,
      "hit_points": 50,
      "experience_points": 8000
    }
  ),
  createRequest("Delete Character", "DELETE", "/api/characters/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Character Stats", "GET", "/api/characters/stats/overview", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// Inventaire
const inventoryFolder = createFolder("Inventory", [
  createRequest("Get Character Inventory", "GET", "/api/inventory/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Add Item to Inventory", "POST", "/api/inventory/1/items", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "item_id": 1,
      "quantity": 2,
      "notes": "Objet trouvé dans le donjon"
    }
  ),
  createRequest("Update Inventory Item", "PUT", "/api/inventory/1/items/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "quantity": 3,
      "is_equipped": true,
      "notes": "Équipé en main droite"
    }
  ),
  createRequest("Delete Inventory Item", "DELETE", "/api/inventory/1/items/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Character Purse", "GET", "/api/inventory/1/purse", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Update Character Purse", "PUT", "/api/inventory/1/purse", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "copper_pieces": 50,
      "silver_pieces": 20,
      "gold_pieces": 100,
      "platinum_pieces": 5
    }
  ),
  createRequest("Get Items Catalog", "GET", "/api/inventory/items/catalog?type=Arme&rarity=common&search=épée", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// Objets
const itemsFolder = createFolder("Items", [
  createRequest("Get All Items", "GET", "/api/items?type=Arme&rarity=rare&magical=true", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Item by ID", "GET", "/api/items/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Create Item", "POST", "/api/items", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "name": "Épée flamboyante",
      "description": "Une épée qui brille d'une flamme magique",
      "item_type_id": 1,
      "weight": 3.5,
      "value_gold": 500,
      "rarity": "rare",
      "is_magical": true,
      "properties": {"damage": "1d8+1 feu", "bonus": "+1"}
    }
  ),
  createRequest("Update Item", "PUT", "/api/items/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "value_gold": 600,
      "properties": {"damage": "1d8+2 feu", "bonus": "+2"}
    }
  ),
  createRequest("Delete Item", "DELETE", "/api/items/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Item Types", "GET", "/api/items/types", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Create Item Type", "POST", "/api/items/types", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "name": "Instrument",
      "description": "Instruments de musique"
    }
  )
]);

// Équipement
const equipmentFolder = createFolder("Equipment", [
  createRequest("Get Character Equipment", "GET", "/api/equipment/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Equip Item", "POST", "/api/equipment/1/equip", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "inventory_id": 1,
      "equipment_slot_id": 1
    }
  ),
  createRequest("Unequip Item", "POST", "/api/equipment/1/unequip", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "inventory_id": 1
    }
  ),
  createRequest("Get Available Slots", "GET", "/api/equipment/slots/available", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// Campagnes
const campaignsFolder = createFolder("Campaigns", [
  createRequest("Get All Campaigns", "GET", "/api/campaigns", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Campaign by ID", "GET", "/api/campaigns/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Create Campaign", "POST", "/api/campaigns", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "name": "La Quête du Dragon Perdu",
      "description": "Une aventure épique dans les terres sauvages",
      "setting": "Forgotten Realms",
      "max_players": 4,
      "start_date": "2025-01-01",
      "notes": "Campagne pour débutants"
    }
  ),
  createRequest("Update Campaign", "PUT", "/api/campaigns/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "name": "La Quête du Dragon Perdu - Édition Étendue",
      "description": "Une aventure épique dans les terres sauvages avec de nouveaux défis",
      "status": "active",
      "max_players": 6
    }
  ),
  createRequest("Delete Campaign", "DELETE", "/api/campaigns/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Add Character to Campaign", "POST", "/api/campaigns/1/characters", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "character_id": 1,
      "notes": "Magicien puissant spécialisé en divination"
    }
  ),
  createRequest("Remove Character from Campaign", "DELETE", "/api/campaigns/1/characters/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Campaign Stats", "GET", "/api/campaigns/stats/overview", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// Sessions
const sessionsFolder = createFolder("Sessions", [
  createRequest("Get Campaign Sessions", "GET", "/api/sessions/campaign/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Session by ID", "GET", "/api/sessions/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Create Session", "POST", "/api/sessions", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "campaign_id": 1,
      "session_number": 1,
      "title": "Le Commencement de l'Aventure",
      "description": "Première session où les héros se rencontrent",
      "session_date": "2025-01-15",
      "start_time": "19:00",
      "end_time": "23:00",
      "location": "Table de jeu principale",
      "notes": "Session d'introduction",
      "xp_awarded": 100,
      "gold_awarded": 50.0
    }
  ),
  createRequest("Update Session", "PUT", "/api/sessions/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "title": "Le Commencement de l'Aventure - Session Étendue",
      "description": "Première session où les héros se rencontrent et découvrent leur destin",
      "xp_awarded": 150,
      "gold_awarded": 75.0,
      "notes": "Session d'introduction avec combat d'initiation"
    }
  ),
  createRequest("Delete Session", "DELETE", "/api/sessions/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Mark Attendance", "POST", "/api/sessions/1/attendance", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "character_id": 1,
      "attended": true,
      "xp_earned": 100,
      "gold_earned": 50.0,
      "notes": "Présent toute la session"
    }
  ),
  createRequest("Update Attendance", "PUT", "/api/sessions/1/attendance/1", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }],
    {
      "attended": true,
      "xp_earned": 120,
      "gold_earned": 60.0,
      "notes": "Présent avec bonus de participation"
    }
  )
]);

// D&D API (Open5e)
const dndFolder = createFolder("D&D API (Open5e)", [
  createRequest("Get Spells", "GET", "/api/dnd/spells?level=3&school=evocation&search=fire&limit=10", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Spell by ID", "GET", "/api/dnd/spells/fireball", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Monsters", "GET", "/api/dnd/monsters?challenge_rating=5&type=dragon&search=red", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Monster by ID", "GET", "/api/dnd/monsters/ancient-red-dragon", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Weapons", "GET", "/api/dnd/weapons?category=melee&search=sword", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Weapon by ID", "GET", "/api/dnd/weapons/longsword", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Armor", "GET", "/api/dnd/armor?armor_category=heavy&search=plate", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Armor by ID", "GET", "/api/dnd/armor/plate-armor", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Races", "GET", "/api/dnd/races?search=elf", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Race by ID", "GET", "/api/dnd/races/high-elf", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Classes", "GET", "/api/dnd/classes?search=wizard", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Class by ID", "GET", "/api/dnd/classes/wizard", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Global Search", "GET", "/api/dnd/search?q=fire&types=spells,monsters,weapons", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("API Info", "GET", "/api/dnd/info", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// D&D Local
const dndLocalFolder = createFolder("D&D Local", [
  createRequest("Get Local Spells", "GET", "/api/dnd-local/spells?level=3&school=evocation&search=fire&limit=10", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Spell by Slug", "GET", "/api/dnd-local/spells/fireball", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Monsters", "GET", "/api/dnd-local/monsters?challenge_rating=5&type=dragon&search=red", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Monster by Slug", "GET", "/api/dnd-local/monsters/ancient-red-dragon", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Weapons", "GET", "/api/dnd-local/weapons?category=melee&search=sword", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Weapon by Slug", "GET", "/api/dnd-local/weapons/longsword", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Armor", "GET", "/api/dnd-local/armor?armor_category=heavy&search=plate", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Armor by Slug", "GET", "/api/dnd-local/armor/plate-armor", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Items", "GET", "/api/dnd-local/items?category=Weapon&rarity=Rare&search=sword", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Get Local Item by Slug", "GET", "/api/dnd-local/items/flame-tongue", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Local Global Search", "GET", "/api/dnd-local/search?q=magic&types=spells,items", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  ),
  createRequest("Local Stats", "GET", "/api/dnd-local/stats", 
    [{ "key": "Authorization", "value": "Bearer {{authToken}}", "type": "text" }]
  )
]);

// Assembler la collection
collection.item = [
  healthCheck,
  apiInfo,
  authFolder,
  adminFolder,
  charactersFolder,
  inventoryFolder,
  itemsFolder,
  equipmentFolder,
  campaignsFolder,
  sessionsFolder,
  dndFolder,
  dndLocalFolder
];

// Écrire le fichier
fs.writeFileSync('2d10_API_Collection_v2.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Collection Postman v2 générée avec succès !');
