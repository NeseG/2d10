# 0002 — Organisation du frontend par domaine métier (features)

Date : 2026-09-18 (rédigé rétroactivement, observé dans la structure `front/src/features/*`)
Statut : Accepté

## Contexte

Le frontend React couvre de nombreux domaines fonctionnels indépendants (personnages, campagnes, sessions, inventaire, sorts, notes, cartes, utilisateurs, auth, dashboard). Il fallait choisir comment organiser les fichiers source pour que le projet reste navigable à mesure que les domaines s'ajoutent.

## Décision

Organiser `front/src/` par **feature métier** plutôt que par type technique : chaque domaine a son propre dossier `features/<domaine>/{components,pages}` regroupant tout ce qui lui est propre (ex. `features/sessions/components/SessionInitiativeTrackerTab.tsx`, `features/characters/pages/CharacterEditPage.tsx`). Le code réellement partagé entre domaines vit dans `shared/` (composants, API client, utils, mocks), et les préoccupations transverses de l'app (layout, thème, routing, providers) vivent dans `app/`.

## Alternatives écartées

- **Organisation par type technique** (`components/`, `pages/`, `hooks/` à plat pour tout le projet) — écarté : avec 10 domaines métier distincts, ce découpage aurait dilué chaque domaine dans des dossiers fourre-tout et rendu plus difficile de savoir quels fichiers appartiennent ensemble.
- **Un seul dossier par écran sans regroupement par domaine** — écarté : aurait dupliqué la logique de navigation/état déjà présente au niveau feature (ex. onglets multiples d'une fiche personnage).

## Conséquences

- Ajouter un nouveau domaine métier (ex. le référentiel de monstres en cours sur `feature/referentiel-monstres`) suit un pattern connu : créer `features/monsters/{components,pages}` plutôt que d'éparpiller les fichiers.
- Le code réellement transverse doit être identifié comme tel et placé dans `shared/` ou `app/` — sans discipline, le risque est que `shared/` devienne un fourre-tout au fil du temps.
- Cohérent avec le style "un fichier par tab/onglet" observé dans les features complexes (personnages, sessions), ce qui garde chaque fichier focalisé sur une seule responsabilité UI.
