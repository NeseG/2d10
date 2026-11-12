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

/** Contexte commun : jetons non cachés, ratio, case, centre d'un jeton (repère isotrope). */
function sceneOf(fogState, tokensState, fogMask) {
  const fs = fogState && typeof fogState === 'object' ? fogState : {};
  const tokens = (Array.isArray(tokensState?.tokens) ? tokensState.tokens : []).filter((t) => t && !t.hidden);
  const aspect = num(fs.aspect, fogMask ? fogMask.h / fogMask.w : 1);
  const cell = num(tokensState?.grid?.size, 0.05);
  const center = (t) => {
    const s = num(t.size, 36 / 1100);
    return { x: num(t.x, 0) + s / 2, y: num(t.y, 0) * aspect + s / 2 };
  };
  return { fs, tokens, aspect, cell, center };
}

/** Sources de vue (`viewers`, jetons de PJ) et lumières, avec leurs polygones bloqués par les murs. */
function visionOf(sc, viewers) {
  const { fs, tokens, aspect, cell, center } = sc;
  const segs = (Array.isArray(fs.walls) ? fs.walls : [])
    .filter((w) => w && !w.window && !(w.door && w.open))
    .map((w) => ({ x1: w.x1, y1: w.y1 * aspect, x2: w.x2, y2: w.y2 * aspect }));
  const sources = viewers.map((t) => {
    const c = center(t);
    return { c, poly: visibilityPolygon(c, segs, 1, aspect), dv: num(t.darkvision, 0) * cell };
  });
  const lit = fs.dark
    ? [
        ...(Array.isArray(fs.lights) ? fs.lights : []).map((l) => ({ c: { x: num(l.x, 0), y: num(l.y, 0) * aspect }, r: num(l.radius, 0) * cell })),
        ...tokens.filter((t) => num(t.light, 0) > 0).map((t) => ({ c: center(t), r: t.light * cell })),
      ].map((l) => ({ ...l, poly: visibilityPolygon(l.c, segs, 1, aspect) }))
    : [];
  return { sources, lit };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isLit = (lit, p) => lit.some((l) => dist(p, l.c) <= l.r && pointInPolygon(p, l.poly));

/** PJ à travers qui voit un joueur : les siens, sauf en vision partagée (ou s'il n'en a aucun : tout le groupe). */
function viewersFor(tokens, myCharacterIds, shared) {
  const pcs = tokens.filter((t) => t.characterId != null);
  const mine = pcs.filter((t) => myCharacterIds.includes(t.characterId));
  return !shared && mine.length ? mine : pcs;
}

/**
 * Jetons visibles par un joueur. `fogMask` : masque déjà décodé (partagé entre joueurs d'un même envoi).
 * Règles : jamais les `hidden` ; toujours les jetons de PJ ; les autres seulement hors brouillard et, en vision dynamique, en vue.
 */
function visibleTokensForPlayer(fogState, tokensState, myCharacterIds, fogMask) {
  const sc = sceneOf(fogState, tokensState, fogMask);
  const { fs, tokens, aspect, center } = sc;
  const rects = Array.isArray(fs.rects) ? fs.rects : [];
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
    const { sources, lit } = visionOf(sc, viewersFor(tokens, myCharacterIds, Boolean(fs.sharedVision)));
    pointVisible = (p) => sources.some((s) => pointInPolygon(p, s.poly) && (!fs.dark || dist(p, s.c) <= s.dv || isLit(lit, p)));
  }

  return tokens.filter((t) => {
    if (t.characterId != null) return true;
    const c = center(t);
    return !underFog(c) && pointVisible(c);
  });
}

// ——— Exploration : ce que le groupe a déjà vu, en bitmap (même format que le brouillard, ADR 0005) ———

const PX_PER_CELL = 8;
const MAX_SIDE = 2048;

/** Même règle que fogSize() du front (front/src/features/maps/fog.ts). */
function fogSize(gridSize, aspect) {
  let w = Math.round(Math.min(MAX_SIDE, Math.max(64, PX_PER_CELL / Math.max(gridSize, 1e-3))));
  let h = Math.round(w * aspect);
  if (h > MAX_SIDE) {
    w = Math.round((w * MAX_SIDE) / h);
    h = MAX_SIDE;
  }
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

/** Parcourt les segments horizontaux de pixels dont le centre est dans le polygone (coordonnées pixels). */
function polygonSpans(P, w, h, fn) {
  if (P.length < 3) return;
  const ys = P.map((p) => p.y);
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  const xs = [];
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    xs.length = 0;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i];
      const b = P[j];
      if (a.y > yc !== b.y > yc) xs.push(a.x + ((yc - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5));
      const xb = Math.min(w, Math.ceil(xs[k + 1] - 0.5));
      if (xb > xa) fn(y, xa, xb);
    }
  }
}

