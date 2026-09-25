# Changelog

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [Unreleased]

### En cours
- Référentiel de monstres : intégration au tracker d'initiative des sessions (recherche de monstre à ajouter directement) — branche `feature/referentiel-monstres`, reste à faire.

### Added
- Référentiel de monstres : script d'import `import-dnd5e-monsters` (catalogue `DndMonster` depuis dnd5eapi.co), table applicative `Monster` (`source: dnd5e | custom`), création de monstre personnalisé réservée aux MJ/admin (`POST /api/monsters`), et validation admin vers le catalogue commun (`POST /api/monsters/:id/validate-catalog`) — même pattern que les sorts.
- Page `/referentiel` (admin/gm) : onglets Sorts et Monstres, recherche et filtres, consultation du catalogue importé et des entrées personnalisées, création de sort/monstre personnalisé, validation admin vers le catalogue commun.
- Référentiel bilingue FR/EN : toggle de langue dans le bandeau supérieur, traduction complète des 4 catalogues importés (317 sorts, 334 monstres, 237 équipements, 362 objets magiques — 1250 entrées), avec repli automatique sur l'anglais si une traduction manque.
- Dossiers de cartes et refonte de la page campagne.
- Ressources de classe par personnage (session).
- Redesign du panneau de combat et des caractéristiques (session).
- Barres de recherche, page de visualisation de personnage, bouton "Visualiser".
- Palettes de thème, page Options et styles liés à la palette.

## Historique antérieur

Les commits précédents ont mis en place : dés live en session, familiers, inventaire partagé et refonte des styles ; documentation API et réorganisation des routes/imports côté backend ; grimoire et caractéristiques (UX session/édition) ; onglets d'édition et détails de personnage ; branding (titre, favicon, package npm) ; profil Docker de production ; chat de session ; migration complète vers Prisma ORM et bascule Docker/frontend.
