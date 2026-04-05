import type { AppThemeVars, ThemePalette } from './types'
import { DEFAULT_THEME_ID, getPaletteById } from './palettes'

export const THEME_STORAGE_KEY = '2d10-theme-palette-id'

export function applyThemeVars(vars: AppThemeVars): void {
  const root = document.documentElement
  ;(Object.entries(vars) as [keyof AppThemeVars, string][]).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function applyPaletteById(id: string): ThemePalette | undefined {
  const palette = getPaletteById(id)
  if (!palette) return undefined
  applyThemeVars(palette.vars)
  return palette
}

const LEGACY_PALETTE_IDS: Record<string, string> = {
  grimdark: 'default-or-rouille',
  verdant: 'clairiere-enchantee',
  /** Ancien id Forêt Ancienne */
  'foret-ancienne': 'clairiere-enchantee',
  /** Ancien « Palette 3 » remplacé par Jade Impérial */
  'reserved-03': 'jade-imperial',
  /** Ancien « Palette 4 » remplacé par Venin de serpent */
  'reserved-04': 'venin-serpent',
  /** Ancien « Palette 5 » remplacé par Brume Arcanique */
  'reserved-05': 'brume-arcanique',
  /** Ancien id Void Arcanique */
  'void-arcanique': 'brume-arcanique',
  /** Ancien « Palette 6 » remplacé par Crépuscule */
  'reserved-06': 'crepuscule',
  /** Ancien « Palette 7 » remplacé par Abyssal */
  'reserved-07': 'abyssal',
  /** Ancien « Palette 8 » remplacé par Océan profond */
  'reserved-08': 'ocean-profond',
  /** Ancien « Palette 9 » remplacé par Lagune Cristalline */
  'reserved-09': 'lagune-cristalline',
  /** Ancien id Givre */
  'givre': 'lagune-cristalline',
  /** Ancien « Palette 10 » remplacé par Sang et cendres */
  'reserved-10': 'sang-et-cendres',
  /** Ancien « Palette 11 » remplacé par Braise */
  'reserved-11': 'braise',
  /** Ancien « Palette 12 » remplacé par Rubis et Ivoire */
  'reserved-12': 'rubis-et-ivoire',
  /** Ancien id Rubis maudit */
  'rubis-maudit': 'rubis-et-ivoire',
  /** Ancien « Palette 13 » remplacé par Grimoire poussiéreux */
  'reserved-13': 'grimoire-poussiereux',
  /** Ancien id Volcan */
  volcan: 'grimoire-poussiereux',
  /** Ancien « Palette 14 » remplacé par Pétale de rose */
  'reserved-14': 'petale-de-rose',
  /** Ancien id Rose noire */
  'rose-noire': 'petale-de-rose',
  /** Ancien « Palette 15 » remplacé par Cerisier obscur */
  'reserved-15': 'cerisier-obscur',
  /** Ancien emplacement réservé Palette 16 (supprimé) */
  'reserved-16': 'default-or-rouille',
}

export function getStoredPaletteId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)?.trim()
    if (!raw) return DEFAULT_THEME_ID
    const migrated = LEGACY_PALETTE_IDS[raw] ?? raw
    if (getPaletteById(migrated)) return migrated
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID
}

export function setStoredPaletteId(id: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function initThemeFromStorage(): void {
  if (typeof document === 'undefined') return
  const id = getStoredPaletteId()
  applyPaletteById(id)
}
