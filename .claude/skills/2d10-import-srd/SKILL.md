---
name: 2d10-import-srd
description: Pattern des scripts d'import de référentiels SRD D&D 5e (sorts, équipement, objets magiques, et bientôt monstres) depuis l'API https://www.dnd5eapi.co. Déclencher sur : "import SRD", "synchroniser référentiel", "import-dnd5e", "nouveau script d'import D&D", "ajouter un type de donnée D&D importée", "référentiel de monstres".
---

# Import de référentiels SRD dans 2d10

Ce skill documente le pattern commun aux scripts `back/scripts/import-dnd5e-*.js`, pour écrire un nouveau script d'import cohérent avec les existants (ex. `import-dnd5e-monsters.js` à venir pour le référentiel de monstres).

## Pattern de référence

Voir [back/scripts/import-dnd5e-spells.js](back/scripts/import-dnd5e-spells.js) — même structure dans `import-dnd5e-equipment.js` et `import-dnd5e-magic-items.js` :

1. **Liste** : `GET {API_BASE}/api/2014/<type>` → tableau `results` avec `{ index, url }` par entrée.
2. **Détail** : pour chaque entrée, `GET {API_BASE}{url}` puis on mappe les champs utiles vers les colonnes du modèle Prisma cible.
3. **Upsert** : `prisma.<model>.upsert({ where: { index: mapped.index }, update: mapped, create: mapped })` — clé unique sur `index` (le slug SRD).
4. **`raw`** : le JSON complet de la réponse détail est conservé dans un champ `raw` (debug, évolutions futures sans re-fetch).
5. **Résilience** : une entrée en échec est loggée et n'interrompt pas le reste de l'import (`try/catch` par entrée, compteurs `ok`/`fail`).
6. **Throttle** : `await sleep(rateMs)` entre deux requêtes détail, pour ne pas surcharger l'API publique.

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `DND5E_IMPORT_DELAY_MS` | `120` | Pause (ms) entre deux requêtes détail. |
| `DND5E_IMPORT_LIMIT` | (vide = tout) | Limite le nombre d'entrées traitées, pour un test rapide. |

## Ajouter un nouveau type d'import (ex. monstres)

1. Créer `back/scripts/import-dnd5e-monsters.js` sur le squelette de `import-dnd5e-spells.js`, avec `LIST_URL = ${API_BASE}/api/2014/monsters`.
2. Mapper les champs de la réponse détail vers le modèle `DndMonster` déjà présent dans `back/prisma/schema.prisma` (armorClass, hitPoints, hitDice, speed, les 6 caractéristiques, challengeRating, xp, description...) — vérifier si le modèle a besoin d'un champ `index`/`slug` unique pour l'upsert (le modèle `DndMonster` actuel a `slug`, pas `index` — adapter la clé d'upsert en conséquence).
3. Ajouter le script npm dans `back/package.json` : `"import-dnd5e-monsters": "node scripts/import-dnd5e-monsters.js"`.
4. Documenter la nouvelle table dans [docs/README_DND_INTEGRATION.md](docs/README_DND_INTEGRATION.md) (tableau des scripts) une fois stabilisé.
5. Exposer une route de lecture (probablement `back/routes/dnd-local-prisma.js`, qui lit déjà `DndMonster`) et, côté front, l'intégration recherche dans `SessionInitiativeTrackerTab.tsx`.

## Historique

Les anciennes routes `/api/dnd`, le module `dnd-prisma` et les scripts `sync-dnd-*` ont été retirés (voir [docs/README_DND_INTEGRATION.md](docs/README_DND_INTEGRATION.md)). Toute nouvelle synchro de contenu SRD doit passer par le pattern `import-dnd5e-*` ci-dessus, pas par une réintroduction de l'ancien mécanisme.
