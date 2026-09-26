# Changelog

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [Unreleased]

### Added
- Référentiel d'objets magiques : nouvel onglet « Objets » sur `/referentiel` (recherche, filtres rareté/catégorie, pagination, détail bilingue FR/EN) — même pattern que Sorts/Monstres, sur le catalogue `Dnd5eMagicItem` déjà importé et traduit. `GET /api/dnd5e/magic-items` expose désormais `nameFr`/`categoryNameFr`/`rarityFr` en liste ; ajout de `DELETE /api/dnd5e/magic-items/:index` pour retirer une entrée du catalogue importé (admin/gm).
- Référentiel de monstres intégré au **tracker d'initiative** des sessions : modal de recherche/filtre (nom, type, CR) sur le catalogue importé et les monstres personnalisés, ajout en quantité, et accès à la fiche complète d'un monstre déjà ajouté (bouton « voir la fiche », visible par tous les participants).
- Fiches de monstre (référentiel et tracker d'initiative) : affichage des traits spéciaux, actions, réactions et actions légendaires — auparavant présents uniquement dans le JSON brut importé, jamais affichés dans l'UI.
- Traduction FR des actions/capacités de monstres (334 monstres, 1503 entrées), avec repli sur l'anglais si absente — étend le référentiel bilingue FR/EN à des champs JSON structurés (dev local pour l'instant, pas encore déployé en production).

## [2026-09-25] — Déployé en production

### Added
- Référentiel de monstres : script d'import `import-dnd5e-monsters` (catalogue `DndMonster` depuis dnd5eapi.co), table applicative `Monster` (`source: dnd5e | custom`), création de monstre personnalisé réservée aux MJ/admin (`POST /api/monsters`), et validation admin vers le catalogue commun (`POST /api/monsters/:id/validate-catalog`) — même pattern que les sorts.
- Page `/referentiel` (admin/gm) : onglets Sorts et Monstres, recherche et filtres, consultation du catalogue importé et des entrées personnalisées, création de sort/monstre personnalisé, validation admin vers le catalogue commun.
- Référentiel bilingue FR/EN : toggle de langue dans le bandeau supérieur, traduction complète des 4 catalogues importés (317 sorts, 334 monstres, 237 équipements, 362 objets magiques — 1250 entrées), avec repli automatique sur l'anglais si une traduction manque.
- Export PDF de fiche de personnage.
- Dossiers de cartes et refonte de la page campagne.
- Ressources de classe par personnage (session).
- Redesign du panneau de combat et des caractéristiques (session).
- Barres de recherche, page de visualisation de personnage, bouton "Visualiser".
- Palettes de thème, page Options et styles liés à la palette.

### Deploy
- `feature/referentiel-monstres` mergé (fast-forward) dans `main`, poussé sur GitHub.
- Déployé sur le serveur de production (Pi, `192.168.1.38`) : `git pull`, rebuild + redémarrage des conteneurs `back`/`web` (profil `production`) sans arrêter `db` ni son volume — `prisma db push` a synchronisé le schéma sans perte de données.

## Historique antérieur

Les commits précédents ont mis en place : dés live en session, familiers, inventaire partagé et refonte des styles ; documentation API et réorganisation des routes/imports côté backend ; grimoire et caractéristiques (UX session/édition) ; onglets d'édition et détails de personnage ; branding (titre, favicon, package npm) ; profil Docker de production ; chat de session ; migration complète vers Prisma ORM et bascule Docker/frontend.
