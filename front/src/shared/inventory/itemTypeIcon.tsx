import type { ReactNode } from 'react'
import { Car, Cog, Dog, FlaskRound, Pickaxe, RotateCcw, Shapes, Shield, Sword } from 'lucide-react'
import { normalizeItemTypeKey } from './itemDisplayLabels'

/** Icône + clé technique (pour filtres : weapon, armor, …). */
export function getItemTypeIcon(typeValue?: string | null): { icon: ReactNode; key: string } {
  const raw = String(typeValue ?? '').trim()
  const key = normalizeItemTypeKey(typeValue)

  if (!raw) {
    return { icon: <Shapes size={18} aria-hidden="true" />, key: 'other' }
  }

  switch (key) {
    case 'armor':
      return { icon: <Shield size={18} aria-hidden="true" />, key: 'armor' }
    case 'weapon':
      return { icon: <Sword size={18} aria-hidden="true" />, key: 'weapon' }
    case 'gear':
      return { icon: <Cog size={18} aria-hidden="true" />, key: 'gear' }
    case 'tool':
      return { icon: <Pickaxe size={18} aria-hidden="true" />, key: 'tool' }
    case 'mount':
      return { icon: <Dog size={18} aria-hidden="true" />, key: 'mount' }
    case 'vehicle':
      return { icon: <Car size={18} aria-hidden="true" />, key: 'vehicle' }
    case 'ammunition':
      return { icon: <RotateCcw size={18} aria-hidden="true" />, key: 'ammunition' }
    case 'consumable':
      return { icon: <FlaskRound size={18} aria-hidden="true" />, key: 'consumable' }
    default:
      return { icon: <Shapes size={18} aria-hidden="true" />, key }
  }
}
