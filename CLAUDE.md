# 2d10 — CLAUDE.md

## Description fonctionnelle

2d10 est une application de gestion de personnages et de campagnes D&D 5e : création/édition de personnages (stats, inventaire, sorts, capacités), gestion de campagnes et de sessions de jeu en direct (chat, dés, tracker d'initiative, cartes), et un catalogue de données SRD (sorts, équipement, objets magiques, monstres) importé depuis des API publiques.

## Stack technique et architecture

- **Backend** : Node.js + Express, ORM **Prisma 5.7** sur **PostgreSQL**, auth **JWT** (bcryptjs), WebSocket (`ws`) pour le temps réel des sessions.
- **Frontend** : **React 19** + **TypeScript** + **Vite**, routing avec `react-router-dom` 7, CSS custom (pas de framework UI) avec système de palettes de thème.
- **Docker** : `docker-compose.yml` à la racine, profils `back` (API + DB + pgAdmin), `full` (+ frontend Vite), `production` (Nginx).
- Le frontend consomme l'API REST du backend (`http://localhost:3000` en dev) et une connexion WebSocket pour les sessions en direct.

## Structure des dossiers

```
2d10/
├── back/
│   ├── index-prisma.js        # point d'entrée serveur (npm start / dev)
│   ├── routes/*-prisma.js     # routes Express par domaine (auth, characters, campaigns, sessions, inventory, grimoire, dnd5e-*, dnd-local, ...)
│   ├── middleware/auth.js     # vérification JWT + rôles (User/GM/Admin)
│   ├── lib/                   # helpers (upload avatar/carte, tri inventaire, import perso JSON, accès chat session)
│   ├── services/dndService.js # logique liée aux données D&D
│   ├── prisma/schema.prisma   # schéma DB (~28 modèles)
│   ├── scripts/import-dnd5e-*.js  # imports batch depuis https://www.dnd5eapi.co
│   ├── ws/                    # gestion WebSocket (dés, initiative, chat de session)
│   └── postman/                # collections Postman
├── front/
│   └── src/
│       ├── app/                # layout, providers, thème (palettes), routes, hooks globaux
│       ├── features/           # un dossier par domaine métier (characters, campaigns, sessions, inventory, spells, notes, maps, users, auth, dashboard)
│       ├── shared/              # composants, API client, utils, mocks partagés
│       ├── components/, pages/, services/, types/
├── docs/                       # documentation API et guides (voir docs/README.md)
├── nginx/                      # config reverse proxy (profil production)
└── docker-compose.yml
```

Chaque feature front suit le pattern `features/<domaine>/{components,pages}`.

## Commandes essentielles

### Backend (`back/`)
```bash
npm install
npm run prisma:generate && npm run prisma:push && npm run prisma:seed
npm start        # ou npm run dev (nodemon)
npm run import-dnd5e-spells        # imports SRD (voir docs/README_DND_INTEGRATION.md)
npm run import-dnd5e-equipment
npm run import-dnd5e-magic-items
```

### Frontend (`front/`)
```bash
npm install
npm run dev       # Vite, http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint
```

### Docker
```bash
docker compose --profile back up -d     # API + DB + pgAdmin
docker compose --profile full up -d     # + frontend Vite
docker compose --profile production up -d
```

Compte de test : `admin@2d10.com` / `admin123`.

## Conventions de code observées

- **Backend** : fichiers de routes suffixés `-prisma.js` (héritage d'une migration historique depuis du SQL brut — voir Pièges ci-dessous), un fichier par domaine métier. Middleware `auth.js` pour la vérification JWT/rôles, appliqué route par route.
- **Frontend** : organisation par feature (`features/<domaine>/components`, `.../pages`), composants en `PascalCase.tsx`, un fichier par onglet/tab pour les pages complexes (ex. `CharacterInventoryTab.tsx`, `SessionInitiativeTrackerTab.tsx`).
- **Thème** : palettes centralisées dans `front/src/app/theme/` (`palettes.ts`, `applyPalette.ts`, `initTheme.ts`), pas de dépendance externe pour le theming.
- **Import SRD** : chaque type de donnée importée a son propre script (`scripts/import-dnd5e-<type>.js`) qui `upsert` sur un champ `index`/`slug` unique, avec le JSON brut souvent conservé dans un champ `raw`. Variables d'env `DND5E_IMPORT_DELAY_MS` (throttle) et `DND5E_IMPORT_LIMIT` (test rapide).

## Pièges ou contraintes connus

- Le suffixe `-prisma` dans les noms de fichiers (`routes/*-prisma.js`, `test-prisma-*.js`) est un **résidu historique** de la migration depuis des requêtes SQL brutes (`pg`) vers Prisma (voir `back/scripts/rollback-to-postgres.js`). Ne pas reproduire cette convention pour du nouveau code : elle n'apporte rien aujourd'hui, tout le projet est sur Prisma.
- Le modèle `DndMonster` existe déjà dans `prisma/schema.prisma` mais, contrairement à `Dnd5eSpellImport`/`Dnd5eEquipment`/`Dnd5eMagicItem`, **il n'a pas de script d'import dédié** (`import-dnd5e-monsters.js` n'existe pas encore) — à créer pour le référentiel de monstres (branche `feature/referentiel-monstres`, voir [TODO.md](TODO.md)).
- Le dossier `documentation/` à la racine existe mais est **vide** — ne pas y écrire par erreur en pensant que c'est `docs/`.
- `docs/README.md` référence un `POSTMAN_GUIDE.md` qui n'existe pas sur le disque — lien mort à corriger ou fichier à créer.
- Import SRD : nécessite un accès réseau sortant vers `https://www.dnd5eapi.co` (ou toute autre API source pour un futur import monstres).
