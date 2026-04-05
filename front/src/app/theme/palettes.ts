import type { AppThemeVars, ThemePalette } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Nouvelles variables de surface ajoutées à chaque thème :
//
//  --surface-input        Fond des champs texte, selects, inputs (login,
//                         inventaire, dés, initiative, bourse…)
//  --surface-input-raised Variante "surélevée" utilisée quand l'input est posé
//                         sur un fond --panel plutôt que sur --bg
//  --surface-session-card Fond de .session-live-character-panel-inner
//  --surface-shade        Fond très léger pour icônes filtres inventaire,
//                         options select grimoire (état neutre)
//  --surface-shade-mid    Même usage, état hover / actif
//  --surface-well         Fond discret : lignes initiative, rows dés, table
//                         responsive (plus foncé que --panel sur thème sombre,
//                         légèrement plus foncé que --bg sur thème clair)
//  --surface-band         Alternance de bande encore plus subtile (nth-child)
//  --surface-list-row     Fond de ligne dans les tableaux responsive
//  --surface-feature      Fond de .feature-card
//  --border-faint         Bordure quasi-invisible (séparateurs légers, dés…)
//  --focus-ring           Couleur du halo focus sur les inputs (remplace rgba fixe)
// ─────────────────────────────────────────────────────────────────────────────

/** Default Or et Rouille — identique à :root dans index.css. */
export const DEFAULT_OR_ROUILLE_VARS: AppThemeVars = {
  '--bg': '#08060a',
  '--panel': '#100c08',
  '--sidebar': '#060408',
  '--text': '#d4c0a8',
  '--muted': '#7a6a5a',
  '--border': '#2a1e14',
  '--primary': '#b07830',
  '--gold': '#c9a84c',
  '--gold-dim': '#7a6030',
  '--rust': '#8a3a10',
  '--rust-bright': '#c05020',
  '--rust-glow': '#e07040',
  '--lava': '#c0390a',
  '--blood': '#7a1010',
  '--blood-bright': '#b02020',
  '--steel': '#5a6a7a',
  '--steel-bright': '#8aaabf',
  '--ash': '#7a6a5a',
  '--bone': '#d4c0a8',
  '--void': '#0a0614',
  // surfaces
  '--surface-input':        '#060408',   // légèrement sous --bg
  '--surface-input-raised': '#180e0a',   // un cran au-dessus de --panel
  '--surface-session-card': 'rgba(16,12,8,0.72)',
  '--surface-shade':        'rgba(176,120,48,0.10)',
  '--surface-shade-mid':    'rgba(176,120,48,0.22)',
  '--surface-well':         '#0d0a07',
  '--surface-band':         'rgba(176,120,48,0.04)',
  '--surface-list-row':     '#0e0b08',
  '--surface-feature':      '#130e0a',
  '--border-faint':         '#1a1208',
  '--focus-ring':           'rgba(176,120,48,0.45)',
}

/** Clairière Enchantée — thème clair, vert clairière et mousse. */
export const CLAIRIERE_ENCHANTEE_VARS: AppThemeVars = {
  '--bg': '#f4f8f2',
  '--panel': '#e8f2e4',
  '--sidebar': '#d8eccc',
  '--text': '#182010',
  '--muted': '#507840',
  '--border': '#a8cc90',
  '--primary': '#3a7828',
  '--gold': '#509838',
  '--gold-dim': '#387028',
  '--rust': '#286018',
  '--rust-bright': '#409030',
  '--rust-glow': '#60b040',
  '--lava': '#881818',
  '--blood': '#500a0a',
  '--blood-bright': '#b02828',
  '--steel': '#507868',
  '--steel-bright': '#386858',
  '--ash': '#507840',
  '--bone': '#182010',
  '--void': '#d0e8c4',
  // surfaces
  '--surface-input':        '#ffffff',
  '--surface-input-raised': '#f4f8f2',
  '--surface-session-card': 'rgba(216,236,204,0.72)',
  '--surface-shade':        'rgba(58,120,40,0.07)',
  '--surface-shade-mid':    'rgba(58,120,40,0.16)',
  '--surface-well':         '#deecd8',
  '--surface-band':         'rgba(58,120,40,0.04)',
  '--surface-list-row':     '#eaf4e6',
  '--surface-feature':      '#eef6ea',
  '--border-faint':         '#c8e0b4',
  '--focus-ring':           'rgba(58,120,40,0.35)',
}

