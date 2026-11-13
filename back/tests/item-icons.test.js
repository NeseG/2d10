const test = require('node:test');
const assert = require('node:assert/strict');
const { matchItemIcon, iconUrl } = require('../lib/item-icons');

test('noms SRD → icône', () => {
  assert.equal(matchItemIcon('Longsword'), iconUrl('Weapons/Longsword.svg'));
  assert.equal(matchItemIcon('Crossbow, light'), iconUrl('Weapons/Light Crossbow.svg'));
  assert.equal(matchItemIcon("Calligrapher's Supplies"), iconUrl('Tools, Kits, and Artisan Tools/Calligrapher Supplies.svg'));
  assert.equal(matchItemIcon('Plate Armor'), iconUrl('Armour/Plate Armour.svg'));
  assert.equal(matchItemIcon('Rust Bag of Tricks'), iconUrl('Magical Items/Bag of Tricks - Rust.svg'));
  assert.equal(matchItemIcon('Ioun Stone of Agility'), iconUrl('Magical Items/Ioun Stone - Agility.svg'));
  assert.equal(matchItemIcon('Pony'), iconUrl('Mount and Tack/Pony - Deed.svg'));
});

test('sans correspondance → null', () => {
  assert.equal(matchItemIcon('Objet inventé'), null);
  assert.equal(matchItemIcon(''), null);
  assert.equal(matchItemIcon(null), null);
});

test('URL encodée par segment', () => {
  assert.match(iconUrl('A, B/C d.svg'), /\/Library\/A%2C%20B\/C%20d\.svg$/);
});
