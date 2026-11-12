// Ce qu'un joueur a le droit de voir sur la carte : le serveur ne lui envoie que ces jetons.
// La géométrie est un portage de front/src/features/maps/geometry.ts et MapCanvas.tsx : garder les deux alignés.
// Repère isotrope : x en largeur d'image (0..1), y = y normalisé × aspect (hauteur / largeur).

const zlib = require('zlib');

/** Polygone de visibilité depuis `o` dans [0,w]×[0,h] : un rayon vers chaque extrémité de segment (±ε), impact le plus proche. */
function visibilityPolygon(o, walls, w, h) {
  const segs = [
    ...walls,
    { x1: 0, y1: 0, x2: w, y2: 0 },
    { x1: w, y1: 0, x2: w, y2: h },
    { x1: w, y1: h, x2: 0, y2: h },
    { x1: 0, y1: h, x2: 0, y2: 0 },
  ];
  const angles = [];
  for (const s of segs) {
    for (const a of [Math.atan2(s.y1 - o.y, s.x1 - o.x), Math.atan2(s.y2 - o.y, s.x2 - o.x)]) angles.push(a - 1e-4, a, a + 1e-4);
  }
  angles.sort((a, b) => a - b);
  return angles.map((a) => {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = Infinity;
    for (const s of segs) {
      const sx = s.x2 - s.x1;
      const sy = s.y2 - s.y1;
      const den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((s.x1 - o.x) * sy - (s.y1 - o.y) * sx) / den;
      const u = ((s.x1 - o.x) * dy - (s.y1 - o.y) * dx) / den;
      if (t > 1e-9 && u >= 0 && u <= 1 && t < best) best = t;
    }
    return best === Infinity ? o : { x: o.x + dx * best, y: o.y + dy * best };
  });
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Bitmap de brouillard (deflate + base64) → masque, ou null si absente / corrompue. */
function decodeFog(b) {
  if (!b || !Number.isInteger(b.w) || !Number.isInteger(b.h) || typeof b.data !== 'string') return null;
  try {
    const px = zlib.inflateSync(Buffer.from(b.data, 'base64'), { maxOutputLength: b.w * b.h });
    return px.length === b.w * b.h ? { w: b.w, h: b.h, px } : null;
  } catch {
    return null;
  }
}

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/**
 * Jetons visibles par un joueur. `fogMask` : masque déjà décodé (partagé entre joueurs d'un même envoi).
 * Règles : jamais les `hidden` ; toujours les jetons de PJ ; les autres seulement hors brouillard et, en vision dynamique, en vue.
 */
function visibleTokensForPlayer(fogState, tokensState, myCharacterIds, fogMask) {
  const fs = fogState && typeof fogState === 'object' ? fogState : {};
  const tokens = (Array.isArray(tokensState?.tokens) ? tokensState.tokens : []).filter((t) => t && !t.hidden);
  const aspect = num(fs.aspect, fogMask ? fogMask.h / fogMask.w : 1);
  const cell = num(tokensState?.grid?.size, 0.05);
  const rects = Array.isArray(fs.rects) ? fs.rects : [];
  const center = (t) => {
    const s = num(t.size, 36 / 1100);
    return { x: num(t.x, 0) + s / 2, y: num(t.y, 0) * aspect + s / 2 };
  };
  const underFog = (c) => {
    const x = c.x;
    const y = c.y / aspect;
    if (fogMask) {
      const px = Math.min(fogMask.w - 1, Math.max(0, Math.floor(x * fogMask.w)));
      const py = Math.min(fogMask.h - 1, Math.max(0, Math.floor(y * fogMask.h)));
      return fogMask.px[py * fogMask.w + px] > 127;
    }
    return !fs.fog && rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  };

  let pointVisible = () => true;
  if (fs.dynamic) {
    const segs = (Array.isArray(fs.walls) ? fs.walls : [])
      .filter((w) => w && !w.window && !(w.door && w.open))
      .map((w) => ({ x1: w.x1, y1: w.y1 * aspect, x2: w.x2, y2: w.y2 * aspect }));
    const pcs = tokens.filter((t) => t.characterId != null);
    const mine = pcs.filter((t) => myCharacterIds.includes(t.characterId));
    const sources = (mine.length ? mine : pcs).map((t) => {
      const c = center(t);
      return { c, poly: visibilityPolygon(c, segs, 1, aspect), dv: num(t.darkvision, 0) * cell };
    });
    const lit = fs.dark
      ? [
          ...(Array.isArray(fs.lights) ? fs.lights : []).map((l) => ({ c: { x: num(l.x, 0), y: num(l.y, 0) * aspect }, r: num(l.radius, 0) * cell })),
          ...tokens.filter((t) => num(t.light, 0) > 0).map((t) => ({ c: center(t), r: t.light * cell })),
        ].map((l) => ({ ...l, poly: visibilityPolygon(l.c, segs, 1, aspect) }))
      : [];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    pointVisible = (p) =>
      sources.some(
        (s) =>
          pointInPolygon(p, s.poly) &&
          (!fs.dark || dist(p, s.c) <= s.dv || lit.some((l) => dist(p, l.c) <= l.r && pointInPolygon(p, l.poly))),
      );
  }

  return tokens.filter((t) => {
    if (t.characterId != null) return true;
    const c = center(t);
    return !underFog(c) && pointVisible(c);
  });
}

module.exports = { visibilityPolygon, pointInPolygon, decodeFog, visibleTokensForPlayer };