/** @deprecated utiliser CLAIRIERE_ENCHANTEE_VARS */
export const FORET_ANCIENNE_VARS = CLAIRIERE_ENCHANTEE_VARS

/** @deprecated utiliser CLAIRIERE_ENCHANTEE_VARS */
export const VERDANT_VARS = CLAIRIERE_ENCHANTEE_VARS

/** Jade Impérial — vert émeraude et jade. */
export const JADE_IMPERIAL_VARS: AppThemeVars = {
  '--bg': '#050a08',
  '--panel': '#0a120e',
  '--sidebar': '#040908',
  '--text': '#c0d8c8',
  '--muted': '#5a7a6a',
  '--border': '#142a20',
  '--primary': '#2a9a70',
  '--gold': '#60b890',
  '--gold-dim': '#2a6050',
  '--rust': '#187858',
  '--rust-bright': '#40a878',
  '--rust-glow': '#50c898',
  '--lava': '#903020',
  '--blood': '#501010',
  '--blood-bright': '#b04030',
  '--steel': '#506878',
  '--steel-bright': '#80a8b8',
  '--ash': '#5a7a6a',
  '--bone': '#c0d8c8',
  '--void': '#020806',
  // surfaces
  '--surface-input':        '#030806',
  '--surface-input-raised': '#0e1812',
  '--surface-session-card': 'rgba(10,18,14,0.72)',
  '--surface-shade':        'rgba(42,154,112,0.10)',
  '--surface-shade-mid':    'rgba(42,154,112,0.22)',
  '--surface-well':         '#080e0a',
  '--surface-band':         'rgba(42,154,112,0.04)',
  '--surface-list-row':     '#090f0b',
  '--surface-feature':      '#0c1610',
  '--border-faint':         '#0c1e16',
  '--focus-ring':           'rgba(42,154,112,0.45)',
}

/** Venin de serpent — vert venimeux et citronné. */
export const VENIN_SERPENT_VARS: AppThemeVars = {
  '--bg': '#060809',
  '--panel': '#0c1208',
  '--sidebar': '#050808',
  '--text': '#c8d8a0',
  '--muted': '#6a7848',
  '--border': '#1a2810',
  '--primary': '#6ab820',
  '--gold': '#80c830',
  '--gold-dim': '#407810',
  '--rust': '#3a8810',
  '--rust-bright': '#60a820',
  '--rust-glow': '#90d840',
  '--lava': '#a84010',
  '--blood': '#601808',
  '--blood-bright': '#d06020',
  '--steel': '#486858',
  '--steel-bright': '#78a878',
  '--ash': '#6a7848',
  '--bone': '#c8d8a0',
  '--void': '#040606',
  // surfaces
  '--surface-input':        '#040707',
  '--surface-input-raised': '#101608',
  '--surface-session-card': 'rgba(12,18,8,0.72)',
  '--surface-shade':        'rgba(106,184,32,0.10)',
  '--surface-shade-mid':    'rgba(106,184,32,0.20)',
  '--surface-well':         '#090d07',
  '--surface-band':         'rgba(106,184,32,0.04)',
  '--surface-list-row':     '#0a0e07',
  '--surface-feature':      '#0e1609',
  '--border-faint':         '#111e0a',
  '--focus-ring':           'rgba(106,184,32,0.45)',
}

