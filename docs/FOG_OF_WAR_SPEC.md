# Brouillard de guerre et vision — spécification

Date : 2026-11-12 · Statut : validée, en cours de développement

Choix technique du stockage : voir [ADR 0005](decisions/0005-brouillard-bitmap.md).

## Existant (avant ce chantier)

- Brouillard manuel en rectangles (`fog_state.rects`), outils « Fog » / « Gomme ».
- Murs et portes (`fog_state.walls`), vision dynamique par jeton de PJ (`dynamic`), obscurité + vision dans le noir + lumières (`dark`, `lights`).
- Jetons `hidden` filtrés côté serveur ; jetons hors de vue masqués **côté client seulement**.
- Synchro live : chaque modif du MJ est envoyée (`PUT /sessions/:id/map/state`) puis rediffusée par WebSocket.
- La session écrit **directement dans la carte préparée** (`CampaignMap.fogState` / `tokensState`).

## 0. Modèle et partie jouée

| | Modèle (éditeur de campagne) | Partie jouée (session) |
|---|---|---|
| Stockage | `CampaignMap.fogState` + `tokensState` (existant) | `CampaignMap.playState` (nouveau) |
| Contenu | image, grille, murs, portes (état initial), fenêtres, lumières, zones nommées, jetons placés, brouillard initial | position des jetons, portes ouvertes/fermées, brouillard, exploration, mode de vision |
| Qui écrit | MJ, dans l'éditeur uniquement | MJ en session ; serveur pour l'exploration ; joueurs pour leurs jetons |

- `playState` est rattaché à la carte (pas à la session) : l'exploration est conservée d'une session à l'autre.
- Créé par copie du modèle à la première activation en session.
- Bouton MJ **« Réinitialiser depuis le modèle »**.
- Murs, fenêtres, lumières, grille : uniquement modifiables dans l'éditeur. En session, ils sont toujours lus depuis le modèle.

## 1. Murs et fenêtres

- Murs : inchangés, ils bloquent la vision. Les portes ouvertes la laissent passer.
- Pas de collision : un mur ne bloque pas le déplacement d'un jeton.
- **Fenêtre** : nouveau type de trait dans l'éditeur, repère visuel pour le MJ uniquement, sans effet sur la vision.

## 2. Exploration persistante

- Active quand la vision dynamique est active.
- **Calculée par le serveur** à chaque déplacement de jeton de PJ, ouverture/fermeture de porte ou révélation.
- Commune à tout le groupe, conservée entre les sessions.
- Rendu joueur : visible maintenant = normal ; déjà exploré = décor assombri, sans jetons non-PJ ; jamais vu = noir.
- Rendu MJ : les trois états en transparence.
- Bouton MJ « Oublier l'exploration ».

## 3. Vision partagée

- Réglage global, visible et modifiable par le MJ uniquement.
- **Groupe** : chaque joueur voit l'union de la vision de tous les PJ.
- **Individuelle** : chaque joueur ne voit que la vision de ses propres jetons.
- Stocké dans `playState`. L'exploration reste commune dans les deux modes.

## 4. Révéler la vue d'un jeton

- Bouton « Révéler sa vue » quand le MJ sélectionne un jeton.
- Calcule la **ligne de vue complète** du jeton (bloquée par les murs, sans tenir compte de l'obscurité) et retire le brouillard dans cette zone.
- Fonctionne même sans vision dynamique. Alimente aussi l'exploration.

## 5. Brouillard (outils)

- Outils : rectangle, polygone, pinceau (rayon réglable), gomme (mêmes formes), tout couvrir, tout révéler, annuler.
- Le MJ voit le brouillard semi-transparent, les joueurs opaque (existant).
- Bitmap envoyée au relâchement du tracé, pas pendant.

## 6. Zones pré-dessinées

- Polygones nommés, dessinés dans l'éditeur (modèle).
- En session : liste des zones, bouton « Révéler » par zone.

## 7. Filtrage côté serveur

- Les joueurs ne reçoivent que les jetons qu'ils voient (vision dynamique + brouillard + mode de vision), plus leurs propres jetons.
- Nécessite de porter la géométrie (`visibilityPolygon`, remplissage de polygone, lecture de pixel) côté back.

## 8. Synchro

- Même canal WebSocket `session-map`. Le serveur adapte le contenu à chaque destinataire (MJ / joueur).

## Données (cible)

```jsonc
// CampaignMap.playState
{
  "tokens": [ /* MapToken[] */ ],
  "doors": { "<wallId>": true },        // portes ouvertes
  "fog": { "w": 240, "h": 160, "data": "<base64 deflate, 1 octet/px>" },
  "explored": { "w": 240, "h": 160, "data": "..." },
  "sharedVision": true
}
```

Résolution des bitmaps : 8 px par case, plafonnée à 2048 px sur le plus grand côté.

## Ordre de développement

1. Commiter le travail en cours (murs, vision).
2. Séparer modèle et partie jouée (`playState`).
3. Bitmap de brouillard + outils + migration des rectangles, zones nommées, fenêtres.
4. Géométrie côté serveur et filtrage des jetons.
5. Exploration côté serveur, vision partagée.
6. « Révéler sa vue ».
