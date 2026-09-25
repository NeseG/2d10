# Architecture Decision Records (ADR)

Ce dossier contient des ADR légers : de courtes fiches qui capturent une décision d'architecture ou technique structurante, le contexte qui l'a motivée, et les alternatives écartées.

## Pourquoi

Le code montre *quelle* décision a été prise, rarement *pourquoi*. Un ADR sert à retrouver le raisonnement plusieurs mois après, notamment pour éviter de revenir sur une décision sans redécouvrir les raisons qui l'ont motivée — ou pour l'assumer de reconsidérer en connaissance de cause.

## Format

Chaque ADR est un fichier numéroté `NNNN-titre-court.md` (voir [0000-template.md](0000-template.md)), avec quatre sections :

1. **Contexte** — la situation, la contrainte ou le problème qui a rendu une décision nécessaire.
2. **Décision** — ce qui a été choisi, en une formulation directe.
3. **Alternatives écartées** — les autres options envisagées et pourquoi elles n'ont pas été retenues.
4. **Conséquences** — ce que la décision implique : bénéfices, coûts, dette assumée, contraintes futures.

## Quand créer un ADR

- Choix d'une techno/librairie structurante (ORM, framework, format de données).
- Choix d'un pattern d'architecture (organisation des dossiers, découpage front/back, convention d'API).
- Toute décision qu'on pourrait vouloir remettre en question plus tard et pour laquelle on veut se souvenir du "pourquoi".

Pas besoin d'ADR pour des choix locaux ou réversibles sans conséquence (nom de variable, détail d'implémentation d'une fonction).

## Index

- [0001-migration-prisma-orm.md](0001-migration-prisma-orm.md) — Migration depuis SQL brut (`pg`) vers Prisma ORM.
- [0002-frontend-architecture-par-features.md](0002-frontend-architecture-par-features.md) — Organisation du frontend par domaine métier plutôt que par type de composant.
