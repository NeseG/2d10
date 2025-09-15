#!/usr/bin/env node

const fs = require('fs');

// Lire la collection existante
const existingCollection = JSON.parse(fs.readFileSync('2d10_API_Collection.postman_collection.json', 'utf8'));

// Ajouter les routes du grimoire
const grimoireFolder = {
  "name": "Grimoire",
  "item": [
    {
      "name": "Get Character Grimoire",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1?level=3&school=evocation&prepared_only=true",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1"],
          "query": [
            {
              "key": "level",
              "value": "3"
            },
            {
              "key": "school",
              "value": "evocation"
            },
            {
              "key": "prepared_only",
              "value": "true"
            }
          ]
        }
      }
    },
    {
      "name": "Add Spell to Grimoire",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"spell_slug\": \"fireball\",\n  \"spell_name\": \"Fireball\",\n  \"spell_level\": 3,\n  \"spell_school\": \"evocation\",\n  \"is_prepared\": false,\n  \"is_known\": true,\n  \"notes\": \"Sort appris au niveau 5\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1/spells",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1", "spells"]
        }
      }
    },
    {
      "name": "Update Spell in Grimoire",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"is_prepared\": true,\n  \"is_known\": true,\n  \"times_prepared\": 2,\n  \"times_cast\": 5,\n  \"notes\": \"Sort favori du personnage\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1/spells/1",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1", "spells", "1"]
        }
      }
    },
    {
      "name": "Delete Spell from Grimoire",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1/spells/1",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1", "spells", "1"]
        }
      }
    },
    {
      "name": "Prepare Spells",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"spell_ids\": [1, 3, 5, 7]\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1/prepare",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1", "prepare"]
        }
      }
    },
    {
      "name": "Cast Spell",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1/cast/1",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1", "cast", "1"]
        }
      }
    },
    {
      "name": "Search Spells for Grimoire",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1/search?q=fire&level=3&school=evocation&limit=10",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1", "search"],
          "query": [
            {
              "key": "q",
              "value": "fire"
            },
            {
              "key": "level",
              "value": "3"
            },
            {
              "key": "school",
              "value": "evocation"
            },
            {
              "key": "limit",
              "value": "10"
            }
          ]
        }
      }
    },
    {
      "name": "Get Grimoire Stats",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/grimoire/1/stats",
          "host": ["{{baseUrl}}"],
          "path": ["api", "grimoire", "1", "stats"]
        }
      }
    }
  ]
};

// Ajouter le dossier grimoire à la collection
existingCollection.item.push(grimoireFolder);

// Mettre à jour la version
existingCollection.info.version = "2.0.0";
existingCollection.info.description = "Collection complète pour l'API 2d10 avec authentification, administration, campagnes, grimoire et intégration D&D";

// Mettre à jour la liste des endpoints dans la route racine
const rootRoute = existingCollection.item.find(item => item.name === "API Info");
if (rootRoute && rootRoute.request && rootRoute.request.url) {
  // Ajouter grimoire aux endpoints listés
  const response = {
    "message": "2d10 Application is running!",
    "version": "2.0.0",
    "endpoints": {
      "auth": "/api/auth",
      "admin": "/api/admin",
      "characters": "/api/characters",
      "inventory": "/api/inventory",
      "items": "/api/items",
      "equipment": "/api/equipment",
      "grimoire": "/api/grimoire",
      "dnd": "/api/dnd",
      "dndLocal": "/api/dnd-local",
      "purse": "/api/purse",
      "campaigns": "/api/campaigns",
      "sessions": "/api/sessions",
      "health": "/health"
    }
  };
  
  // Ajouter une réponse d'exemple pour la route API Info
  if (!rootRoute.response) {
    rootRoute.response = [];
  }
  rootRoute.response.push({
    "name": "API Info Response",
    "originalRequest": rootRoute.request,
    "status": "OK",
    "code": 200,
    "_postman_previewlanguage": "json",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "cookie": [],
    "body": JSON.stringify(response, null, 2)
  });
}

// Écrire la collection mise à jour
fs.writeFileSync('2d10_API_Collection_v2.postman_collection.json', JSON.stringify(existingCollection, null, 2));
console.log('Collection Postman v2 mise à jour avec succès !');
console.log('Nouveau fichier: 2d10_API_Collection_v2.postman_collection.json');
