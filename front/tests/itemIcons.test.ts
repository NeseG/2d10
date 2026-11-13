import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEM_ICONS_BASE, itemIconUrl, parseItemIconPath } from '../src/shared/inventory/itemIcons.ts'

test('URL : chaque segment encodé, les / conservés', () => {
  assert.equal(
    itemIconUrl('Potions, Poisions, Bottles, and Vials/Generic/Bottle - Red.svg'),
    `${ITEM_ICONS_BASE}Potions%2C%20Poisions%2C%20Bottles%2C%20and%20Vials/Generic/Bottle%20-%20Red.svg`,
  )
})

test('nom et catégorie tirés du chemin', () => {
  assert.deepEqual(parseItemIconPath('Weapons/Longsword.svg'), { name: 'Longsword', category: 'Weapons' })
  assert.deepEqual(parseItemIconPath('A/B/C d.svg'), { name: 'C d', category: 'A · B' })
})
