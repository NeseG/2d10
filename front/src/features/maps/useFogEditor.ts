import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MapFogRect } from './components/MapCanvas'
import { applyFogOp, decodeFog, encodeFog, fogSize, maskFromRects, type FogBitmap, type FogMask, type FogOp } from './fog'

const HISTORY = 20
const LOCAL = '\u0000local' // masque modifié ici, encodage pas encore terminé

/**
 * Masque de brouillard décodé + édition (annuler, tout couvrir…).
 * `aspect` (hauteur / largeur de l'image) n'est connu qu'une fois l'image chargée : sans bitmap ni aspect, pas de masque.
 * `resetKey` (id de carte) sépare les historiques d'annulation.
 */
export function useFogEditor(opts: {
  fog: FogBitmap | null
  legacyRects: MapFogRect[]
  gridSize: number
  aspect: number | null
  resetKey: unknown
  onChange: (fog: FogBitmap) => void
}) {
  const { fog, legacyRects, gridSize, aspect, resetKey, onChange } = opts
  // Dernier masque connu et le bitmap dont il provient
  const [decoded, setDecoded] = useState<{ src: string; mask: FogMask } | null>(null)
  const [history, setHistory] = useState<{ key: unknown; stack: Uint8Array[] }>({ key: resetKey, stack: [] })
  // Bitmap que l'on vient d'envoyer : quand le serveur nous le renvoie, inutile de le redécoder.
  const lastSent = useRef<string | null>(null)

  useEffect(() => {
    if (!fog || fog.data === lastSent.current) return
    let cancelled = false
    decodeFog(fog)
      .then((mask) => !cancelled && setDecoded({ src: fog.data, mask }))
      .catch(() => !cancelled && setDecoded(null))
    return () => {
      cancelled = true
    }
  }, [fog])

  // Pas encore de bitmap (carte neuve ou anciens rectangles) : masque construit à la volée.
  const legacyMask = useMemo(() => {
    if (fog || !aspect) return null
    const { w, h } = fogSize(gridSize, aspect)
    return maskFromRects(w, h, legacyRects)
  }, [fog, aspect, gridSize, legacyRects])

  const mask = decoded && (decoded.src === LOCAL || (fog && decoded.src === fog.data)) ? decoded.mask : fog ? (decoded?.mask ?? null) : legacyMask
  const stack = history.key === resetKey ? history.stack : []

  const commit = useCallback(
    (next: FogMask) => {
      setDecoded({ src: LOCAL, mask: next })
      void encodeFog(next).then((b) => {
        lastSent.current = b.data
        setDecoded((cur) => (cur?.mask === next ? { src: b.data, mask: next } : cur))
        onChange(b)
      })
    },
    [onChange],
  )

  /** Modifie une copie du masque courant et l'envoie. */
  const update = (fn: (m: FogMask) => void) => {
    if (!mask) return
    setHistory({ key: resetKey, stack: [...stack.slice(-(HISTORY - 1)), mask.px] })
    const next = { ...mask, px: mask.px.slice() }
    fn(next)
    commit(next)
  }

  const undo = () => {
    const prev = stack[stack.length - 1]
    setHistory({ key: resetKey, stack: stack.slice(0, -1) })
    if (prev && mask && prev.length === mask.px.length) commit({ ...mask, px: prev })
  }

  return {
    mask,
    canUndo: stack.length > 0,
    undo,
    apply: (op: FogOp) => update((m) => applyFogOp(m, op)),
    coverAll: () => update((m) => m.px.fill(255)),
    clearAll: () => update((m) => m.px.fill(0)),
  }
}
