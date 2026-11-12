import test from 'node:test'
import assert from 'node:assert/strict'
import { applyFogOp, decodeFog, emptyMask, encodeFog, fogAt, fogSize, maskFromRects } from '../src/features/maps/fog.ts'

test('taille : 8 px par case, plafonnée à 2048 sur le plus grand côté', () => {
  assert.deepEqual(fogSize(0.05, 0.6), { w: 160, h: 96 })
  assert.deepEqual(fogSize(0.001, 0.5), { w: 2048, h: 1024 })
  const tall = fogSize(0.005, 3)
  assert.equal(tall.h, 2048)
  assert.ok(tall.w < 700)
})

test('encodage puis décodage rend le même masque, et compresse', async () => {
  const m = maskFromRects(400, 300, [{ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }])
  const b = await encodeFog(m)
  assert.ok(b.data.length < 2000, `trop gros : ${b.data.length}`)
  const back = await decodeFog(b)
  assert.deepEqual(back.px, m.px)
})

test('rectangle, polygone, pinceau et gomme', () => {
  const m = emptyMask(100, 100)
  applyFogOp(m, { shape: 'rect', erase: false, x1: 0, y1: 0, x2: 1, y2: 1 })
  assert.equal(fogAt(m, { x: 0.99, y: 0.99 }), true)

  // Triangle effacé : son intérieur est libre, l'extérieur reste couvert
  applyFogOp(m, { shape: 'poly', erase: true, points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.1, y: 0.9 }] })
  assert.equal(fogAt(m, { x: 0.2, y: 0.2 }), false)
  assert.equal(fogAt(m, { x: 0.8, y: 0.8 }), true)

  // Pinceau : trait horizontal de rayon 0,05 qui remet du brouillard
  applyFogOp(m, { shape: 'brush', erase: false, radius: 0.05, points: [{ x: 0.15, y: 0.3 }, { x: 0.5, y: 0.3 }] })
  assert.equal(fogAt(m, { x: 0.3, y: 0.32 }), true)
  assert.equal(fogAt(m, { x: 0.3, y: 0.4 }), false)
})
