# 2d10 — Backend API (Express + Prisma)

API REST pour la gestion de personnages D&D 5e, campagnes, sessions, inventaire et grimoire. Base **PostgreSQL**, ORM **Prisma**, auth **JWT**.

## Documentation

| Fichier | Contenu |
|---------|---------|
| [Documentation API complète](../docs/COMPLETE_API_DOCUMENTATION.md) | Référence détaillée des routes |
| [Données D&D 5e & imports](../docs/README_DND_INTEGRATION.md) | Scripts `import-dnd5e-*`, variables d’environnement |
| [Index documentation](../docs/README.md) | Liens vers les autres guides |
| [README racine](../README.md) | Vue d’ensemble du dépôt, Docker |

## Démarrage rapide

```bash
cd back
# Créer un fichier .env avec au minimum DATABASE_URL et JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed    # utilisateur admin de test
npm start              # écoute sur PORT (défaut 3000)
```

Avec **Docker Compose** (conteneur `back` déjà lancé, même profil que `up`, ex. `back`) :

```bash
docker compose --profile back exec back npx prisma db push
```

Voir aussi la section Docker du [README racine](../README.md).

Imports optionnels des données SRD (long) :

```bash
npm run import-dnd5e-spells
npm run import-dnd5e-equipment
npm run import-dnd5e-magic-items
```

Variables utiles : `DND5E_IMPORT_DELAY_MS` (défaut `120`), `DND5E_IMPORT_LIMIT` (limite d’entrées pour un essai).

### Import personnage (feuille Excel → JSON)

- **Sur la machine qui voit la base** : `CHARACTER_USER_ID=<id> npm run import:character-json` ou `node scripts/import-excel-character.js chemin/vers/fiche.json` (voir `scripts/examples/revan-feuille-excel.json`).
- **À distance** : `POST /api/admin/characters/import` avec un JWT **admin** et un corps JSON identique au fichier (inclure `userId` du joueur propriétaire).

Exemple :

```bash
curl -sS -X POST "https://ton-serveur/api/admin/characters/import" \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d @scripts/examples/revan-feuille-excel.json
```

(Ajoutez `"userId": 2` dans le JSON si ce champ n’y est pas déjà.)

## Technologies

- Node.js, Express 4
- Prisma 5 + PostgreSQL
- JWT (`jsonwebtoken`), bcryptjs, CORS

