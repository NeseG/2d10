/**
 * Toutes les variables exposées dans :root (index.css) pour un thème cohérent.
 * Les palettes utilisateur peuvent partir des 7 « core » puis compléter les accents.
 */
export type AppThemeVars = {
  '--bg': string
  '--panel': string
  '--sidebar': string
  '--text': string
  '--muted': string
  '--border': string
  '--primary': string
  '--gold': string
  '--gold-dim': string
  '--rust': string
  '--rust-bright': string
  '--rust-glow': string
  '--lava': string
  '--blood': string
  '--blood-bright': string
  '--steel': string
  '--steel-bright': string
  '--ash': string
  '--bone': string
  '--void': string

  /** Surfaces UI (inputs, cartes session, boutons dérivés dans index.css, etc.) */
  '--surface-input': string
  '--surface-input-raised': string
  '--surface-session-card': string
  '--surface-shade': string
  '--surface-shade-mid': string
  '--surface-well': string
  '--surface-band': string
  '--surface-list-row': string
  '--surface-feature': string
  '--border-faint': string
  '--focus-ring': string
}

export type ThemePalette = {
  id: string
  label: string
  /** Texte court pour les emplacements réservés */
  description?: string
  vars: AppThemeVars
}
