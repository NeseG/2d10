# TODO

Mis à jour manuellement à chaque session. Voir aussi [docs/dev-log.md](docs/dev-log.md) pour le détail des décisions.

## En cours

- **Référentiel de monstres** (`feature/referentiel-monstres`) :
  - ✅ Script d'import `back/scripts/import-dnd5e-monsters.js` (source `https://www.dnd5eapi.co/api/2014/monsters`, upsert sur `slug` dans `DndMonster`, champs `raw`/`updatedAt` ajoutés au modèle). Lancé via `npm run import-dnd5e-monsters`.
  - ✅ Modèle `Monster` (table `monsters`) ajouté sur le modèle de `Spell` : catalogue applicatif avec `source: 'dnd5e' | 'custom'`, `isActive`. Les MJ et admins peuvent créer des monstres personnalisés (`POST /api/monsters`, restreint via `requireRole(['admin','gm'])`).
  - ✅ Validation admin : `POST /api/monsters/:id/validate-catalog` copie un monstre custom vers `DndMonster` (catalogue commun/importé) et bascule son `source` à `'dnd5e'` — même pattern que `POST /api/spells/:id/validate-catalog`.
  - ✅ Routes de lecture/suppression du catalogue importé : `GET/DELETE /api/dnd5e/monsters(/:slug)` (mêmes conventions que `dnd5e-spells-prisma.js`).
  - ⬜ Permettre d'ajouter un monstre, via une recherche, directement dans le **tracker d'initiative** des sessions (`front/src/features/sessions/components/SessionInitiativeTrackerTab.tsx`) — pas encore fait, prévu en étape suivante.
  - ✅ Page `/referentiel` (admin/gm) : onglets Sorts / Monstres, recherche + filtres (niveau/école, type/CR), création de sort/monstre personnalisé (modale basée sur « Créer un sort » du grimoire), validation admin vers le catalogue importé. Voir `front/src/features/referentiel/`.
  - ✅ Référentiel bilingue FR/EN : champs `*Fr` ajoutés aux 4 tables importées (`Dnd5eSpellImport`, `DndMonster`, `Dnd5eEquipment`, `Dnd5eMagicItem`), toggle FR/EN dans le bandeau supérieur (`LanguageProvider`/`LanguageToggle`), traduction complète des 1250 entrées existantes (317 sorts, 334 monstres, 237 équipements, 362 objets magiques) — dictionnaires déterministes (écoles, tailles, types, raretés...) + traduction de contenu (noms/descriptions) via agents. Voir [décision 0004](docs/decisions/0004-referentiel-bilingue-fr-en.md).
  - En parallèle, modifications non commitées en cours sur `front/src/app/layout/AppLayout.tsx` et `front/src/index.css`.

## Bloqué

- Rien identifié pour l'instant.

## Prochaines étapes

- Définir le format de recherche/filtre pour l'ajout de monstre dans le tracker d'initiative (par nom, type, challenge rating ?) et brancher `/api/monsters` + `/api/dnd5e/monsters` dessus.
- Décider si une UI admin est nécessaire pour la validation des monstres (et sorts) custom, ou si ça reste un flux API uniquement pour l'instant.
- Mettre à jour `docs/COMPLETE_API_DOCUMENTATION.md` avec les nouvelles routes `/api/monsters` et `/api/dnd5e/monsters`.
- Les scripts d'import (`import-dnd5e-*.js`) ne remplissent pas les champs `*Fr` : toute nouvelle entrée SRD importée plus tard (ou lors d'un ré-import) arrivera sans traduction française tant qu'une passe de traduction dédiée n'est pas relancée pour les nouvelles entrées.
- Pas d'UI pour éditer manuellement une traduction FR incorrecte ou approximative (les traductions ont été générées en masse par des agents ; une relecture ciblée reste possible en écrivant directement en base).