/** Brume Arcanique — thème clair, violet brumeux et mana doux. */
export const BRUME_ARCANIQUE_VARS: AppThemeVars = {
  '--bg': '#f8f6fc',
  '--panel': '#f0ecf8',
  '--sidebar': '#e4daf2',
  '--text': '#1a1028',
  '--muted': '#705890',
  '--border': '#c8b0e0',
  '--primary': '#6840b0',
  '--gold': '#8058c8',
  '--gold-dim': '#5030a0',
  '--rust': '#502890',
  '--rust-bright': '#6840b0',
  '--rust-glow': '#9068d0',
  '--lava': '#881818',
  '--blood': '#500808',
  '--blood-bright': '#b82828',
  '--steel': '#606080',
  '--steel-bright': '#484870',
  '--ash': '#705890',
  '--bone': '#1a1028',
  '--void': '#dcd0f0',
  // surfaces
  '--surface-input':        '#ffffff',
  '--surface-input-raised': '#f8f6fc',
  '--surface-session-card': 'rgba(228,218,242,0.72)',
  '--surface-shade':        'rgba(104,64,176,0.07)',
  '--surface-shade-mid':    'rgba(104,64,176,0.16)',
  '--surface-well':         '#e8e2f4',
  '--surface-band':         'rgba(104,64,176,0.04)',
  '--surface-list-row':     '#f2eef8',
  '--surface-feature':      '#f4f0fa',
  '--border-faint':         '#dac8ee',
  '--focus-ring':           'rgba(104,64,176,0.35)',
}

/** @deprecated utiliser BRUME_ARCANIQUE_VARS */
export const VOID_ARCANIQUE_VARS = BRUME_ARCANIQUE_VARS

/** Crépuscule — violet doux, entre jour et nuit. */
export const CREPUSCULE_VARS: AppThemeVars = {
  '--bg': '#080610',
  '--panel': '#100c18',
  '--sidebar': '#060410',
  '--text': '#d0c0e8',
  '--muted': '#705888',
  '--border': '#201430',
  '--primary': '#9050d0',
  '--gold': '#b070e0',
  '--gold-dim': '#5828a0',
  '--rust': '#6830b0',
  '--rust-bright': '#9050d0',
  '--rust-glow': '#b880f0',
  '--lava': '#b02858',
  '--blood': '#681030',
  '--blood-bright': '#d84880',
  '--steel': '#5060a8',
  '--steel-bright': '#8090d0',
  '--ash': '#705888',
  '--bone': '#d0c0e8',
  '--void': '#040210',
  // surfaces
  '--surface-input':        '#060410',
  '--surface-input-raised': '#160e20',
  '--surface-session-card': 'rgba(16,12,24,0.72)',
  '--surface-shade':        'rgba(144,80,208,0.10)',
  '--surface-shade-mid':    'rgba(144,80,208,0.22)',
  '--surface-well':         '#0c0916',
  '--surface-band':         'rgba(144,80,208,0.04)',
  '--surface-list-row':     '#0d0a18',
  '--surface-feature':      '#140e20',
  '--border-faint':         '#160e24',
  '--focus-ring':           'rgba(144,80,208,0.45)',
}

/** Abyssal — bleu des profondeurs. */
export const ABYSSAL_VARS: AppThemeVars = {
  '--bg': '#050810',
  '--panel': '#0a0c1a',
  '--sidebar': '#040610',
  '--text': '#b0c0e0',
  '--muted': '#4a5878',
  '--border': '#101828',
  '--primary': '#3050b0',
  '--gold': '#5070c8',
  '--gold-dim': '#182870',
  '--rust': '#1830a0',
  '--rust-bright': '#3050b0',
  '--rust-glow': '#6080e0',
  '--lava': '#a02038',
  '--blood': '#580818',
  '--blood-bright': '#c83858',
  '--steel': '#384870',
  '--steel-bright': '#6880b8',
  '--ash': '#4a5878',
  '--bone': '#b0c0e0',
  '--void': '#020410',
  // surfaces
  '--surface-input':        '#030610',
  '--surface-input-raised': '#0c1020',
  '--surface-session-card': 'rgba(10,12,26,0.72)',
  '--surface-shade':        'rgba(48,80,176,0.10)',
  '--surface-shade-mid':    'rgba(48,80,176,0.22)',
  '--surface-well':         '#080b18',
  '--surface-band':         'rgba(48,80,176,0.04)',
  '--surface-list-row':     '#09091a',
  '--surface-feature':      '#0c1020',
  '--border-faint':         '#0c1420',
  '--focus-ring':           'rgba(48,80,176,0.45)',
}

