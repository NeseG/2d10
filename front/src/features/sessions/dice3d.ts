import DiceBox from '@3d-dice/dice-box-threejs'
import { getDice3dTheme, type Dice3dTheme } from './sessionDice'

const OVERLAY_ID = 'dice-3d-overlay'
const VISIBLE_AFTER_ROLL_MS = 2200

/** Couleurs unies (texture 'none') : thème par défaut, sans asset. */
const RUST_COLORSET = {
  name: '2d10-rust',
  foreground: '#f4e3c1',
  background: '#8a3a10',
  outline: '#1a0c04',
  edge: '#c05020',
  texture: 'none',
  material: 'glass',
}

type Box = {
  initialize(): Promise<void>
  roll(notation: string): Promise<unknown>
  clearDice(): void
  updateConfig(config: Record<string, unknown>): Promise<void>
}

let boxPromise: Promise<Box> | null = null
let hideTimer: number | undefined
let rollSeq = 0

function themeConfig(theme: Dice3dTheme): Record<string, unknown> {
  return theme === 'rust' ? { theme_customColorset: RUST_COLORSET } : { theme_colorset: theme }
}

/** Applique le thème à la scène déjà créée (sinon il sera lu à l’initialisation). */
export async function applyDice3dTheme(theme: Dice3dTheme): Promise<void> {
  if (boxPromise) await (await boxPromise).updateConfig(themeConfig(theme))
}

function getOverlay(): HTMLElement {
  let el = document.getElementById(OVERLAY_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = OVERLAY_ID
    el.className = 'dice-3d-overlay'
    el.setAttribute('aria-hidden', 'true')
    document.body.appendChild(el)
  }
  return el
}

function getBox(): Promise<Box> {
  // Le conteneur doit avoir sa taille finale avant initialize() (la lib lit clientWidth/Height).
  getOverlay()
  boxPromise ??= (async () => {
    const box = new DiceBox(`#${OVERLAY_ID}`, {
      assetPath: '/dice/',
      // « metal » rend presque noir sans environment map : on force le verre, plus lumineux.
      theme_material: 'glass',
      light_intensity: 1,
      gravity_multiplier: 400,
      strength: 1.2,
      ...themeConfig(getDice3dTheme()),
    }) as Box
    await box.initialize()
    return box
  })().catch((err) => {
    boxPromise = null
    throw err
  })
  return boxPromise
}

/** Joue une animation de dés 3D au premier plan ; `notation` peut imposer les résultats (`2d6@3,5`). */
export async function playDice3d(notation: string): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const seq = ++rollSeq
  const overlay = getOverlay()
  window.clearTimeout(hideTimer)
  overlay.classList.add('is-visible')
  const box = await getBox()
  await box.roll(notation)
  if (seq !== rollSeq) return // un autre jet a pris la main
  hideTimer = window.setTimeout(() => {
    overlay.classList.remove('is-visible')
    window.setTimeout(() => seq === rollSeq && box.clearDice(), 250)
  }, VISIBLE_AFTER_ROLL_MS)
}
