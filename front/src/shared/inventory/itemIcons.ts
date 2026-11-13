import { getApiBaseUrl } from '../api/client'

// Icônes d'objets « D&D Item Icons » de Gwillewyn (liste et correspondance par nom : back/lib/item-icons.js).
export const ITEM_ICONS_CREDIT = 'Icônes : Gwillewyn / game-icons.net (CC BY 3.0)'

export type ItemIcon = { path: string; url: string }

/** « Potions, …/Generic/Bottle - Red.svg » → { name: 'Bottle - Red', category: 'Potions, … · Generic' } */
export function parseItemIconPath(path: string): { name: string; category: string } {
  const parts = path.split('/')
  const name = (parts.pop() ?? '').replace(/\.svg$/i, '')
  return { name, category: parts.join(' · ') }
}

/** imageUrl d'un objet → src : les images importées sont servies par l'API (/uploads/…). */
export function itemImageSrc(url: string): string {
  return url.startsWith('/') ? `${getApiBaseUrl()}${url}` : url
}
