import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiBaseUrl } from '../../../shared/api/client'

export type MapToken = {
  id: string
  label?: string
  x: number // normalized 0..1 (relative to image)
  y: number // normalized 0..1 (relative to image)
  color?: string
  size?: number // normalized 0..1 (relative to image width)
}

export type MapFogRect = {
  id: string
  x: number // normalized 0..1 (relative to image)
  y: number // normalized 0..1 (relative to image)
  w: number // normalized 0..1
  h: number // normalized 0..1
}

type Rect = { x: number; y: number; w: number; h: number }

export type MapCanvasTool = 'move' | 'tokens' | 'fog_add' | 'fog_erase'

export type MapViewState = { scale: number; tx: number; ty: number }

export function MapCanvas(props: {
  token: string
  imageUrl: string
  canEdit: boolean
  width?: number
  height?: number
  tokens: MapToken[]
  fogRects: MapFogRect[]
  onTokensChange: (next: MapToken[]) => void
  onFogRectsChange: (next: MapFogRect[]) => void
  tool: MapCanvasTool
  onToolChange: (tool: MapCanvasTool) => void
  selectedTokenId: string | null
  onSelectedTokenIdChange: (id: string | null) => void
  viewState?: MapViewState
  onViewStateChange?: (next: MapViewState) => void
  onCommit?: () => void
}) {
  const {
    token,
    imageUrl,
    canEdit,
    width = 1100,
    height = 650,
    tokens,
    fogRects,
    onTokensChange,
    onFogRectsChange,
    tool,
    selectedTokenId,
    onSelectedTokenIdChange,
    viewState,
    onViewStateChange,
    onCommit,
  } = props

  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [imageNaturalSize, setImageNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [erasePreview, setErasePreview] = useState<Rect | null>(null)
  const [moveSelectedIds, setMoveSelectedIds] = useState<string[]>([])

  const vs: MapViewState = useMemo(() => {
    const s = viewState?.scale
    const tx = viewState?.tx
    const ty = viewState?.ty
    return {
      scale: typeof s === 'number' && Number.isFinite(s) ? s : 1,
      tx: typeof tx === 'number' && Number.isFinite(tx) ? tx : 0,
      ty: typeof ty === 'number' && Number.isFinite(ty) ? ty : 0,
    }
  }, [viewState?.scale, viewState?.tx, viewState?.ty])

  function zoomAtCenter(nextScale: number) {
    if (!onViewStateChange) return
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.width / 2
    const cy = rect.height / 2
    const prevScale = vs.scale
    const worldX = (cx - vs.tx) / prevScale
    const worldY = (cy - vs.ty) / prevScale
    const nextTx = cx - worldX * nextScale
    const nextTy = cy - worldY * nextScale
    onViewStateChange({ scale: nextScale, tx: nextTx, ty: nextTy })
  }

  const absoluteImageUrl = useMemo(() => {
    if (!imageUrl) return ''
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl
    return `${getApiBaseUrl()}${imageUrl}`
  }, [imageUrl])

  useEffect(() => {
    let revoked: string | null = null
    const controller = new AbortController()

    async function loadImage() {
      if (!absoluteImageUrl) {
        setImageObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        return
      }

      try {
        const res = await fetch(absoluteImageUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Erreur image (${res.status})`)
        const blob = await res.blob()
        const obj = URL.createObjectURL(blob)
        revoked = obj
        setImageObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return obj
        })
      } catch {
        if (controller.signal.aborted) return
        setImageObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
      }
    }

    void loadImage()
    return () => {
      controller.abort()
      setImageObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [absoluteImageUrl, token])

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
  }

  function uid(prefix: string) {
    try {
      return `${prefix}-${crypto.randomUUID()}`
    } catch {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    }
  }

  function rectsIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  function subtractRect(a: Rect, b: Rect): Rect[] {
    if (!rectsIntersect(a, b)) return [a]
    const ax1 = a.x
    const ay1 = a.y
    const ax2 = a.x + a.w
    const ay2 = a.y + a.h
    const bx1 = b.x
    const by1 = b.y
    const bx2 = b.x + b.w
    const by2 = b.y + b.h

    const ix1 = Math.max(ax1, bx1)
    const iy1 = Math.max(ay1, by1)
    const ix2 = Math.min(ax2, bx2)
    const iy2 = Math.min(ay2, by2)
    if (ix2 <= ix1 || iy2 <= iy1) return [a]

    const out: Rect[] = []
    if (iy1 > ay1) out.push({ x: ax1, y: ay1, w: a.w, h: iy1 - ay1 })
    if (iy2 < ay2) out.push({ x: ax1, y: iy2, w: a.w, h: ay2 - iy2 })
    if (ix1 > ax1) out.push({ x: ax1, y: iy1, w: ix1 - ax1, h: iy2 - iy1 })
    if (ix2 < ax2) out.push({ x: ix2, y: iy1, w: ax2 - ix2, h: iy2 - iy1 })
    return out.filter((r) => r.w >= 1e-6 && r.h >= 1e-6)
  }

  function getImageBox() {
    const surface = surfaceRef.current
    if (!surface) return null
    const s = surface.getBoundingClientRect()

    // Important: the map content is rendered inside a translated+scaled container (view state).
    // All coordinates we compute here are in the *untransformed* coordinate system (scale=1).
    // The view transform (scale/translate) is applied to the whole content wrapper so that
    // background + tokens + fog keep relative positions and scale together.
    const vw = s.width
    const vh = s.height

    if (imageNaturalSize && imageNaturalSize.w > 1 && imageNaturalSize.h > 1) {
      const scale = Math.min(vw / imageNaturalSize.w, vh / imageNaturalSize.h)
      const w = imageNaturalSize.w * scale
      const h = imageNaturalSize.h * scale
      const left = (vw - w) / 2
      const top = (vh - h) / 2
      return { left, top, w, h }
    }

    // Fallback when natural size is unknown: assume full viewport in untransformed coordinates.
    return { left: 0, top: 0, w: vw, h: vh }
  }

  function getLocalPointOnImage(e: React.PointerEvent) {
    const surface = surfaceRef.current
    const box = getImageBox()
    if (!surface || !box || box.w <= 1 || box.h <= 1) return null
    const s = surface.getBoundingClientRect()
    const x = (e.clientX - s.left - vs.tx) / vs.scale - box.left
    const y = (e.clientY - s.top - vs.ty) / vs.scale - box.top
    return { x, y, w: box.w, h: box.h }
  }

  function toPxX(nx: number) {
    const box = getImageBox()
    if (!box) return 0
    return box.left + nx * box.w
  }
  function toPxY(ny: number) {
    const box = getImageBox()
    if (!box) return 0
    return box.top + ny * box.h
  }
  function toPxW(nw: number) {
    const box = getImageBox()
    if (!box) return 0
    return nw * box.w
  }
  function toPxH(nh: number) {
    const box = getImageBox()
    if (!box) return 0
    return nh * box.h
  }

  function tokenSizePx(t: MapToken): number {
    const box = getImageBox()
    if (!box) return 36
    const normalized = typeof t.size === 'number' && Number.isFinite(t.size) ? t.size : 36 / 1100
    const px = normalized * box.w
    return clamp(px, 10, 120)
  }

  const dragRef = useRef<
    | null
    | {
        kind: 'token'
        ids: string[]
        anchorId: string
        dx: number
        dy: number
        start: Record<string, { x: number; y: number }>
      }
    | {
        kind: 'pan'
        startClientX: number
        startClientY: number
        startTx: number
        startTy: number
      }
    | { kind: 'fog_add'; id: string; startX: number; startY: number }
    | { kind: 'fog_erase'; startX: number; startY: number }
  >(null)

  function canStartPan(e: React.PointerEvent): boolean {
    if (!canEdit) return false
    if (!onViewStateChange) return false
    // Middle click, right click, or Alt+Left
    if (e.button === 1 || e.button === 2) return true
    if (e.button === 0 && e.altKey) return true
    return false
  }

  function startPan(e: React.PointerEvent) {
    if (!canStartPan(e)) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      kind: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTx: vs.tx,
      startTy: vs.ty,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function startDragToken(e: React.PointerEvent, id: string) {
    if (!canEdit) return
    if (tool !== 'tokens' && tool !== 'move') return
    if (e.button !== 0) return
    e.stopPropagation()

    let ids = [id]
    if (tool === 'tokens') {
      onSelectedTokenIdChange(id)
    } else {
      const has = moveSelectedIds.includes(id)
      ids = e.shiftKey ? (has ? moveSelectedIds.filter((x) => x !== id) : [...moveSelectedIds, id]) : has ? moveSelectedIds : [id]
      if (ids.length === 0) ids = [id]
      setMoveSelectedIds(ids)
    }
    const p = getLocalPointOnImage(e)
    if (!p) return
    const anchor = tokens.find((x) => x.id === id)
    if (!anchor) return
    const start: Record<string, { x: number; y: number }> = {}
    for (const tid of ids) {
      const t = tokens.find((x) => x.id === tid)
      if (t) start[tid] = { x: t.x, y: t.y }
    }
    dragRef.current = { kind: 'token', ids, anchorId: id, dx: p.x - anchor.x * p.w, dy: p.y - anchor.y * p.h, start }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function moveDragToken(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || d.kind !== 'token') return
    const p = getLocalPointOnImage(e)
    if (!p) return
    const xPx = clamp(p.x - d.dx, 0, p.w)
    const yPx = clamp(p.y - d.dy, 0, p.h)
    const anchorX = xPx / p.w
    const anchorY = yPx / p.h

    const anchorStart = d.start[d.anchorId]
    const dxN = anchorStart ? anchorX - anchorStart.x : 0
    const dyN = anchorStart ? anchorY - anchorStart.y : 0

    onTokensChange(
      tokens.map((t) => {
        if (!d.ids.includes(t.id)) return t
        const s = d.start[t.id]
        if (!s) return t
        return { ...t, x: clamp(s.x + dxN, 0, 1), y: clamp(s.y + dyN, 0, 1) }
      }),
    )
  }

  function endDragToken(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || d.kind !== 'token') return
    dragRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function onSurfacePointerDown(e: React.PointerEvent) {
    if (!canEdit) return
    if (canStartPan(e)) {
      startPan(e)
      return
    }
    if (tool !== 'fog_add' && tool !== 'fog_erase') return
    if (e.button !== 0) return
    const p = getLocalPointOnImage(e)
    if (!p) return

    if (tool === 'fog_add') {
      const id = uid('fog')
      dragRef.current = { kind: 'fog_add', id, startX: p.x, startY: p.y }
      onFogRectsChange([...fogRects, { id, x: p.x / p.w, y: p.y / p.h, w: 0, h: 0 }])
    } else {
      dragRef.current = { kind: 'fog_erase', startX: p.x, startY: p.y }
      setErasePreview({ x: p.x, y: p.y, w: 0, h: 0 })
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onSurfacePointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    if (d.kind === 'pan') {
      if (!onViewStateChange) return
      const dx = e.clientX - d.startClientX
      const dy = e.clientY - d.startClientY
      onViewStateChange({ scale: vs.scale, tx: d.startTx + dx, ty: d.startTy + dy })
      return
    }
    const p = getLocalPointOnImage(e)
    if (!p) return

    if (d.kind === 'fog_add') {
      const x2 = clamp(p.x, 0, p.w)
      const y2 = clamp(p.y, 0, p.h)
      const x = Math.min(d.startX, x2)
      const y = Math.min(d.startY, y2)
      const w = Math.abs(x2 - d.startX)
      const h = Math.abs(y2 - d.startY)
      onFogRectsChange(
        fogRects.map((r) => (r.id === d.id ? { ...r, x: x / p.w, y: y / p.h, w: w / p.w, h: h / p.h } : r)),
      )
      return
    }

    if (d.kind === 'fog_erase') {
      const x2 = clamp(p.x, 0, p.w)
      const y2 = clamp(p.y, 0, p.h)
      const x = Math.min(d.startX, x2)
      const y = Math.min(d.startY, y2)
      const w = Math.abs(x2 - d.startX)
      const h = Math.abs(y2 - d.startY)
      setErasePreview({ x, y, w, h })
      return
    }

    if (d.kind === 'token') moveDragToken(e)
  }

  function onSurfacePointerUp(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null

    if (d.kind === 'fog_add') {
      onFogRectsChange(fogRects.filter((r) => !(r.id === d.id && (r.w < 0.01 || r.h < 0.01))))
    }

    if (d.kind === 'fog_erase') {
      const er = erasePreview
      setErasePreview(null)
      const box = getImageBox()
      const norm = box && er ? { x: er.x / box.w, y: er.y / box.h, w: er.w / box.w, h: er.h / box.h } : null
      if (norm && norm.w >= 0.01 && norm.h >= 0.01) {
        const next: MapFogRect[] = []
        for (const r of fogRects) {
          const parts = subtractRect(r, norm)
          for (const p of parts) {
            next.push({ id: uid('fog'), x: p.x, y: p.y, w: p.w, h: p.h })
          }
        }
        onFogRectsChange(next)
      }
    }

    if (d.kind === 'token') endDragToken(e)

    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }

    if (canEdit && onCommit) onCommit()
  }

  return (
    <div
      ref={surfaceRef}
      onPointerDown={onSurfacePointerDown}
      onPointerMove={onSurfacePointerMove}
      onPointerUp={onSurfacePointerUp}
      onContextMenu={(e) => {
        // Allow right-drag pan without browser menu
        if (canEdit && onViewStateChange) e.preventDefault()
      }}
      onClick={() => {
        if (!canEdit) return
        if (tool === 'tokens') onSelectedTokenIdChange(null)
        if (tool === 'move') setMoveSelectedIds([])
      }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: width,
        height,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        background: '#111',
        touchAction: canEdit ? 'none' : 'auto',
        userSelect: 'none',
      }}
    >
      {canEdit && onViewStateChange ? (
        <div style={{ position: 'absolute', right: 10, top: 10, zIndex: 5, display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={(e) => {
              e.stopPropagation()
              zoomAtCenter(clamp(vs.scale / 1.2, 0.5, 3))
            }}
            aria-label="Dézoomer"
            title="Dézoomer"
          >
            −
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={(e) => {
              e.stopPropagation()
              zoomAtCenter(clamp(vs.scale * 1.2, 0.5, 3))
            }}
            aria-label="Zoomer"
            title="Zoomer"
          >
            +
          </button>
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${vs.tx}px, ${vs.ty}px) scale(${vs.scale})`,
          transformOrigin: 'top left',
        }}
      >
        {imageObjectUrl ? (
          <img
            ref={imageRef}
            src={imageObjectUrl}
            alt=""
            onLoad={(e) => {
              const el = e.currentTarget
              if (el.naturalWidth > 1 && el.naturalHeight > 1) {
                setImageNaturalSize({ w: el.naturalWidth, h: el.naturalHeight })
              }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        ) : null}

      {/* Tokens (sous le fog) */}
      {tokens.map((t) => (
        (() => {
          const s = tokenSizePx(t)
          return (
        <div
          key={t.id}
          onPointerDown={(e) => startDragToken(e, t.id)}
          onClick={(e) => e.stopPropagation()}
          title={canEdit ? 'Drag pour déplacer.' : undefined}
          style={{
            position: 'absolute',
            left: toPxX(t.x),
            top: toPxY(t.y),
            width: s,
            height: s,
            borderRadius: 999,
            background: t.color ?? '#7c3aed',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 700,
            cursor: canEdit && (tool === 'tokens' || tool === 'move') ? 'grab' : 'default',
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            outline:
              canEdit && tool === 'tokens' && selectedTokenId === t.id
                ? '2px solid rgba(255,255,255,0.9)'
                : canEdit && tool === 'move' && moveSelectedIds.includes(t.id)
                  ? '2px solid rgba(255,255,255,0.75)'
                  : undefined,
          }}
        >
          {(t.label ?? 'T').slice(0, 2).toUpperCase()}
        </div>
          )
        })()
      ))}

      {/* Fog */}
      {fogRects.map((r) => (
        <div
          key={r.id}
          style={{
            position: 'absolute',
            left: toPxX(r.x),
            top: toPxY(r.y),
            width: toPxW(r.w),
            height: toPxH(r.h),
            // Non-propriétaires (lecture seule) : fog 100% opaque
            background: canEdit ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,1)',
            outline: canEdit ? '1px solid rgba(255,255,255,0.15)' : undefined,
            // Tokens sont sous le fog visuellement ; en déplacement / édition token,
            // ignorer le hit-test du fog pour pouvoir saisir les jetons.
            pointerEvents:
              canEdit && (tool === 'tokens' || tool === 'move') ? 'none' : 'auto',
          }}
        />
      ))}

      {/* Erase preview */}
      {erasePreview ? (
        <div
          style={{
            position: 'absolute',
            left: getImageBox()?.left ? (getImageBox()!.left + erasePreview.x) : 0,
            top: getImageBox()?.top ? (getImageBox()!.top + erasePreview.y) : 0,
            width: erasePreview.w,
            height: erasePreview.h,
            background: 'rgba(255, 0, 0, 0.12)',
            outline: '1px dashed rgba(255, 120, 120, 0.9)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      </div>
    </div>
  )
}

