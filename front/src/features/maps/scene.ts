import type { MapFogRect, MapGrid, MapLight, MapTemplate, MapToken, MapVision, MapWall, MapZone } from './components/MapCanvas'
import { DEFAULT_GRID } from './geometry'
import { isFogBitmap, type FogBitmap } from './fog'

/** Carte telle que renvoyée par l'API. La scène est répartie dans ses deux colonnes JSON. */
export type CampaignMap = {
  id: number
  campaign_id: number
  name: string
  image_url: string
  fog_state?: unknown
  tokens_state?: unknown
  has_play_state?: boolean // en session : la partie jouée diverge du modèle
}

export type Scene = {
  tokens: MapToken[]
  fog: FogBitmap | null
  /** Anciennes cartes : brouillard en rectangles, converti en bitmap à la première modification. */
  fogRects: MapFogRect[]
  zones: MapZone[]
  grid: MapGrid
  walls: MapWall[]
  lights: MapLight[]
  templates: MapTemplate[]
  vision: MapVision
}

export const EMPTY_SCENE: Scene = {
  tokens: [],
  fog: null,
  fogRects: [],
  zones: [],
  grid: DEFAULT_GRID,
  walls: [],
  lights: [],
  templates: [],
  vision: { dynamic: false, dark: false },
}

// Catégories de taille D&D 5e, en cases de côté
export const SIZE_PRESETS: [string, number][] = [
  ['TP', 0.5],
  ['P / M', 1],
  ['G', 2],
  ['TG', 3],
  ['Gig', 4],
]

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
export const normName = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

export function parseScene(map: CampaignMap | null | undefined): Scene {
  const ts = (map?.tokens_state ?? {}) as Record<string, unknown>
  const fs = (map?.fog_state ?? {}) as Record<string, unknown>
  const g = (ts.grid ?? {}) as Partial<MapGrid>
  const segOk = (w: { x1: number; y1: number; x2: number; y2: number }) => [w?.x1, w?.y1, w?.x2, w?.y2].every(Number.isFinite)
  return {
    tokens: arr<MapToken>(ts.tokens)
      .filter((x) => x && typeof x.id === 'string' && Number.isFinite(x.x) && Number.isFinite(x.y))
      // Anciennes cartes : coordonnées en pixels d'un canvas 1100×650
      .map((x) => ({ ...x, x: clamp(x.x > 1 ? x.x / 1100 : x.x, 0, 1), y: clamp(x.y > 1 ? x.y / 650 : x.y, 0, 1) })),
    fog: isFogBitmap(fs.fog) ? fs.fog : null,
    zones: arr<MapZone>(fs.zones).filter((z) => z && typeof z.id === 'string' && Array.isArray(z.points) && z.points.length >= 3),
    fogRects: arr<MapFogRect>(fs.rects)
      .filter((r) => r && typeof r.id === 'string' && [r.x, r.y, r.w, r.h].every(Number.isFinite))
      .map((r) => ({
        ...r,
        x: clamp(r.x > 1 ? r.x / 1100 : r.x, 0, 1),
        y: clamp(r.y > 1 ? r.y / 650 : r.y, 0, 1),
        w: clamp(r.w > 1 ? r.w / 1100 : r.w, 0, 1),
        h: clamp(r.h > 1 ? r.h / 650 : r.h, 0, 1),
      })),
    grid: {
      size: clamp(num(g.size, DEFAULT_GRID.size), 0.005, 0.5),
      ox: num(g.ox, 0),
      oy: num(g.oy, 0),
      unit: num(g.unit, DEFAULT_GRID.unit),
      show: Boolean(g.show),
      snap: Boolean(g.snap),
    },
    walls: arr<MapWall>(fs.walls).filter((w) => w && typeof w.id === 'string' && segOk(w)),
    lights: arr<MapLight>(fs.lights).filter((l) => l && typeof l.id === 'string' && [l.x, l.y, l.radius].every(Number.isFinite)),
    templates: arr<MapTemplate>(ts.templates).filter((t) => t && typeof t.id === 'string' && segOk(t)),
    vision: { dynamic: Boolean(fs.dynamic), dark: Boolean(fs.dark) },
  }
}

export const tokensStateOf = (s: Scene) => ({ tokens: s.tokens, grid: s.grid, templates: s.templates })
export const fogStateOf = (s: Scene) => ({
  fog: s.fog,
  rects: s.fog ? [] : s.fogRects,
  zones: s.zones,
  walls: s.walls,
  lights: s.lights,
  ...s.vision,
})
