# 0001 — Migration depuis SQL brut (pg) vers Prisma ORM

Date : 2026-09-18 (rédigé rétroactivement — décision prise lors des commits `678da07`, `06c2d89`, `df5f2d9`)
Statut : Accepté

## Contexte

Le backend interrogeait initialement PostgreSQL directement via le driver `pg`, avec des requêtes SQL écrites à la main dans les routes. Le projet a ensuite migré l'ensemble des routes vers **Prisma ORM**, en conservant `pg` comme dépendance (utilisé par Prisma sous le capot / scripts ponctuels).

## Décision

Utiliser **Prisma** comme couche d'accès aux données pour toutes les routes de l'API : schéma déclaratif (`prisma/schema.prisma`), client généré (`@prisma/client`), migrations via `prisma db push` / `prisma migrate`. Toutes les routes actives sont suffixées `-prisma.js` et un script `scripts/rollback-to-postgres.js` a été conservé comme filet de sécurité pendant la transition.

## Alternatives écartées

- **Rester sur SQL brut avec `pg`** — écarté : plus de boilerplate, pas de typage des requêtes, migrations de schéma gérées à la main.
- **Un autre ORM (Sequelize, TypeORM, Knex)** — non documenté comme envisagé explicitement, mais Prisma a été retenu pour son système de migrations et son client typé cohérent avec l'écosystème Node.js du projet.

## Conséquences

- Le schéma de données (28+ modèles) est centralisé et versionné dans `prisma/schema.prisma`, plus facile à faire évoluer que des migrations SQL manuelles.
- Le suffixe `-prisma.js` sur les fichiers de routes est un **résidu de la période de transition** : il n'a plus de raison d'être aujourd'hui puisque tout le projet est sur Prisma, mais il a été conservé par cohérence avec le code existant. Nouveau code : ne pas reproduire ce suffixe, il n'apporte plus d'information.
- Le script `rollback-to-postgres.js` reste dans `back/scripts/` ; à évaluer s'il doit être supprimé maintenant que la migration est stabilisée depuis plusieurs mois de commits.
