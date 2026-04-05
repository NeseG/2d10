/**
 * Libellés FR pour l’affichage (données souvent en anglais SRD / dnd5eapi).
 * Les valeurs stockées (type enum, champs texte) restent inchangées.
 */

const ITEM_TYPE_LABEL_FR: Record<string, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  gear: 'Équipement',
  tool: 'Outil',
  mount: 'Monture',
  vehicle: 'Véhicule',
  ammunition: 'Munitions',
  consumable: 'Consommable',
  other: 'Autre',
}

/** Clé technique normalisée (filtres, comparaisons). */
export function normalizeItemTypeKey(typeValue?: string | null): string {
  const t = String(typeValue ?? '').trim().toLowerCase()
  if (!t) return 'other'
  const known = new Set([
    'armor',
    'weapon',
    'gear',
    'tool',
    'mount',
    'vehicle',
    'ammunition',
    'consumable',
    'other',
  ])
  if (known.has(t)) return t
  return t
}

export function translateItemType(typeValue?: string | null): string {
  const raw = String(typeValue ?? '').trim()
  if (!raw) return '—'
  const k = normalizeItemTypeKey(typeValue)
  return ITEM_TYPE_LABEL_FR[k] ?? raw
}

/** Clés en minuscules (libellés API / feuilles EN). */
const CATEGORY_EN_TO_FR: Record<string, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  'adventuring gear': "Équipement d'aventurier",
  tools: 'Outils',
  tool: 'Outil',
  'mounts and vehicles': 'Montures et véhicules',
  ammunition: 'Munitions',
  'arcane focus': 'Focaliseur arcanique',
  'druidic focus': 'Focaliseur druidique',
  'holy symbol': 'Symbole sacré',
  'gaming sets': 'Jeux',
  'musical instrument': 'Instrument de musique',
  'land vehicles': 'Véhicules terrestres',
  'water vehicles': 'Véhicules marins',
  'tack, harness, and drawn vehicles': 'Harnachement et véhicules à traction',
  'wondrous item': 'Objet merveilleux',
  'wonderous item': 'Objet merveilleux',
  ring: 'Anneau',
  rod: 'Sceptre',
  staff: 'Bâton',
  wand: 'Baguette',
  potion: 'Potion',
  scroll: 'Parchemin',
  'magic item': 'Objet magique',
  'melee weapon': 'Arme de corps à corps',
  'ranged weapon': 'Arme à distance',
  'magic weapon': 'Arme magique',
  'light armor': 'Armure légère',
  'medium armor': 'Armure moyenne',
  'heavy armor': 'Armure lourde',
  'magic armor': 'Armure magique',
  shield: 'Bouclier',
  'magic shield': 'Bouclier magique',
  'artisan tool': "Outil d'artisan",
  mount: 'Monture',
  vehicle: 'Véhicule',
  consumable: 'Consommable',
}

const SUBCATEGORY_EN_TO_FR: Record<string, string> = {
  simple: 'Simple',
  martial: 'De guerre',
  light: 'Légère',
  medium: 'Moyenne',
  heavy: 'Lourde',
  shield: 'Bouclier',
  'simple melee': 'Arme de corps à corps simple',
  'martial melee': 'Arme de corps à corps de guerre',
  'simple ranged': 'Arme à distance simple',
  'martial ranged': 'Arme à distance de guerre',
  'arcane focus': 'Focaliseur arcanique',
  'druidic focus': 'Focaliseur druidique',
  'holy symbol': 'Symbole sacré',
  ammunition: 'Munitions',
  potion: 'Potion',
  scroll: 'Parchemin',
  common: 'Courant',
  uncommon: 'Peu courant',
  rare: 'Rare',
  'very rare': 'Très rare',
  legendary: 'Légendaire',
  artifact: 'Artéfact',
  varies: 'Variable',
  unknown: 'Inconnu',
  standard: 'Standard',
}

const RARITY_EN_TO_FR: Record<string, string> = {
  common: 'Courant',
  uncommon: 'Peu courant',
  rare: 'Rare',
  'very rare': 'Très rare',
  legendary: 'Légendaire',
  artifact: 'Artéfact',
  varies: 'Variable',
  unknown: 'Inconnu',
  none: 'Aucune',
}

function lookupTranslated(map: Record<string, string>, value: string | null | undefined): string {
  const t = String(value ?? '').trim()
  if (!t) return '—'
  const k = t.toLowerCase()
  return map[k] ?? t
}

export function translateItemCategory(category: string | null | undefined): string {
  return lookupTranslated(CATEGORY_EN_TO_FR, category)
}

export function translateItemSubcategory(subcategory: string | null | undefined): string {
  return lookupTranslated(SUBCATEGORY_EN_TO_FR, subcategory)
}

/** Rareté d’objet magique (liste SRD). */
export function translateMagicItemRarity(rarity: string | null | undefined): string {
  return lookupTranslated(RARITY_EN_TO_FR, rarity)
}
