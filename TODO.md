# TODO

Mis à jour manuellement à chaque session. Voir aussi [docs/dev-log.md](docs/dev-log.md) pour le détail des décisions.

## En cours

- **Référentiel d'objets magiques** :
  - ✅ Nouvel onglet « Objets » sur `/referentiel` (`front/src/features/referentiel/components/ReferentielMagicItemsTab.tsx` + `MagicItemDetailsModal.tsx`), même pattern que Sorts/Monstres : recherche, filtres rareté/catégorie, pagination, détail bilingue FR/EN via `pickLang`. Le catalogue `Dnd5eMagicItem` était déjà importé/traduit (362 entrées), seul le frontend manquait.
  - ✅ `GET /api/dnd5e/magic-items` expose désormais `nameFr`/`categoryNameFr`/`rarityFr` en liste (`back/routes/dnd5e-magic-items-prisma.js`), et `DELETE /api/dnd5e/magic-items/:index` ajouté pour parité avec sorts/monstres (retrait du catalogue importé, admin/gm).
  - ⬜ Pas de workflow « objet personnalisé / validation admin » comme pour sorts/monstres : les objets magiques n'ont pas de modèle applicatif dédié, les instances joueur restent sur `Item`/`Inventory`.

- **Référentiel de monstres** (`feature/referentiel-monstres`) :
  - ✅ Script d'import `back/scripts/import-dnd5e-monsters.js` (source `https://www.dnd5eapi.co/api/2014/monsters`, upsert sur `slug` dans `DndMonster`, champs `raw`/`updatedAt` ajoutés au modèle). Lancé via `npm run import-dnd5e-monsters`.
  - ✅ Modèle `Monster` (table `monsters`) ajouté sur le modèle de `Spell` : catalogue applicatif avec `source: 'dnd5e' | 'custom'`, `isActive`. Les MJ et admins peuvent créer des monstres personnalisés (`POST /api/monsters`, restreint via `requireRole(['admin','gm'])`).
  - ✅ Validation admin : `POST /api/monsters/:id/validate-catalog` copie un monstre custom vers `DndMonster` (catalogue commun/importé) et bascule son `source` à `'dnd5e'` — même pattern que `POST /api/spells/:id/validate-catalog`.
  - ✅ Routes de lecture/suppression du catalogue importé : `GET/DELETE /api/dnd5e/monsters(/:slug)` (mêmes conventions que `dnd5e-spells-prisma.js`).
  - ✅ Ajout d'un monstre au **tracker d'initiative** des sessions (`front/src/features/sessions/components/SessionInitiativeTrackerTab.tsx` + nouveau `AddMonsterModal.tsx`) : modal de recherche/filtre (nom, type, challenge rating) sur le catalogue importé et les monstres personnalisés, avec quantité pour ajouter plusieurs copies d'un coup (numérotées automatiquement).
  - ✅ Accès à la fiche complète d'un monstre depuis l'initiative (bouton « voir la fiche », réutilise `MonsterDetailsModal` du référentiel), visible par tous les participants de la session (lecture seule pour les joueurs).
  - ✅ Correction : `MonsterDetailsModal` n'affichait jamais les traits/actions/réactions/actions légendaires des monstres (présents uniquement dans le JSON brut `raw` importé, jamais lus par le frontend) — désormais extraits et rendus en Markdown, avec repli EN si non traduits.
  - ✅ Traduction FR des actions/capacités de monstres (334 monstres, 1503 entrées : `special_abilities`/`actions`/`reactions`/`legendary_actions`) : nouvelles colonnes JSON `specialAbilitiesFr`/`actionsFr`/`reactionsFr`/`legendaryActionsFr` sur `DndMonster`, scripts `back/scripts/extract-monster-actions-en.js` / `apply-monster-actions-fr.js` (même pattern que `apply-translations-fr.js`), traduction produite par agents dédiés puis appliquée en base — **dev local uniquement pour l'instant, pas encore poussé en production** (voir « Prochaines étapes »). Étend le pattern de la [décision 0004](docs/decisions/0004-referentiel-bilingue-fr-en.md) à des champs JSON structurés (non couvert par la décision d'origine, qui ne traitait que des chaînes plates).
  - ✅ Page `/referentiel` (admin/gm) : onglets Sorts / Monstres, recherche + filtres (niveau/école, type/CR), création de sort/monstre personnalisé (modale basée sur « Créer un sort » du grimoire), validation admin vers le catalogue importé. Voir `front/src/features/referentiel/`.
  - ✅ Référentiel bilingue FR/EN : champs `*Fr` ajoutés aux 4 tables importées (`Dnd5eSpellImport`, `DndMonster`, `Dnd5eEquipment`, `Dnd5eMagicItem`), toggle FR/EN dans le bandeau supérieur (`LanguageProvider`/`LanguageToggle`), traduction complète des 1250 entrées existantes (317 sorts, 334 monstres, 237 équipements, 362 objets magiques) — dictionnaires déterministes (écoles, tailles, types, raretés...) + traduction de contenu (noms/descriptions) via agents. Voir [décision 0004](docs/decisions/0004-referentiel-bilingue-fr-en.md).
  - ✅ Export PDF de fiche de personnage (`front/src/features/characters/pdf/`).
  - ✅ Tout commité (commit `3c668d4`), branche mergée en fast-forward dans `main` et poussée sur GitHub (25/09).
  - ✅ Déployé en production sur le Pi (`192.168.1.38`) : `git pull` sur `main`, rebuild + redémarrage des conteneurs `back`/`web` (profil `production`), sans toucher au conteneur `db` ni à son volume — `prisma db push` a appliqué le nouveau schéma sans perte de données (15 utilisateurs conservés).

## Bloqué

- Accès HTTPS externe (`https://84.103.207.0/`) : timeout, le NAT de la box ne redirige que le port 80 vers le Pi, pas le 443. Le port 443 est bien ouvert côté nginx en local ; il manque la règle NAT côté box + un certificat TLS (pas de nom de domaine pour l'instant, IP brute). Accès HTTP (`http://84.103.207.0/`) fonctionne.

## Prochaines étapes

- Appliquer au serveur de production (Pi) la migration de schéma des colonnes `*Fr` d'actions de monstres + la traduction correspondante (pour l'instant seulement en dev local) lors du prochain déploiement.
- Décider si une UI admin est nécessaire pour la validation des monstres (et sorts) custom, ou si ça reste un flux API uniquement pour l'instant.
- Mettre à jour `docs/COMPLETE_API_DOCUMENTATION.md` avec les nouvelles routes `/api/monsters` et `/api/dnd5e/monsters`.
- Les scripts d'import (`import-dnd5e-*.js`) ne remplissent pas les champs `*Fr` (noms/descriptions **et**, depuis cette session, actions/capacités) : toute nouvelle entrée SRD importée plus tard (ou lors d'un ré-import) arrivera sans traduction française tant qu'une passe de traduction dédiée n'est pas relancée pour les nouvelles entrées.
- Pas d'UI pour éditer manuellement une traduction FR incorrecte ou approximative (les traductions ont été générées en masse par des agents ; une relecture ciblée reste possible en écrivant directement en base).
- Si un accès HTTPS public est souhaité : ouvrir le port 443 dans le NAT de la box vers `192.168.1.38:443`, et prévoir soit un nom de domaine + Let's Encrypt, soit accepter l'avertissement navigateur sur certificat auto-signé/IP brute.