/**
 * Ajoute à l'exploration ce que voient en ce moment tous les PJ (commune au groupe).
 * Retourne la nouvelle bitmap, ou `prev` inchangé si rien de neuf (ou vision dynamique inactive).
 */
function exploreFrom(fogState, tokensState, prev) {
  const sc = sceneOf(fogState, tokensState, null);
  const { fs, tokens, aspect } = sc;
  if (!fs.dynamic || !Number.isFinite(fs.aspect)) return prev ?? null;
  const pcs = tokens.filter((t) => t.characterId != null);
  if (!pcs.length) return prev ?? null;

  const { w, h } = fogSize(sc.cell, aspect);
  const old = prev && prev.w === w && prev.h === h ? decodeFog(prev) : null;
  const px = old ? Buffer.from(old.px) : Buffer.alloc(w * h);
  const { sources, lit } = visionOf(sc, pcs);
  const toPx = (p) => ({ x: p.x * w, y: (p.y / aspect) * h });
  const toIso = (x, y) => ({ x: (x + 0.5) / w, y: ((y + 0.5) / h) * aspect });
  let changed = !old;
  for (const s of sources) {
    polygonSpans(s.poly.map(toPx), w, h, (y, xa, xb) => {
      for (let x = xa; x < xb; x++) {
        const i = y * w + x;
        if (px[i]) continue;
        if (fs.dark) {
          const p = toIso(x, y);
          if (dist(p, s.c) > s.dv && !isLit(lit, p)) continue;
        }
        px[i] = 255;
        changed = true;
      }
    });
  }
  return changed ? { w, h, data: zlib.deflateSync(px).toString('base64') } : prev;
}

const encode = (px, w, h) => ({ w, h, data: zlib.deflateSync(px).toString('base64') });

/**
 * « Révéler sa vue » : ligne de vue complète du jeton (murs et portes fermées, sans tenir compte de l'obscurité).
 * Retire le brouillard dans cette zone et l'ajoute à l'exploration. Retourne null si le jeton est introuvable
 * ou si le ratio de l'image n'est pas encore connu.
 */
function revealFrom(fogState, tokensState, tokenId) {
  const fs = fogState && typeof fogState === 'object' ? fogState : {};
  if (!Number.isFinite(fs.aspect)) return null;
  const all = Array.isArray(tokensState?.tokens) ? tokensState.tokens : [];
  const tok = all.find((t) => t?.id === tokenId);
  if (!tok) return null;
  // Jeton caché inclus : le MJ peut révéler depuis n'importe quel jeton.
  const sc = sceneOf(fs, { ...tokensState, tokens: [{ ...tok, hidden: false }] }, null);
  const { aspect } = sc;
  const { sources } = visionOf({ ...sc, fs: { ...fs, dark: false } }, sc.tokens);
  const poly = sources[0].poly;
  const size = fogSize(sc.cell, aspect);

  // Brouillard : bitmap existante, sinon anciens rectangles convertis, sinon rien à retirer.
  let fog = decodeFog(fs.fog);
  if (!fog && !fs.fog && Array.isArray(fs.rects) && fs.rects.length) {
    fog = { ...size, px: Buffer.alloc(size.w * size.h) };
    for (const r of fs.rects) {
      const xa = Math.max(0, Math.round(r.x * fog.w));
      const xb = Math.min(fog.w, Math.round((r.x + r.w) * fog.w));
      for (let y = Math.max(0, Math.round(r.y * fog.h)); y < Math.min(fog.h, Math.round((r.y + r.h) * fog.h)); y++) fog.px.fill(255, y * fog.w + xa, y * fog.w + xb);
    }
  }
  const fill = (m, v) =>
    polygonSpans(poly.map((p) => ({ x: p.x * m.w, y: (p.y / aspect) * m.h })), m.w, m.h, (y, xa, xb) => m.px.fill(v, y * m.w + xa, y * m.w + xb));
  if (fog) fill(fog, 0);

  const prevExplored = decodeFog(fs.explored);
  const explored = prevExplored && prevExplored.w === size.w && prevExplored.h === size.h
    ? { ...prevExplored, px: Buffer.from(prevExplored.px) }
    : { ...size, px: Buffer.alloc(size.w * size.h) };
  fill(explored, 255);

  return {
    fog: fog ? encode(fog.px, fog.w, fog.h) : fs.fog ?? null,
    explored: encode(explored.px, explored.w, explored.h),
  };
}

module.exports = { visibilityPolygon, pointInPolygon, decodeFog, visibleTokensForPlayer, exploreFrom, revealFrom, fogSize };
