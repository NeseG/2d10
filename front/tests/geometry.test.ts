import test from 'node:test'
import assert from 'node:assert/strict'
import { gridDistance, pointInPolygon, snapTo, visibilityPolygon } from '../src/features/maps/geometry.ts'

test('un mur cache ce qui est derrière, pas ce qui est devant ni à côté', () => {
  // Salle 100×100, mur vertical x=50 de y=20 à y=80, observateur à gauche.
  const poly = visibilityPolygon({ x: 20, y: 50 }, [{ x1: 50, y1: 20, x2: 50, y2: 80 }], 100, 100)
  assert.equal(pointInPolygon({ x: 40, y: 50 }, poly), true)
  assert.equal(pointInPolygon({ x: 80, y: 50 }, poly), false)
  assert.equal(pointInPolygon({ x: 60, y: 5 }, poly), true)
})

test('sans mur on voit toute la carte', () => {
  const poly = visibilityPolygon({ x: 10, y: 10 }, [], 100, 60)
  assert.equal(pointInPolygon({ x: 95, y: 55 }, poly), true)
})

test('aimant et distance en cases', () => {
  assert.equal(snapTo(47, 5, 20), 45)
  assert.equal(gridDistance(60, 45, 20), 3)
})
