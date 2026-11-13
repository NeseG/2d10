// Icônes d'objets « D&D Item Icons » de Gwillewyn (CC BY 3.0, d'après game-icons.net), servies par jsDelivr
// sur un commit épinglé. item-icons.json = fichiers SVG du dossier Library/ du dépôt.
const ICON_PATHS = require('./item-icons.json');

const ICON_BASE =
  'https://cdn.jsdelivr.net/gh/Gwillewyn/dnd-item-icons-by-gwill@2c5be2c3ee21cd9b5029733181c4ff547f12b67a/Library/';

const iconUrl = (p) => ICON_BASE + p.split('/').map(encodeURIComponent).join('/');

/** Clé de comparaison : « Calligrapher's Supplies (1 set) » ≈ « Calligrapher Supplies », armour = armor. */
function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/armour/g, 'armor')
    .replace(/'s\b/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Noms exacts d'abord, puis variantes « Base - X » (« Bag of Tricks - Rust », « Ioun Stone - Agility », « Pony - Deed »).
const INDEX = new Map();
const names = ICON_PATHS.map((p) => [p, p.split('/').pop().replace(/\.svg$/i, '')]);
for (const [p, name] of names) if (!INDEX.has(norm(name))) INDEX.set(norm(name), p);
for (const [p, name] of names) {
  const m = name.match(/^(.+?) - (.+)$/);
  if (!m) continue;
  for (const alias of [m[1], `${m[2]} ${m[1]}`, `${m[1]} of ${m[2]}`]) if (!INDEX.has(norm(alias))) INDEX.set(norm(alias), p);
}

/** URL de l'icône dont le nom correspond à celui de l'objet (noms SRD anglais), sinon null. */
function matchItemIcon(itemName) {
  if (!itemName) return null;
  const s = String(itemName);
  const candidates = [s, s.replace(/'/g, '')]; // « Alchemist's Supplies » → icône « Alchemists Supplies »
  const comma = s.match(/^([^,]+),\s*(.+)$/); // « Crossbow, light » → « light Crossbow », « Crossbow »
  if (comma) candidates.push(`${comma[2]} ${comma[1]}`, comma[1]);
  const colon = s.match(/^([^:]+):\s*(.+)$/); // « Barding: Chain mail » → « Chain mail »
  if (colon) candidates.push(colon[2]);
  for (const c of candidates) {
    const p = INDEX.get(norm(c));
    if (p) return iconUrl(p);
  }
  return null;
}

module.exports = { ICON_PATHS, iconUrl, matchItemIcon };