/** Océan profond — bleu marin et embruns. */
export const OCEAN_PROFOND_VARS: AppThemeVars = {
  '--bg': '#040810',
  '--panel': '#080f18',
  '--sidebar': '#040810',
  '--text': '#a8c8e0',
  '--muted': '#406080',
  '--border': '#102030',
  '--primary': '#1870b0',
  '--gold': '#3090c8',
  '--gold-dim': '#104868',
  '--rust': '#0858a0',
  '--rust-bright': '#2880c0',
  '--rust-glow': '#40a0d8',
  '--lava': '#982020',
  '--blood': '#501010',
  '--blood-bright': '#c03838',
  '--steel': '#305878',
  '--steel-bright': '#5888a8',
  '--ash': '#406080',
  '--bone': '#a8c8e0',
  '--void': '#020610',
  // surfaces
  '--surface-input':        '#030710',
  '--surface-input-raised': '#0c1420',
  '--surface-session-card': 'rgba(8,15,24,0.72)',
  '--surface-shade':        'rgba(24,112,176,0.10)',
  '--surface-shade-mid':    'rgba(24,112,176,0.22)',
  '--surface-well':         '#070c16',
  '--surface-band':         'rgba(24,112,176,0.04)',
  '--surface-list-row':     '#070c18',
  '--surface-feature':      '#0a1220',
  '--border-faint':         '#0c1a28',
  '--focus-ring':           'rgba(24,112,176,0.45)',
}

/** Lagune Cristalline — thème clair, eau turquoise et reflets. */
export const LAGUNE_CRISTALLINE_VARS: AppThemeVars = {
  '--bg': '#f4fafe',
  '--panel': '#e8f4fc',
  '--sidebar': '#d4edf8',
  '--text': '#102030',
  '--muted': '#406080',
  '--border': '#90c4e0',
  '--primary': '#1878b0',
  '--gold': '#2898d0',
  '--gold-dim': '#1060a0',
  '--rust': '#106098',
  '--rust-bright': '#2080c0',
  '--rust-glow': '#38a0d8',
  '--lava': '#881010',
  '--blood': '#500808',
  '--blood-bright': '#b82020',
  '--steel': '#406888',
  '--steel-bright': '#305878',
  '--ash': '#406080',
  '--bone': '#102030',
  '--void': '#c8e4f4',
  // surfaces
  '--surface-input':        '#ffffff',
  '--surface-input-raised': '#f4fafe',
  '--surface-session-card': 'rgba(212,237,248,0.72)',
  '--surface-shade':        'rgba(24,120,176,0.07)',
  '--surface-shade-mid':    'rgba(24,120,176,0.16)',
  '--surface-well':         '#daeef8',
  '--surface-band':         'rgba(24,120,176,0.04)',
  '--surface-list-row':     '#edf7fc',
  '--surface-feature':      '#eef6fc',
  '--border-faint':         '#b0d8ee',
  '--focus-ring':           'rgba(24,120,176,0.35)',
}

/** @deprecated utiliser LAGUNE_CRISTALLINE_VARS */
export const GIVRE_VARS = LAGUNE_CRISTALLINE_VARS

