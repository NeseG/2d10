# Données D&D 5e dans 2d10

Ce projet **ne proxy plus** une API `/api/dnd` ni Open5e. Les contenus SRD utilisés par l’application proviennent de :

1. **Tables Prisma** alimentées par des **scripts d’import** (API publique [D&D 5e API](https://www.dnd5eapi.co/), jeu de règles `2014`).
2. **`/api/dnd-local`** — lecture des jeux de données déjà présents en base (monstres, armes, armures, table `dnd_items`, etc.).
3. **`/api/dnd5e`** — listes paginées et détails des **imports** (équipement, sorts, objets magiques, monstres) + routes utilitaires pour copier vers personnage (réservées **admin** / **gm**).
4. **`/api/spells`** — sorts **applicatifs** (table `Spell` : copies, sorts custom, liés au grimoire).
5. **`/api/monsters`** — monstres **applicatifs** (table `Monster` : copies, monstres custom créés par **MJ**/**admin**, validables vers le catalogue importé).

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
| `npm run import-dnd5e-monsters` | `scripts/import-dnd5e-monsters.js` | `DndMonster` (clé d'upsert : `slug`, pas `index`) |

Ordre recommandé : **spells** et **equipment** (le front liste l’équipement et les sorts importés) ; **magic-items** si vous utilisez l’ajout d’objets magiques depuis le catalogue D&D 5e ; **monsters** pour le référentiel de monstres.

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
- **Monstres personnalisés + validation (comme les sorts)** :
  - `POST /api/monsters` (MJ/admin) — crée un monstre custom (`source: 'custom'`, visible tout de suite dans `GET /api/monsters`).
  - `PUT /api/monsters/:id` (MJ/admin) — édite un monstre custom ou une copie.
  - `POST /api/monsters/:id/validate-catalog` (admin) — copie le monstre custom dans `DndMonster` (catalogue importé) et bascule son `source` à `'dnd5e'`.
  - `DELETE /api/dnd5e/monsters/:slug` (admin/gm) — retire une entrée du catalogue importé.

---

## Tests rapides

```bash
# Après login, avec un JWT
curl -s -H "Authorization: Bearer <token>" "http://localhost:3000/api/dnd-local/stats"
curl -s -H "Authorization: Bearer <token>" "http://localhost:3000/api/dnd5e/spells?limit=5&page=1"
```

Collections Postman : `back/postman/2d10_Complete_API_Collection.postman_collection.json`.

---

## Référentiel bilingue FR/EN

Les 4 tables de catalogue importé (`Dnd5eSpellImport`, `DndMonster`, `Dnd5eEquipment`, `Dnd5eMagicItem`) ont des colonnes `*Fr` (nom, description, et quelques champs à vocabulaire fixe selon la table) en plus des champs anglais d'origine. Voir [décision 0004](decisions/0004-referentiel-bilingue-fr-en.md) pour le détail.

- `npm run` n'existe pas pour cette étape : `node scripts/translate-dictionaries-fr.js` traduit les champs à vocabulaire fixe (écoles, tailles, types, raretés...) de façon déterministe et ré-exécutable sans risque.
- `node scripts/apply-translations-fr.js <spells|monsters|equipment|magicitems> <fichier.json> [...]` applique des traductions de noms/descriptions (texte libre) depuis un export JSON `[{ id, nameFr, descriptionFr }, ...]` — utilisé pour la traduction initiale complète du catalogue (317 sorts, 334 monstres, 237 équipements, 362 objets magiques), traduit manuellement/par agents faute d'intégration de traduction automatique dans le projet.
- Le frontend affiche la langue choisie via un contexte `LanguageProvider` (toggle dans le bandeau supérieur) et l'utilitaire `pickLang()`, qui retombe sur l'anglais si la traduction française est absente.
- **Limite connue** : les scripts `import-dnd5e-*.js` ne remplissent pas les champs `*Fr`. Une nouvelle entrée SRD apparue lors d'un futur ré-import restera non traduite tant qu'une passe de traduction dédiée n'est pas relancée pour les entrées manquantes.

---

## Historique

Les anciennes routes **`/api/dnd`**, le module **`dnd-prisma`** et les scripts **`sync-dnd-*`** ont été retirés. Toute nouvelle synchro de contenu SRD doit passer par les **`import-dnd5e-*`** ci-dessus.
