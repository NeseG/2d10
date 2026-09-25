# 0003 — Référentiel de monstres : catalogue importé séparé de la table applicative

Date : 2026-09-18
Statut : Accepté

## Contexte

Le projet a besoin d'un référentiel de monstres D&D 5e, avec trois usages à couvrir : (1) un catalogue SRD importé automatiquement depuis une API publique, (2) la possibilité pour un MJ ou un admin de créer un monstre personnalisé, et (3) un mécanisme pour qu'un admin valide un monstre personnalisé et le rende accessible dans la base commune. Le modèle `DndMonster` existait déjà dans `prisma/schema.prisma` mais sans script d'import ni logique de validation.

Le même besoin existe déjà pour les sorts, résolu par une séparation en deux tables : `Dnd5eSpellImport` (catalogue brut importé, upsert sur `index`) et `Spell` (table applicative avec `source: 'dnd5e' | 'custom'`, utilisée par le grimoire), reliées par une route `POST /api/spells/:id/validate-catalog` qui copie un sort custom validé dans la table d'import.

## Décision

Reproduire exactement ce pattern pour les monstres plutôt que d'inventer un nouveau schéma :

- `DndMonster` (table `dnd_monsters`) reste le catalogue importé, alimenté par `scripts/import-dnd5e-monsters.js` (upsert sur `slug`, pas `index` — le modèle utilisait déjà cette clé). Ajout des champs `raw` (JSON brut de la réponse API, absent jusqu'ici) et `updatedAt` pour aligner le modèle sur `Dnd5eSpellImport`.
- Nouveau modèle `Monster` (table `monsters`) : table applicative avec `source: 'dnd5e' | 'custom'` et `isActive`. Création réservée aux rôles **admin** et **gm** (`POST /api/monsters`), contrairement aux sorts où tout utilisateur connecté peut créer un sort custom — restriction demandée explicitement pour les monstres.
- `POST /api/monsters/:id/validate-catalog` (admin uniquement) copie un monstre `source: custom` vers `DndMonster` avec un slug stable `validated-monster-<id>`, puis bascule le monstre applicatif en `source: dnd5e` — miroir exact de `validate-catalog` pour les sorts.
- Routes de lecture/suppression du catalogue importé dans un routeur dédié `dnd5e-monsters-prisma.js` (`GET/DELETE /api/dnd5e/monsters`), au même niveau que `dnd5e-spells-prisma.js`, en plus des routes déjà existantes `GET /api/dnd-local/monsters` (lecture directe de `DndMonster`, conservées pour ne pas casser l'existant).

## Alternatives écartées

- **Un seul modèle `DndMonster` avec un champ `source`/`status`** — écarté : aurait mélangé les responsabilités « catalogue de référence importable » et « instance utilisée en jeu », et cassé la sémantique actuelle de `DndMonster` comme cible d'upsert stable pour l'import (un `slug` réutilisé par un monstre custom validé aurait pu entrer en collision avec un futur import SRD).
- **Statut de validation en attente (`pending`/`approved`) avant que le monstre custom soit visible** — écarté pour rester cohérent avec le comportement actuel des sorts : un monstre custom est immédiatement visible dans `GET /api/monsters` (tagué `source: custom`), la validation admin sert seulement à le faire entrer dans le catalogue commun `DndMonster`, pas à le rendre utilisable.

## Conséquences

- Le pattern est maintenant répliqué trois fois dans la même forme (sorts, monstres, et implicitement équipement/objets magiques côté catalogue seul) — toute nouvelle donnée SRD nécessitant un flux « custom + validation » peut suivre ce même découpage catalogue/applicatif.
- Aucune UI frontend n'existe pour la création de monstre custom ni pour la validation admin, à l'image des sorts (`validate-catalog` n'est pas non plus branché dans le frontend actuel) — à traiter si le besoin UI se confirme.
- L'intégration au tracker d'initiative des sessions (ajout d'un monstre via recherche) n'est pas couverte par cette décision et reste à faire séparément.