/** Sang et cendres — rouge sombre et cendre. */
export const SANG_CENDRES_VARS: AppThemeVars = {
  '--bg': '#0a0506',
  '--panel': '#140809',
  '--sidebar': '#080406',
  '--text': '#e0b8b0',
  '--muted': '#806050',
  '--border': '#2a1010',
  '--primary': '#a01818',
  '--gold': '#c02828',
  '--gold-dim': '#601010',
  '--rust': '#801010',
  '--rust-bright': '#b02020',
  '--rust-glow': '#d04040',
  '--lava': '#c01818',
  '--blood': '#700a0a',
  '--blood-bright': '#e02828',
  '--steel': '#5a6070',
  '--steel-bright': '#8a9aaa',
  '--ash': '#806050',
  '--bone': '#e0b8b0',
  '--void': '#060204',
  // surfaces
  '--surface-input':        '#070304',
  '--surface-input-raised': '#180a0a',
  '--surface-session-card': 'rgba(20,8,9,0.72)',
  '--surface-shade':        'rgba(160,24,24,0.10)',
  '--surface-shade-mid':    'rgba(160,24,24,0.22)',
  '--surface-well':         '#0e0607',
  '--surface-band':         'rgba(160,24,24,0.04)',
  '--surface-list-row':     '#0f0607',
  '--surface-feature':      '#180a0a',
  '--border-faint':         '#1a0a0a',
  '--focus-ring':           'rgba(160,24,24,0.45)',
}

/** Braise — feu, braises et charbon chaud. */
export const BRAISE_VARS: AppThemeVars = {
  '--bg': '#0a0604',
  '--panel': '#140a06',
  '--sidebar': '#080504',
  '--text': '#e0c0a0',
  '--muted': '#806048',
  '--border': '#2a1408',
  '--primary': '#c03818',
  '--gold': '#d04820',
  '--gold-dim': '#702010',
  '--rust': '#a02810',
  '--rust-bright': '#c03818',
  '--rust-glow': '#e06030',
  '--lava': '#b81010',
  '--blood': '#680808',
  '--blood-bright': '#e02828',
  '--steel': '#607080',
  '--steel-bright': '#90a8b8',
  '--ash': '#806048',
  '--bone': '#e0c0a0',
  '--void': '#060402',
  // surfaces
  '--surface-input':        '#070503',
  '--surface-input-raised': '#180c06',
  '--surface-session-card': 'rgba(20,10,6,0.72)',
  '--surface-shade':        'rgba(192,56,24,0.10)',
  '--surface-shade-mid':    'rgba(192,56,24,0.22)',
  '--surface-well':         '#0e0805',
  '--surface-band':         'rgba(192,56,24,0.04)',
  '--surface-list-row':     '#0f0905',
  '--surface-feature':      '#180e06',
  '--border-faint':         '#1c0e06',
  '--focus-ring':           'rgba(192,56,24,0.45)',
}

/** Rubis et Ivoire — thème clair, carmin et douceur ivoire. */
export const RUBIS_ET_IVOIRE_VARS: AppThemeVars = {
  '--bg': '#fdf4f6',
  '--panel': '#f8e8ec',
  '--sidebar': '#f0d4da',
  '--text': '#280810',
  '--muted': '#905060',
  '--border': '#e8a0b0',
  '--primary': '#b01040',
  '--gold': '#c82050',
  '--gold-dim': '#900830',
  '--rust': '#800828',
  '--rust-bright': '#b01040',
  '--rust-glow': '#d82858',
  '--lava': '#c00810',
  '--blood': '#700408',
  '--blood-bright': '#e01020',
  '--steel': '#607080',
  '--steel-bright': '#485868',
  '--ash': '#905060',
  '--bone': '#280810',
  '--void': '#f0d4da',
  // surfaces
  '--surface-input':        '#ffffff',
  '--surface-input-raised': '#fdf4f6',
  '--surface-session-card': 'rgba(240,212,218,0.72)',
  '--surface-shade':        'rgba(176,16,64,0.07)',
  '--surface-shade-mid':    'rgba(176,16,64,0.16)',
  '--surface-well':         '#f0dce2',
  '--surface-band':         'rgba(176,16,64,0.04)',
  '--surface-list-row':     '#faeef2',
  '--surface-feature':      '#fbf0f3',
  '--border-faint':         '#f0b8c8',
  '--focus-ring':           'rgba(176,16,64,0.35)',
}

/** @deprecated utiliser RUBIS_ET_IVOIRE_VARS */
export const RUBIS_MAUDIT_VARS = RUBIS_ET_IVOIRE_VARS

