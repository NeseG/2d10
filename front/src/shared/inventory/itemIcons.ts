// Icônes d'objets « D&D Item Icons » de Gwillewyn (CC BY 3.0, d'après game-icons.net),
// servies par jsDelivr, épinglées sur un commit. Liste des fichiers : itemIcons.json (dossier Library/ du dépôt).
export const ITEM_ICONS_BASE = 'https://cdn.jsdelivr.net/gh/Gwillewyn/dnd-item-icons-by-gwill@2c5be2c3ee21cd9b5029733181c4ff547f12b67a/Library/'
export const ITEM_ICONS_CREDIT = 'Icônes : Gwillewyn / game-icons.net (CC BY 3.0)'

export function itemIconUrl(path: string): string {
  return ITEM_ICONS_BASE + path.split('/').map(encodeURIComponent).join('/')
}

/** « Potions, …/Generic/Bottle - Red.svg » → { name: 'Bottle - Red', category: 'Potions, … · Generic' } */
export function parseItemIconPath(path: string): { name: string; category: string } {
  const parts = path.split('/')
  const name = (parts.pop() ?? '').replace(/\.svg$/i, '')
  return { name, category: parts.join(' · ') }
}

/** Chargé à la demande (40 Ko) pour ne pas alourdir le bundle principal. */
export async function loadItemIconPaths(): Promise<string[]> {
  return (await import('./itemIcons.json')).default as string[]
}
