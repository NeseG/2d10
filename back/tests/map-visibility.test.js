const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const { visibilityPolygon, pointInPolygon, decodeFog, visibleTokensForPlayer } = require('../lib/map-visibility');

const ids = (list) => list.map((t) => t.id).sort();
const tok = (id, x, y, extra = {}) => ({ id, x, y, size: 0.02, ...extra });

test('géométrie : mêmes résultats que le front (front/tests/geometry.test.ts)', () => {
  const poly = visibilityPolygon({ x: 20, y: 50 }, [{ x1: 50, y1: 20, x2: 50, y2: 80 }], 100, 100);
  assert.equal(pointInPolygon({ x: 40, y: 50 }, poly), true);
  assert.equal(pointInPolygon({ x: 80, y: 50 }, poly), false);
  assert.equal(pointInPolygon({ x: 60, y: 5 }, poly), true);
});

test('sans vision dynamique ni brouillard : tout sauf les jetons cachés', () => {
  const tokens = [tok('pj', 0.1, 0.1, { characterId: 1 }), tok('gob', 0.8, 0.8), tok('boss', 0.5, 0.5, { hidden: true })];
  assert.deepEqual(ids(visibleTokensForPlayer({}, { tokens }, [1], null)), ['gob', 'pj']);
});

test('un mur cache un monstre ; une porte ouverte ou une fenêtre non', () => {
  const tokens = [tok('pj', 0.1, 0.5, { characterId: 1 }), tok('gob', 0.8, 0.5)];
  const wall = { id: 'w', x1: 0.5, y1: 0, x2: 0.5, y2: 1 };
  const see = (w) => ids(visibleTokensForPlayer({ dynamic: true, aspect: 1, walls: [w] }, { tokens }, [1], null));
  assert.deepEqual(see(wall), ['pj']);
  assert.deepEqual(see({ ...wall, door: true, open: true }), ['gob', 'pj']);
  assert.deepEqual(see({ ...wall, window: true }), ['gob', 'pj']);
});

test('vision individuelle : un joueur voit par ses propres PJ, pas ceux des autres', () => {
  const tokens = [tok('a', 0.1, 0.5, { characterId: 1 }), tok('b', 0.9, 0.5, { characterId: 2 }), tok('gob', 0.8, 0.45)];
  const fs = { dynamic: true, aspect: 1, walls: [{ id: 'w', x1: 0.5, y1: 0, x2: 0.5, y2: 1 }] };
  assert.deepEqual(ids(visibleTokensForPlayer(fs, { tokens }, [1], null)), ['a', 'b']);
  assert.deepEqual(ids(visibleTokensForPlayer(fs, { tokens }, [2], null)), ['a', 'b', 'gob']);
});

test('obscurité : visible seulement en vision dans le noir ou à la lumière', () => {
  const tokens = [tok('pj', 0.1, 0.5, { characterId: 1, darkvision: 2 }), tok('pres', 0.15, 0.5), tok('loin', 0.6, 0.5), tok('eclaire', 0.9, 0.5)];
  const fs = { dynamic: true, dark: true, aspect: 1, lights: [{ id: 'l', x: 0.9, y: 0.5, radius: 2 }] };
  assert.deepEqual(ids(visibleTokensForPlayer(fs, { tokens, grid: { size: 0.05 } }, [1], null)), ['eclaire', 'pj', 'pres']);
});

test('brouillard : bitmap et anciens rectangles', () => {
  const w = 10;
  const h = 10;
  const px = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++) px.fill(255, y * w + 5, y * w + 10); // moitié droite couverte
  const mask = decodeFog({ w, h, data: zlib.deflateSync(px).toString('base64') });
  const tokens = [tok('pj', 0.8, 0.5, { characterId: 1 }), tok('g1', 0.1, 0.5), tok('g2', 0.8, 0.2)];
  assert.deepEqual(ids(visibleTokensForPlayer({ fog: { w, h, data: 'x' } }, { tokens }, [1], mask)), ['g1', 'pj']);
  assert.deepEqual(ids(visibleTokensForPlayer({ rects: [{ x: 0, y: 0, w: 0.5, h: 1 }] }, { tokens }, [1], null)), ['g2', 'pj']);
  assert.equal(decodeFog({ w: 2, h: 2, data: 'pas du deflate' }), null);
});