/** Grimoire poussiéreux — parchemin, encre et reliure vieillie. */
export const GRIMOIRE_POUSSIEREUX_VARS: AppThemeVars = {
  '--bg': '#f5f0e8',
  '--panel': '#ece4d0',
  '--sidebar': '#e0d4b8',
  '--text': '#281808',
  '--muted': '#806848',
  '--border': '#c8a870',
  '--primary': '#7a4a08',
  '--gold': '#a06818',
  '--gold-dim': '#c08820',
  '--rust': '#603008',
  '--rust-bright': '#8a4a10',
  '--rust-glow': '#b06820',
  '--lava': '#801818',
  '--blood': '#500808',
  '--blood-bright': '#a82020',
  '--steel': '#586878',
  '--steel-bright': '#405060',
  '--ash': '#806848',
  '--bone': '#281808',
  '--void': '#ece4d0',
  // surfaces
  '--surface-input':        '#faf6ee',
  '--surface-input-raised': '#f5f0e8',
  '--surface-session-card': 'rgba(224,212,184,0.72)',
  '--surface-shade':        'rgba(122,74,8,0.07)',
  '--surface-shade-mid':    'rgba(122,74,8,0.16)',
  '--surface-well':         '#e4d8c0',
  '--surface-band':         'rgba(122,74,8,0.04)',
  '--surface-list-row':     '#eee6d0',
  '--surface-feature':      '#f0e8d4',
  '--border-faint':         '#d8be90',
  '--focus-ring':           'rgba(122,74,8,0.35)',
}

/** @deprecated utiliser GRIMOIRE_POUSSIEREUX_VARS */
export const VOLCAN_VARS = GRIMOIRE_POUSSIEREUX_VARS

/** Pétale de rose — thème clair, rose poudré et douceur. */
export const PETALE_DE_ROSE_VARS: AppThemeVars = {
  '--bg': '#fdf6f8',
  '--panel': '#faeef2',
  '--sidebar': '#f5e4ea',
  '--text': '#28101a',
  '--muted': '#906070',
  '--border': '#e8b0c0',
  '--primary': '#b03060',
  '--gold': '#c84878',
  '--gold-dim': '#902050',
  '--rust': '#882040',
  '--rust-bright': '#b03060',
  '--rust-glow': '#d05080',
  '--lava': '#881010',
  '--blood': '#500808',
  '--blood-bright': '#b82020',
  '--steel': '#706080',
  '--steel-bright': '#585070',
  '--ash': '#906070',
  '--bone': '#28101a',
  '--void': '#f0d8e4',
  // surfaces
  '--surface-input':        '#ffffff',
  '--surface-input-raised': '#fdf6f8',
  '--surface-session-card': 'rgba(245,228,234,0.72)',
  '--surface-shade':        'rgba(176,48,96,0.07)',
  '--surface-shade-mid':    'rgba(176,48,96,0.16)',
  '--surface-well':         '#f2e4ea',
  '--surface-band':         'rgba(176,48,96,0.04)',
  '--surface-list-row':     '#faf0f4',
  '--surface-feature':      '#fdf2f6',
  '--border-faint':         '#f0c4d0',
  '--focus-ring':           'rgba(176,48,96,0.35)',
}

/** @deprecated utiliser PETALE_DE_ROSE_VARS */
export const ROSE_NOIRE_VARS = PETALE_DE_ROSE_VARS

