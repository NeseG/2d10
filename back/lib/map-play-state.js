// Partie jouée d'une carte (`CampaignMap.playState`) : ce qui change en session, à part du modèle préparé dans l'éditeur.
// Le modèle garde murs, lumières, grille et réglages de vision ; la partie jouée garde jetons, gabarits, brouillard et portes.

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const MAX_FOG_SIDE = 2048;
const MAX_FOG_CHARS = 4 * 1024 * 1024;

/** Brouillard en bitmap (deflate + base64, voir docs/decisions/0005) : forme vérifiée, contenu non décodé ici. */
function isFogBitmap(b) {
  return (
    b && typeof b === 'object' &&
    Number.isInteger(b.w) && Number.isInteger(b.h) &&
    b.w > 0 && b.h > 0 && b.w <= MAX_FOG_SIDE && b.h <= MAX_FOG_SIDE &&
    typeof b.data === 'string' && b.data.length <= MAX_FOG_CHARS && /^[A-Za-z0-9+/=]*$/.test(b.data)
  );
}

/** Scène vue en session = modèle surchargé par la partie jouée, au format `fog_state` / `tokens_state` du front. */
function effectiveMapState(map) {
  if (!map.playState) return { fog_state: map.fogState ?? null, tokens_state: map.tokensState ?? null };
  const fog = obj(map.fogState);
  const tok = obj(map.tokensState);
  const play = obj(map.playState);
  const doors = obj(play.doors);
  return {
    fog_state: {
      ...fog,
      walls: arr(fog.walls).map((w) => (w?.door && typeof doors[w.id] === 'boolean' ? { ...w, open: doors[w.id] } : w)),
      rects: play.rects ?? fog.rects,
      fog: play.fog !== undefined ? play.fog : (fog.fog ?? null),
      aspect: play.aspect ?? fog.aspect,
    },
    tokens_state: { ...tok, tokens: play.tokens ?? tok.tokens, templates: play.templates ?? tok.templates },
  };
}

/** Partie jouée mise à jour depuis un envoi de session ; tout le reste (murs, grille, vision…) est ignoré. */
function nextPlayState(prev, fogState, tokensState) {
  const next = { ...obj(prev) };
  if (tokensState && typeof tokensState === 'object') {
    next.tokens = arr(tokensState.tokens);
    next.templates = arr(tokensState.templates);
  }
  if (fogState && typeof fogState === 'object') {
    next.rects = arr(fogState.rects);
    if (fogState.fog === null || isFogBitmap(fogState.fog)) next.fog = fogState.fog;
    // Hauteur / largeur de l'image : le serveur en a besoin pour calculer la vision (lib/map-visibility.js)
    if (Number.isFinite(fogState.aspect) && fogState.aspect > 0.05 && fogState.aspect < 20) next.aspect = fogState.aspect;
    next.doors = {};
    for (const w of arr(fogState.walls)) if (w?.door && typeof w.id === 'string') next.doors[w.id] = Boolean(w.open);
  }
  return next;
}

module.exports = { effectiveMapState, nextPlayState, isFogBitmap };
