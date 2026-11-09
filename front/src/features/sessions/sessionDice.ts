import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut } from '../../shared/api/client'
import type { SessionDiceCharacterOption, SessionDiceRollEntry } from './components/SessionDiceTab'

export type DiceFavorite = { id: string; name: string; notation: string; label?: string }

/** MJ : jets enregistrés avec le 1er personnage de la session ; joueur : son perso sélectionné. */
export function resolveDiceCharacterId(
  isSessionOwner: boolean,
  diceCharacters: SessionDiceCharacterOption[],
  rollingCharacterId: number | null,
): number | null {
  const id = isSessionOwner ? diceCharacters[0]?.character_id : rollingCharacterId
  return typeof id === 'number' && Number.isFinite(id) ? id : null
}

/** Favoris stockés côté serveur (User.diceFavorites) pour suivre le joueur sur tous ses appareils. */
export function useDiceFavorites(token: string | null) {
  const [favorites, setFavorites] = useState<DiceFavorite[]>([])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    apiGet<{ favorites: DiceFavorite[] }>('/api/users/me/dice-favorites', token)
      .then((res) => {
        if (!cancelled && Array.isArray(res.favorites)) setFavorites(res.favorites)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token])

  const saveFavorites = useCallback(
    async (next: DiceFavorite[]) => {
      if (!token) return
      const res = await apiPut<{ favorites: DiceFavorite[] }>('/api/users/me/dice-favorites', { favorites: next }, token)
      setFavorites(res.favorites)
    },
    [token],
  )

  return { favorites, saveFavorites }
}

/** Tire les dés côté serveur, rejoue le résultat en 3D et ne résout qu’une fois les dés posés (pas de spoil du total). */
export async function postSessionDiceRoll(
  sessionId: number,
  token: string,
  characterId: number,
  payload: Record<string, unknown>,
): Promise<SessionDiceRollEntry> {
  const res = await apiPost<{ roll: SessionDiceRollEntry }>(
    `/api/sessions/${sessionId}/dice-rolls`,
    { ...payload, character_id: characterId },
    token,
  )
  const anim = toPredeterminedNotation(res.roll.notation, res.roll.rolls)
  // Animation purement décorative : un échec WebGL ne doit jamais bloquer le jet.
  if (anim) await import('./dice3d').then((m) => m.playDice3d(anim)).catch(() => {})
  return res.roll
}

const DICE_3D_SIDES = new Set([4, 6, 8, 10, 12, 20, 100])

/**
 * Notation « à résultat imposé » pour dice-box-threejs (ex. `2d6@3,5`).
 * Le d100 3D n’affiche que les dizaines : on le décompose en d100 (dizaines) + d10 (unités).
 */
export function toPredeterminedNotation(notation: string, rolls: number[]): string | null {
  const m = /^(\d*)d(\d+)/i.exec(notation.trim())
  if (!m || rolls.length === 0) return null
  const sides = Number(m[2])
  if (!DICE_3D_SIDES.has(sides)) return null
  const n = rolls.length
  if (sides !== 100) return `${n}d${sides}@${rolls.join(',')}`
  // 100 = « 00 » + « 0 » ; 5 = « 00 » + 5 ; 37 = 30 + 7
  const tens = rolls.map((v) => (v === 100 || v < 10 ? 100 : Math.floor(v / 10) * 10))
  const units = rolls.map((v) => v % 10 || 10)
  return `${n}d100+${n}d10@${[...tens, ...units].join(',')}`
}

const THEME_STORAGE_KEY = 'dice-3d-theme'

/** Palettes intégrées à dice-box-threejs ; textures servies depuis public/dice/textures. */
export const DICE_3D_THEMES = [
  { value: 'rust', label: '2d10 — Rouille' },
  { value: 'fire', label: 'Feu' },
  { value: 'ice', label: 'Glace' },
  { value: 'lightning', label: 'Foudre' },
  { value: 'acid', label: 'Acide' },
  { value: 'poison', label: 'Poison' },
  { value: 'necrotic', label: 'Nécrotique' },
  { value: 'radiant', label: 'Radiant' },
  { value: 'force', label: 'Force' },
  { value: 'bloodmoon', label: 'Lune de sang' },
  { value: 'astralsea', label: 'Mer astrale' },
  { value: 'starynight', label: 'Nuit étoilée' },
  { value: 'dragons', label: 'Dragons' },
  { value: 'glitterparty', label: 'Paillettes' },
  { value: 'coin_default', label: 'Or' },
  { value: 'rainbow', label: 'Arc-en-ciel' },
  { value: 'black', label: 'Noir' },
  { value: 'white', label: 'Blanc' },
] as const

export type Dice3dTheme = (typeof DICE_3D_THEMES)[number]['value']

/** Choix propre à chaque navigateur (préférence d’affichage, pas une donnée de jeu). */
export function getDice3dTheme(): Dice3dTheme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (DICE_3D_THEMES.some((t) => t.value === v)) return v as Dice3dTheme
  } catch {
    // stockage indisponible (navigation privée…) : thème par défaut
  }
  return 'rust'
}

/** Enregistre le thème et le montre avec un d20 d’essai (local, rien n’est envoyé au serveur). */
export async function previewDice3dTheme(theme: Dice3dTheme): Promise<void> {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignoré : le thème reste actif pour cet onglet
  }
  const m = await import('./dice3d')
  await m.applyDice3dTheme(theme)
  await m.playDice3d('1d20')
}