/** Cerisier obscur — rose cerise et ombre de floraison. */
export const CERISIER_OBSCUR_VARS: AppThemeVars = {
  '--bg': '#090508',
  '--panel': '#140a0e',
  '--sidebar': '#080408',
  '--text': '#e0b8d0',
  '--muted': '#806878',
  '--border': '#280a20',
  '--primary': '#b83070',
  '--gold': '#d04080',
  '--gold-dim': '#681848',
  '--rust': '#902058',
  '--rust-bright': '#b83070',
  '--rust-glow': '#e05898',
  '--lava': '#b01010',
  '--blood': '#600808',
  '--blood-bright': '#d82828',
  '--steel': '#587080',
  '--steel-bright': '#88a8b8',
  '--ash': '#806878',
  '--bone': '#e0b8d0',
  '--void': '#060208',
  // surfaces
  '--surface-input':        '#060408',
  '--surface-input-raised': '#1a0c12',
  '--surface-session-card': 'rgba(20,10,14,0.72)',
  '--surface-shade':        'rgba(184,48,112,0.10)',
  '--surface-shade-mid':    'rgba(184,48,112,0.22)',
  '--surface-well':         '#0e0710',
  '--surface-band':         'rgba(184,48,112,0.04)',
  '--surface-list-row':     '#0f0810',
  '--surface-feature':      '#180a14',
  '--border-faint':         '#1c0818',
  '--focus-ring':           'rgba(184,48,112,0.45)',
}

export const DEFAULT_THEME_ID = 'default-or-rouille'

/** @deprecated utiliser DEFAULT_OR_ROUILLE_VARS */
export const GRIMDARK_VARS = DEFAULT_OR_ROUILLE_VARS

/** 15 palettes définies. */
export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'default-or-rouille',
    label: 'Default Or et Rouille',
    description: 'Or brûlé, rouille et parchemin',
    vars: DEFAULT_OR_ROUILLE_VARS,
  },
  {
    id: 'venin-serpent',
    label: 'Venin de serpent',
    description: 'Vert toxique et acide',
    vars: VENIN_SERPENT_VARS,
  },
  {
    id: 'jade-imperial',
    label: 'Jade Impérial',
    description: 'Émeraude et jade',
    vars: JADE_IMPERIAL_VARS,
  },
  {
    id: 'crepuscule',
    label: 'Crépuscule',
    description: 'Lilas et dernière lueur',
    vars: CREPUSCULE_VARS,
  },
  {
    id: 'abyssal',
    label: 'Abyssal',
    description: 'Bleu profond et océan nocturne',
    vars: ABYSSAL_VARS,
  },
  {
    id: 'ocean-profond',
    label: 'Océan profond',
    description: 'Cyan marin et eaux froides',
    vars: OCEAN_PROFOND_VARS,
  },
  {
    id: 'sang-et-cendres',
    label: 'Sang et cendres',
    description: 'Carmin, braise et cendre',
    vars: SANG_CENDRES_VARS,
  },
  {
    id: 'braise',
    label: 'Braise',
    description: 'Flammes basses et braises orangées',
    vars: BRAISE_VARS,
  },
  {
    id: 'cerisier-obscur',
    label: 'Cerisier obscur',
    description: 'Rose cerise, floraison nocturne',
    vars: CERISIER_OBSCUR_VARS,
  },
  {
    id: 'brume-arcanique',
    label: 'Brume Arcanique',
    description: 'Clair, violet brumeux et runes',
    vars: BRUME_ARCANIQUE_VARS,
  },
  {
    id: 'clairiere-enchantee',
    label: 'Clairière Enchantée',
    description: 'Clair, mousse et lumière filtrée',
    vars: CLAIRIERE_ENCHANTEE_VARS,
  },
  {
    id: 'grimoire-poussiereux',
    label: 'Grimoire Poussiéreux',
    description: 'Parchemin, encre sépia et reliure',
    vars: GRIMOIRE_POUSSIEREUX_VARS,
  },
  {
    id: 'lagune-cristalline',
    label: 'Lagune Cristalline',
    description: 'Clair, eau limpide et reflets',
    vars: LAGUNE_CRISTALLINE_VARS,
  },
  {
    id: 'petale-de-rose',
    label: 'Pétale de rose',
    description: 'Clair, rose poudré et douceur',
    vars: PETALE_DE_ROSE_VARS,
  },
  {
    id: 'rubis-et-ivoire',
    label: 'Rubis et Ivoire',
    description: 'Clair, carmin et tons ivoire',
    vars: RUBIS_ET_IVOIRE_VARS,
  },
]

export function getPaletteById(id: string): ThemePalette | undefined {
  return THEME_PALETTES.find((p) => p.id === id)
}