Les données de référence D&D 5e importées proviennent de l’API publique [D&D 5e API](https://www.dnd5eapi.co/) (règles 2014), pas d’un proxy Open5e à l’exécution.

## Points d’entrée HTTP

- `GET /` — métadonnées API et liste des préfixes
- `GET /health` — statut + test base Prisma

Toutes les routes métier sont sous **`/api/...`** et nécessitent en général un en-tête  
`Authorization: Bearer <token>` (sauf `POST /api/auth/register` et `POST /api/auth/login`).

## Aperçu des routes `/api`

### Authentification
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`, `POST /api/auth/logout`

### Administration (admin)
- `GET|POST /api/admin/users`, `GET|PUT|DELETE /api/admin/users/:id`, `GET /api/admin/stats`
- `POST /api/admin/characters/import` — import personnage depuis JSON (feuille Excel), voir section ci-dessus

### Personnages
- `GET|POST /api/characters`, `GET|PUT|DELETE /api/characters/:id`
- `GET|POST /api/characters/:id/features`, `PUT|DELETE /api/characters/:id/features/:featureId`
- `GET /api/characters/stats/overview` (gm/admin)

### Inventaire
- `GET|POST /api/inventory/:characterId`, `PUT|DELETE /api/inventory/:characterId/items/:inventoryId`
- `GET /api/inventory/items/catalog` — catalogue d’objets pour ajout à la fiche

### Bourse
- `GET|PUT /api/purse/:characterId`, `POST /api/purse/:characterId/add`, `POST /api/purse/:characterId/remove`

### Objets (catalogue)
- `GET /api/items`, `GET /api/items/types`, `GET /api/items/:id`
- `POST /api/items` (utilisateur authentifié), `POST /api/items/:id/validate-catalog` (admin — item custom → catalogue `dnd5e_equipment`), `PUT /api/items/:id` (admin/gm ou objet dans l’inventaire d’un perso du joueur), `DELETE /api/items/:id` (admin), `POST /api/items/types` (admin/gm)

### Équipement (slots)
- `GET /api/equipment/:characterId`, `POST .../equip`, `POST .../unequip`, `GET /api/equipment/slots/available`

### Grimoire
- `GET /api/grimoire/:characterId`, `POST .../spells` (body : `spell_id` = id table `Spell`)
- `PUT|DELETE /api/grimoire/:characterId/spells/:grimoireEntryId` (id **ligne grimoire**)
- `POST .../prepare`, `POST .../cast/:grimoireEntryId`, `GET .../search`, `GET .../stats`

### Campagnes
- `GET|POST /api/campaigns`, `GET|PUT|DELETE /api/campaigns/:campaignId`
- `POST|DELETE /api/campaigns/:campaignId/characters`, `GET /api/campaigns/stats/overview` (gm/admin)

### Sessions
- `GET /api/sessions/active`
- `GET /api/sessions/campaign/:campaignId`
- `GET /api/sessions/:sessionId` — détail + `attendance` + `campaign_characters`
- `POST /api/sessions/campaign/:campaignId` — création (`session_number`, `session_date` requis)
- `PUT|DELETE /api/sessions/:sessionId`
- `POST /api/sessions/:sessionId/attendance` — upsert présence (gm/admin)
- `GET|PUT /api/sessions/:sessionId/characters/:characterId/state` — PV / dés de vie de session
- `GET /api/sessions/stats/overview` (gm/admin)

### Données D&D 5e importées (`/api/dnd5e`)
- `GET /api/dnd5e/equipment`, `.../equipment/:index`, `.../equipment/search`
- `GET /api/dnd5e/magic-items`, `.../magic-items/:index`
- `GET /api/dnd5e/spells`, `.../spells/:index`
- `POST .../characters/:characterId/inventory`, `.../inventory/magic-item`, `.../grimoire` (admin/gm)
- `GET .../characters/:characterId/inventory`

### Données D&D locales (`/api/dnd-local`)
- `spells`, `monsters`, `weapons`, `armor`, `items` (+ détail par `:index` ou `:slug` selon route)
- `GET /api/dnd-local/search?q=...&types=...`, `GET /api/dnd-local/stats`

### Sorts applicatifs
- `GET|POST /api/spells`, `GET|PUT /api/spells/:id`, `POST /api/spells/:id/validate-catalog` (admin — sort custom → catalogue `dnd5e_spells_import`)

> Détail des corps JSON, codes d’erreur et exemples : [COMPLETE_API_DOCUMENTATION.md](../docs/COMPLETE_API_DOCUMENTATION.md).

## Tests rapides

```bash
curl -s http://localhost:3000/health
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@2d10.com","password":"admin123"}'
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dnd-local/stats"
```

Collections Postman : `postman/2d10_Complete_API_Collection.postman_collection.json`.

## Compte seed (développement)

- Email : `admin@2d10.com`
- Mot de passe : `admin123`
- Rôle : `admin`

## Scripts npm utiles

| Script | Rôle |
|--------|------|
| `start` / `dev` | `node index-prisma.js` / nodemon |
| `prisma:generate` | Client Prisma |
| `prisma:push` | Schéma → DB (dev) |
| `prisma:seed` | Données initiales |
| `import-dnd5e-spells` | Import sorts SRD |
| `import-dnd5e-equipment` | Import équipement SRD |
| `import-dnd5e-magic-items` | Import objets magiques SRD |

## Licence

Le dépôt indique une licence dans le fichier `LICENSE` à la racine du projet.
