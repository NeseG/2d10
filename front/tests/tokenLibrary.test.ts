import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTokenPath } from '../src/features/maps/tokenLibrary.ts'

test('chemin Forgotten Adventures : nom, catégorie, taille', () => {
  assert.deepEqual(parseTokenPath('FA_Tokens/Creatures/Monstrosity/Brown_Scavver_A1_Large_Scale120_Monstrosity_01.png'), {
    name: 'Brown Scavver',
    category: 'Creatures · Monstrosity',
    size: 'large',
    scale: 1.2,
  })
  assert.equal(parseTokenPath('FA_Tokens/Creatures/Monstrosity/Astral_Dreadnought_A2_Gargantuan_Monstrosity_Titan_16x28_01.png').size, 'gargantuan')
})

test('autre fichier : nom du fichier, taille moyenne', () => {
  assert.deepEqual(parseTokenPath('Mon gobelin.png'), { name: 'Mon gobelin', category: null, size: 'medium', scale: 1 })
  assert.deepEqual(parseTokenPath('Jetons/Boss/liche.webp'), { name: 'liche', category: 'Jetons · Boss', size: 'medium', scale: 1 })
})
