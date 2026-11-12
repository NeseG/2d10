const test = require('node:test');
const assert = require('node:assert/strict');
const { effectiveMapState, nextPlayState } = require('../lib/map-play-state');

const template = {
  fogState: { rects: [{ id: 'f1' }], walls: [{ id: 'w1' }, { id: 'd1', door: true, open: false }], lights: [{ id: 'l1' }], dynamic: true },
  tokensState: { tokens: [{ id: 't1', x: 0.1 }], grid: { size: 0.05 }, templates: [] },
};

test('sans partie jouée, la session voit le modèle', () => {
  assert.deepEqual(effectiveMapState({ ...template, playState: null }), { fog_state: template.fogState, tokens_state: template.tokensState });
});

test('un envoi de session ne touche ni aux murs, ni aux lumières, ni à la grille', () => {
  const sent = {
    fog: { rects: [], walls: [{ id: 'w1' }, { id: 'd1', door: true, open: true }, { id: 'pirate' }], lights: [], dynamic: false },
    tokens: { tokens: [{ id: 't1', x: 0.5 }], grid: { size: 0.2 }, templates: [{ id: 'g1' }] },
  };
  const playState = nextPlayState(null, sent.fog, sent.tokens);
  const { fog_state, tokens_state } = effectiveMapState({ ...template, playState });
  assert.deepEqual(fog_state.walls, [{ id: 'w1' }, { id: 'd1', door: true, open: true }]);
  assert.deepEqual(fog_state.lights, [{ id: 'l1' }]);
  assert.equal(fog_state.dynamic, true);
  assert.deepEqual(fog_state.rects, []);
  assert.deepEqual(tokens_state.grid, { size: 0.05 });
  assert.equal(tokens_state.tokens[0].x, 0.5);
  assert.deepEqual(tokens_state.templates, [{ id: 'g1' }]);
});

test('un envoi partiel garde le reste de la partie jouée', () => {
  const first = nextPlayState(null, { rects: [{ id: 'x' }], walls: [] }, null);
  const second = nextPlayState({ ...first, explored: 'garde' }, null, { tokens: [{ id: 't2' }] });
  assert.deepEqual(second.rects, [{ id: 'x' }]);
  assert.equal(second.explored, 'garde');
  // brouillard joué présent, jetons pas encore : le modèle fournit les jetons
  assert.deepEqual(effectiveMapState({ ...template, playState: first }).tokens_state.tokens, template.tokensState.tokens);
});
