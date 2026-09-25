# 0004 — Référentiel D&D importé bilingue FR/EN

Date : 2026-09-19
Statut : Accepté

## Contexte

Les référentiels D&D 5e importés (sorts, monstres, équipement, objets magiques) proviennent de `https://www.dnd5eapi.co`, une API uniquement en anglais. L'utilisateur (MJ francophone) a demandé de pouvoir consulter ces référentiels en français, avec un bouton pour basculer entre anglais et français dans le bandeau supérieur du site. Le contenu concerné représente environ 1250 entrées (317 sorts, 334 monstres, 237 équipements, 362 objets magiques), avec des champs de nature très différente : vocabulaire fixe et fini (écoles de sorts, tailles, types de créatures, raretés d'objets — quelques dizaines de valeurs distinctes au total) et texte libre (noms propres, descriptions de plusieurs phrases).

Aucune intégration de traduction automatique (API tierce type DeepL, clé LLM côté backend) n'existait dans le projet. Ajouter une telle dépendance aurait été une décision d'infrastructure à part entière (coût récurrent, clé à gérer, qualité incertaine sur le jargon D&D).

## Décision

- **Stockage** : ajout de colonnes `*Fr` (nullable) aux 4 tables du catalogue **importé** uniquement (`Dnd5eSpellImport`, `DndMonster`, `Dnd5eEquipment`, `Dnd5eMagicItem`) — pas aux tables applicatives (`Spell`, `Monster`) qui contiennent les copies/personnalisations des utilisateurs, hors périmètre de la demande.
- **Production des traductions** : deux mécanismes complémentaires plutôt qu'un service de traduction générique au runtime :
  1. **Dictionnaires déterministes** (`back/scripts/translate-dictionaries-fr.js`) pour les champs à vocabulaire fixe et fini (écoles de sorts, tailles/types/alignements de monstres, raretés/catégories d'objets, types de dégâts...) — écrits directement, terminologie D&D officielle française appliquée à la main, ré-exécutable à tout moment sans coût.
  2. **Traduction de contenu par agents** pour les noms et descriptions (texte libre) — travail effectué une fois, en une session, sur l'intégralité du catalogue existant via des agents dédiés à la traduction D&D française (respect du vocabulaire officiel WotC France/BBE quand connu, traduction fidèle sinon), le résultat étant relu et appliqué en base via un script d'application générique (`apply_translations.js`).
- **Affichage** : un contexte React `LanguageProvider` (préférence `fr`/`en` persistée en `localStorage`, défaut `fr`) et un utilitaire `pickLang(language, fr, en)` qui **retombe sur l'anglais si la traduction française est absente** — jamais de champ vide côté UI. Le toggle vit dans le bandeau supérieur (`AppLayout`/`LanguageToggle`), visible sur toute l'application.
- **Périmètre du toggle** : uniquement les données du référentiel importé (noms, descriptions, écoles, tailles, types...). L'interface elle-même (menus, boutons, libellés) reste en français dans les deux modes — ce n'est pas une internationalisation complète de l'application.

## Alternatives écartées

- **Traduction à la demande via une API de traduction externe (DeepL, etc.)** — écartée pour cette itération : nécessite une clé API et un coût récurrent, avec un risque de qualité sur le jargon D&D (noms de sorts/objets ayant des traductions officielles précises qu'un traducteur générique ne connaît pas).
- **Une seule colonne `raw` bilingue ou un format JSON multilingue par ligne** — écartée : aurait cassé la compatibilité avec le code existant qui lit `name`/`description` etc. directement ; des colonnes `*Fr` en parallèle sont additives et sans risque de régression.
- **Étendre les tables applicatives (`Spell`, `Monster`) avec les mêmes champs `*Fr`** — écarté : ces tables contiennent des copies et des créations custom des utilisateurs, pas le catalogue de référence ; hors périmètre de la demande initiale, complexité non justifiée pour l'instant.

## Conséquences

- Le référentiel existant (au moment de cette décision) est intégralement traduit et navigable en français, avec repli transparent sur l'anglais entrée par entrée si besoin.
- Les scripts d'import (`import-dnd5e-*.js`) ne remplissent **pas** les champs `*Fr` : toute nouvelle entrée SRD apparue lors d'un futur ré-import (nouvelle version de l'API, nouveau contenu) arrivera sans traduction tant qu'une passe de traduction dédiée n'est pas relancée pour les entrées manquantes — un gap connu à surveiller.
- Aucune UI de relecture/correction manuelle des traductions n'existe : une traduction jugée incorrecte se corrige aujourd'hui en écrivant directement dans la base (via un script ou Prisma Studio), pas depuis l'application.
- Le pattern (colonnes `*Fr` + `pickLang` + toggle) est réutilisable tel quel si un autre référentiel (ex. futurs objets magiques affichés dans une page dédiée, ou classes/races si elles sont un jour importées) a besoin du même traitement bilingue.
