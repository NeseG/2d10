import DiceBox from '@3d-dice/dice-box-threejs'

const OVERLAY_ID = 'dice-3d-overlay'
const VISIBLE_AFTER_ROLL_MS = 2200

type Box = { initialize(): Promise<void>; roll(notation: string): Promise<unknown>; clearDice(): void }

let boxPromise: Promise<Box> | null = null
let hideTimer: number | undefined
let rollSeq = 0

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
      // Couleurs unies (texture 'none') : aucun asset à copier dans public/.
      theme_customColorset: {
        name: '2d10-rust',
        foreground: '#f4e3c1',
        background: '#8a3a10',
        outline: '#1a0c04',
        edge: '#c05020',
        texture: 'none',
        material: 'metal',
      },
      gravity_multiplier: 400,
      strength: 1.2,
    }) as Box
    await box.initialize()
    return box
  })().catch((err) => {
    boxPromise = null
    throw err
  })
  return boxPromise
}

/** Joue une animation de dés 3D au premier plan ; `notation` doit contenir les résultats imposés (`2d6@3,5`). */
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
