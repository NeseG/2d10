export type Pt = { x: number; y: number }
export type Seg = { x1: number; y1: number; x2: number; y2: number }

/** Grille par défaut : 20 cases de 1,5 m en largeur, masquée. */
export const DEFAULT_GRID = { size: 0.05, ox: 0, oy: 0, unit: 1.5, show: false, snap: false }

/**
 * Polygone de visibilité depuis `o` dans le rectangle [0,w]×[0,h] :
 * un rayon vers chaque extrémité de segment (±ε pour passer les coins), on garde l'impact le plus proche.
 */
export function visibilityPolygon(o: Pt, walls: Seg[], w: number, h: number): Pt[] {
  const segs: Seg[] = [
    ...walls,
    { x1: 0, y1: 0, x2: w, y2: 0 },
    { x1: w, y1: 0, x2: w, y2: h },
    { x1: w, y1: h, x2: 0, y2: h },
    { x1: 0, y1: h, x2: 0, y2: 0 },
  ]
  const angles: number[] = []
  for (const s of segs) {
    for (const a of [Math.atan2(s.y1 - o.y, s.x1 - o.x), Math.atan2(s.y2 - o.y, s.x2 - o.x)]) {
      angles.push(a - 1e-4, a, a + 1e-4)
    }
  }
  angles.sort((a, b) => a - b)
  return angles.map((a) => {
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    let best = Infinity
    for (const s of segs) {
      const sx = s.x2 - s.x1
      const sy = s.y2 - s.y1
      const den = dx * sy - dy * sx
      if (Math.abs(den) < 1e-12) continue
      const t = ((s.x1 - o.x) * sy - (s.y1 - o.y) * sx) / den
      const u = ((s.x1 - o.x) * dy - (s.y1 - o.y) * dx) / den
      if (t > 1e-9 && u >= 0 && u <= 1 && t < best) best = t
    }
    return best === Infinity ? o : { x: o.x + dx * best, y: o.y + dy * best }
  })
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** Aimante `v` sur la grille de pas `step` décalée de `origin`. */
export function snapTo(v: number, origin: number, step: number): number {
  return step > 0 ? Math.round((v - origin) / step) * step + origin : v
}

/** Distance D&D 5e (règle par défaut : une diagonale coûte une case), en cases. */
export function gridDistance(dx: number, dy: number, cell: number): number {
  return cell > 0 ? Math.max(Math.round(Math.abs(dx) / cell), Math.round(Math.abs(dy) / cell)) : 0
}
