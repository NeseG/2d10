import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bagMoveChanges, bagRowCount, placeBagItems } from '../src/features/inventory/bagSlots.ts'

const it = (id: number, sort_order: number) => ({ id, name: `#${id}`, quantity: 1, is_equipped: false, sort_order })

test('placement : case = sort_order, doublon → case libre suivante, trous conservés', () => {
  const m = placeBagItems([it(1, 0), it(2, 0), it(3, 10)])
  assert.deepEqual([...m.entries()].map(([s, i]) => [s, i.id]), [[0, 1], [1, 2], [10, 3]])
})

test('toujours 3 rangées vides sous le dernier objet', () => {
  assert.equal(bagRowCount(new Map()), 3)
  assert.equal(bagRowCount(placeBagItems([it(1, 7)])), 4) // rangée 0 + 3
  assert.equal(bagRowCount(placeBagItems([it(1, 8)])), 5) // rangée 1 + 3
})

test('déplacement vers une case vide, échange avec une case occupée', () => {
  const m = placeBagItems([it(1, 0), it(2, 5)])
  assert.deepEqual(bagMoveChanges(m, 0, 20), [{ id: 1, slot: 20 }])
  assert.deepEqual(bagMoveChanges(m, 0, 5), [{ id: 1, slot: 5 }, { id: 2, slot: 0 }])
  assert.deepEqual(bagMoveChanges(m, 0, 0), [])
})
