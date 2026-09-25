---
name: 2d10-dnd-rules
description: Formules de règles D&D 5e telles qu'implémentées dans le projet 2d10 (modificateur de caractéristique, bonus de maîtrise, ressources de classe). Déclencher sur : "modificateur", "bonus de maîtrise", "classe d'armure", "points de vie", "emplacement de sort", "challenge rating", "ressource de classe", "calcul de stats D&D", ou toute feature qui a besoin de calculer une stat dérivée D&D 5e (ex. stat block de monstre).
---

# Règles D&D 5e dans 2d10

Ce skill documente **où et comment** les règles D&D 5e sont calculées dans CE projet — pas les règles génériques du jeu. But : éviter de recoder une formule déjà présente ailleurs, ou de la recoder différemment.

## Formules canoniques

- **Modificateur de caractéristique** : `Math.floor((score - 10) / 2)`.
  Implémenté (dupliqué) dans :
  - [front/src/features/characters/components/CharacterCharacteristicsTab.tsx:318](front/src/features/characters/components/CharacterCharacteristicsTab.tsx#L318) (`getModifier`)
  - [front/src/features/characters/components/CharacterGrimoireTab.tsx:50](front/src/features/characters/components/CharacterGrimoireTab.tsx#L50) (`getModifier`)

  Ces deux implémentations sont identiques mais dupliquées, pas mutualisées. Si tu ajoutes un troisième endroit qui a besoin de ce calcul (ex. stat block de monstre pour le tracker d'initiative), copie la même formule — ne pas en inventer une variante. Si l'occasion se présente, envisager de la remonter dans `front/src/shared/utils/`.

- **Bonus de maîtrise** : `2 + Math.floor((level - 1) / 4)`.
  Implémenté dans [front/src/features/characters/components/CharacterGrimoireTab.tsx:55](front/src/features/characters/components/CharacterGrimoireTab.tsx#L55) (`getProficiencyBonus`). S'applique aux personnages (basé sur leur niveau) — pour un monstre, la règle D&D 5e standard donne le bonus de maîtrise à partir du *challenge rating*, pas du niveau (table SRD), donc ne pas réutiliser cette fonction telle quelle pour les monstres.

- **Ressources de classe** (rages, inspiration bardique, conduit divin, forme sauvage, etc.) : définies par une table de config `CLASS_RESOURCES_CONFIG` dans [front/src/features/characters/components/CharacterCharacteristicsTab.tsx:108](front/src/features/characters/components/CharacterCharacteristicsTab.tsx#L108), avec une fonction `maxFn(level, caracteristique)` par ressource. Pour ajouter une ressource de classe, étendre cette table plutôt que de créer un mécanisme parallèle.

## Modèle de données

- `Character`, `CharacterFeature`, `CharacterSpellSlot`, `CharacterSkill`, `CharacterSavingThrow` — stats et progression d'un personnage joueur (voir `back/prisma/schema.prisma`).
- `DndMonster` — stat block de monstre (armorClass, hitPoints, hitDice, caractéristiques, challengeRating, xp...), déjà dans le schéma mais sans route/import dédiés au moment de la rédaction de ce skill (référentiel de monstres en cours, voir [TODO.md](../../../TODO.md)).

## Piège

Ne pas confondre le bonus de maîtrise "par niveau" (personnages) et "par challenge rating" (monstres, table SRD officielle) — ce sont deux règles différentes qui se ressemblent.
