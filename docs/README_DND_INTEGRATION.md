# Données D&D 5e dans 2d10

Ce projet **ne proxy plus** une API `/api/dnd` ni Open5e. Les contenus SRD utilisés par l’application proviennent de :

1. **Tables Prisma** alimentées par des **scripts d’import** (API publique [D&D 5e API](https://www.dnd5eapi.co/), jeu de règles `2014`).
2. **`/api/dnd-local`** — lecture des jeux de données déjà présents en base (monstres, armes, armures, table `dnd_items`, etc.).
3. **`/api/dnd5e`** — listes paginées et détails des **imports** (équipement, sorts, objets magiques) + routes utilitaires pour copier vers personnage (réservées **admin** / **gm**).
4. **`/api/spells`** — sorts **applicatifs** (table `Spell` : copies, sorts custom, liés au grimoire).

Pour le détail des routes HTTP, voir [`COMPLETE_API_DOCUMENTATION.md`](./COMPLETE_API_DOCUMENTATION.md). Pour la procédure d’installation du backend, voir [`../back/README.md`](../back/README.md).

---

## Prérequis

- Backend installé, `DATABASE_URL` valide, schéma à jour (`npm run prisma:push` ou migrations).
- Accès réseau vers `https://www.dnd5eapi.co` pendant l’import.

---

## Scripts npm (dossier `back/`)

| Script | Fichier | Tables / modèles ciblés |
|--------|---------|-------------------------|
| `npm run import-dnd5e-spells` | `scripts/import-dnd5e-spells.js` | `Dnd5eSpellImport` |
| `npm run import-dnd5e-equipment` | `scripts/import-dnd5e-equipment.js` | `Dnd5eEquipment` |
| `npm run import-dnd5e-magic-items` | `scripts/import-dnd5e-magic-items.js` | `Dnd5eMagicItem` |

Ordre recommandé : **spells** et **equipment** (le front liste l’équipement et les sorts importés) ; **magic-items** si vous utilisez l’ajout d’objets magiques depuis le catalogue D&D 5e.

---

## Variables d’environnement (imports)

| Variable | Défaut | Rôle |
|----------|--------|------|
| `DND5E_IMPORT_DELAY_MS` | `120` | Pause entre deux requêtes détail vers l’API D&D 5e (éviter le rate limiting). |
| `DND5E_IMPORT_LIMIT` | _(vide = tout)_ | Nombre maximum d’entrées à traiter (tests rapides). |

Exemple :

```bash
cd back
DND5E_IMPORT_LIMIT=5 npm run import-dnd5e-spells
```

---

## Comportement des scripts

- Ils appellent l’API `https://www.dnd5eapi.co/api/2014/...`, récupèrent chaque ressource, puis font un **`upsert`** Prisma sur l’`index` SRD.
- Les champs bruts JSON complets sont souvent stockés dans `raw` pour debug ou évolutions futures.
- En cas d’erreur sur une entrée, le script log l’échec et continue avec les suivantes.

---

## Côté API après import

- **`GET /api/dnd5e/spells`**, **`GET /api/dnd5e/equipment`**, **`GET /api/dnd5e/magic-items`** — pagination (`limit`, `page`), filtres (`q`, `level`, `school`, `type`, `rarity`, etc. selon la route).
- **`GET /api/dnd-local/stats`** — comptages rapides (sorts importés, monstres, armes, armures, items).
- **Copie vers personnage (admin/gm)** :
  - `POST /api/dnd5e/characters/:characterId/inventory` — `equipment_id` (id numérique ligne `Dnd5eEquipment`).
  - `POST /api/dnd5e/characters/:characterId/inventory/magic-item` — `magic_item_id` (id `Dnd5eMagicItem`).
  - `POST /api/dnd5e/characters/:characterId/grimoire` — `spell_index` (chaîne `index` SRD du sort importé).

---

## Tests rapides

```bash
# Après login, avec un JWT
curl -s -H "Authorization: Bearer <token>" "http://localhost:3000/api/dnd-local/stats"
curl -s -H "Authorization: Bearer <token>" "http://localhost:3000/api/dnd5e/spells?limit=5&page=1"
```

Collections Postman : `back/postman/2d10_Complete_API_Collection.postman_collection.json`.

---

## Historique

Les anciennes routes **`/api/dnd`**, le module **`dnd-prisma`** et les scripts **`sync-dnd-*`** ont été retirés. Toute nouvelle synchro de contenu SRD doit passer par les **`import-dnd5e-*`** ci-dessus.
