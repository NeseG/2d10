// Brouillard en bitmap (voir docs/decisions/0005-brouillard-bitmap.md).
// Coordonnées normalisées 0..1 sur l'image ; 1 octet par pixel, 255 = brouillard.

import type { Pt } from './geometry'

/** Format stocké et échangé : deflate (zlib) en base64. */
export type FogBitmap = { w: number; h: number; data: string }
export type FogMask = { w: number; h: number; px: Uint8Array }
export type FogShape = 'rect' | 'poly' | 'brush'
/** `radius` du pinceau : fraction de la largeur de l'image. */
export type FogOp =
  | { shape: 'rect'; erase: boolean; x1: number; y1: number; x2: number; y2: number }
  | { shape: 'poly'; erase: boolean; points: Pt[] }
  | { shape: 'brush'; erase: boolean; points: Pt[]; radius: number }

const PX_PER_CELL = 8
const MAX_SIDE = 2048

/** Taille de bitmap : 8 px par case, plus grand côté plafonné. `aspect` = hauteur / largeur de l'image. */
export function fogSize(gridSize: number, aspect: number): { w: number; h: number } {
  let w = Math.round(Math.min(MAX_SIDE, Math.max(64, PX_PER_CELL / Math.max(gridSize, 1e-3))))
  let h = Math.round(w * aspect)
  if (h > MAX_SIDE) {
    w = Math.round((w * MAX_SIDE) / h)
    h = MAX_SIDE
  }
  return { w: Math.max(1, w), h: Math.max(1, h) }
}

export const emptyMask = (w: number, h: number): FogMask => ({ w, h, px: new Uint8Array(w * h) })

export function isFogBitmap(v: unknown): v is FogBitmap {
  const b = v as FogBitmap
  return Boolean(b) && Number.isInteger(b.w) && Number.isInteger(b.h) && b.w > 0 && b.h > 0 && typeof b.data === 'string'
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export async function encodeFog(m: FogMask): Promise<FogBitmap> {
  const z = await pipe(m.px, new CompressionStream('deflate'))
  let bin = ''
  for (let i = 0; i < z.length; i += 0x8000) bin += String.fromCharCode(...z.subarray(i, i + 0x8000))
  return { w: m.w, h: m.h, data: btoa(bin) }
}

export async function decodeFog(b: FogBitmap): Promise<FogMask> {
  const z = Uint8Array.from(atob(b.data), (c) => c.charCodeAt(0))
  const px = await pipe(z, new DecompressionStream('deflate'))
  if (px.length !== b.w * b.h) throw new Error('Brouillard corrompu')
  return { w: b.w, h: b.h, px }
}

/** Pixel sous un point normalisé : vrai si couvert. */
export const fogAt = (m: FogMask, p: Pt) =>
  m.px[Math.min(m.h - 1, Math.max(0, Math.floor(p.y * m.h))) * m.w + Math.min(m.w - 1, Math.max(0, Math.floor(p.x * m.w)))] > 127

function fillRect(m: FogMask, x1: number, y1: number, x2: number, y2: number, v: number) {
  const xa = Math.max(0, Math.round(Math.min(x1, x2) * m.w))
  const xb = Math.min(m.w, Math.round(Math.max(x1, x2) * m.w))
  const ya = Math.max(0, Math.round(Math.min(y1, y2) * m.h))
  const yb = Math.min(m.h, Math.round(Math.max(y1, y2) * m.h))
  for (let y = ya; y < yb; y++) m.px.fill(v, y * m.w + xa, y * m.w + xb)
}

/** Remplissage par balayage : un pixel est pris si son centre est dans le polygone (règle pair-impair). */
function fillPolygon(m: FogMask, pts: Pt[], v: number) {
  if (pts.length < 3) return
  const P = pts.map((p) => ({ x: p.x * m.w, y: p.y * m.h }))
  const ys = P.map((p) => p.y)
  const y0 = Math.max(0, Math.floor(Math.min(...ys)))
  const y1 = Math.min(m.h - 1, Math.ceil(Math.max(...ys)))
  const xs: number[] = []
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5
    xs.length = 0
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i]
      const b = P[j]
      if (a.y > yc !== b.y > yc) xs.push(a.x + ((yc - a.y) * (b.x - a.x)) / (b.y - a.y))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5))
      const xb = Math.min(m.w, Math.ceil(xs[k + 1] - 0.5))
      if (xb > xa) m.px.fill(v, y * m.w + xa, y * m.w + xb)
    }
  }
}

function stampDisc(m: FogMask, cx: number, cy: number, r: number, v: number) {
  const r2 = r * r
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(m.h - 1, Math.ceil(cy + r)); y++) {
    const dy = y + 0.5 - cy
    if (dy * dy > r2) continue
    const half = Math.sqrt(r2 - dy * dy)
    const xa = Math.max(0, Math.ceil(cx - half - 0.5))
    const xb = Math.min(m.w, Math.floor(cx + half - 0.5) + 1)
    if (xb > xa) m.px.fill(v, y * m.w + xa, y * m.w + xb)
  }
}

function brush(m: FogMask, pts: Pt[], radius: number, v: number) {
  const r = Math.max(0.5, radius * m.w)
  const step = Math.max(0.5, r / 2)
  let prev: { x: number; y: number } | null = null
  for (const p of pts) {
    const cur = { x: p.x * m.w, y: p.y * m.h }
    if (prev) {
      const n = Math.ceil(Math.hypot(cur.x - prev.x, cur.y - prev.y) / step)
      for (let i = 1; i <= n; i++) stampDisc(m, prev.x + ((cur.x - prev.x) * i) / n, prev.y + ((cur.y - prev.y) * i) / n, r, v)
    } else stampDisc(m, cur.x, cur.y, r, v)
    prev = cur
  }
}

/** Applique une opération sur le masque (en place). */
export function applyFogOp(m: FogMask, op: FogOp) {
  const v = op.erase ? 0 : 255
  if (op.shape === 'rect') fillRect(m, op.x1, op.y1, op.x2, op.y2, v)
  else if (op.shape === 'poly') fillPolygon(m, op.points, v)
  else brush(m, op.points, op.radius, v)
}

/** Anciennes cartes : rectangles de brouillard convertis en pixels. */
export function maskFromRects(w: number, h: number, rects: { x: number; y: number; w: number; h: number }[]): FogMask {
  const m = emptyMask(w, h)
  for (const r of rects) fillRect(m, r.x, r.y, r.x + r.w, r.y + r.h, 255)
  return m
}
