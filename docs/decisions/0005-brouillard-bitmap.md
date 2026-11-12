# 0005 — Brouillard et exploration stockés en bitmap

Date : 2026-11-12
Statut : Accepté

## Contexte

Le brouillard manuel est une liste de rectangles. On veut ajouter un pinceau, la révélation de la ligne de vue d'un jeton (polygone) et une exploration persistante calculée par le serveur, qui s'accumule à chaque déplacement pendant toute une campagne. Le serveur doit aussi savoir si un point est caché, pour filtrer les jetons envoyés aux joueurs.

## Décision

Deux bitmaps par carte jouée (`playState.fog`, écrite par le MJ ; `playState.explored`, écrite par le serveur), 1 octet par pixel, compressées en deflate (`zlib` côté Node, `DecompressionStream` côté navigateur) et stockées en base64. Résolution : 8 px par case, plafonnée à 2048 px sur le plus grand côté. Affichage via un `<canvas>` agrandi avec lissage et léger flou.

## Alternatives écartées

- **Rectangles (existant)** — un pinceau demanderait des milliers de rectangles ; découper un polygone dedans exige des opérations booléennes.
- **Liste ordonnée d'opérations vectorielles** — nette et légère au début, mais l'exploration la fait grossir sans limite (milliers de polygones, plusieurs Mo rediffusés à chaque changement, test de point en O(n)). La compacter exige des unions de polygones.

## Conséquences

- Taille constante (quelques Ko compressés), test de point en lisant un pixel, union d'exploration par OU de pixels.
- Bords en escalier à l'échelle de 1/8 de case, masqués par le flou.
- Annuler = pile de versions gardée en mémoire chez le MJ.
- Le serveur doit savoir remplir un polygone dans une bitmap (scanline, sans dépendance).
- Deux propriétaires distincts (MJ / serveur) : pas d'écrasement mutuel.
