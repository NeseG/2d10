import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { getApiBaseUrl } from '../../../shared/api/client'
import { DEFAULT_GRID, gridDistance, pointInPolygon, snapTo, visibilityPolygon, type Pt, type Seg } from '../geometry'
import type { FogMask, FogOp, FogShape } from '../fog'

export type MapToken = {
  id: string
  label?: string
  x: number // normalized 0..1 (relative to image), coin haut-gauche
  y: number // normalized 0..1 (relative to image)
  color?: string
  size?: number // normalized 0..1 (relative to image width)
  hidden?: boolean // calque MJ : jamais envoyé aux joueurs
  characterId?: number | null // personnage lié : son joueur peut déplacer le jeton, et il sert de source de vision
  darkvision?: number // en cases
  light?: number // lumière portée, en cases
}

export type MapFogRect = {
  id: string
  x: number // normalized 0..1 (relative to image)
  y: number // normalized 0..1 (relative to image)
  w: number // normalized 0..1
  h: number // normalized 0..1
}

/** `size` : largeur d'une case / largeur de l'image. `ox`/`oy` : décalage en fraction de case. `unit` : mètres par case. */
export type MapGrid = { size: number; ox: number; oy: number; unit: number; show: boolean; snap: boolean }

/** `window` : repère visuel pour le MJ, sans effet sur la vision. */
export type MapWall = { id: string; x1: number; y1: number; x2: number; y2: number; door?: boolean; open?: boolean; window?: boolean }
/** Zone nommée préparée dans l'éditeur, révélable d'un clic en session. Points normalisés. */
export type MapZone = { id: string; name: string; points: Pt[] }
export type MapLight = { id: string; x: number; y: number; radius: number } // radius en cases
export type MapTemplateShape = 'circle' | 'cone' | 'line' | 'cube'
export type MapTemplate = { id: string; shape: MapTemplateShape; x1: number; y1: number; x2: number; y2: number }
/** `dynamic` : les murs bloquent la vue des joueurs. `dark` : seules les lumières et la vision dans le noir éclairent. */
export type MapVision = { dynamic: boolean; dark: boolean }
export type MapPing = { id: string; x: number; y: number }
/** État de combat affiché sur un jeton (vient du tracker d'initiative). */
export type MapTokenStatus = { hp?: number | null; maxHp?: number | null; conditions?: string | null; active?: boolean }

export type MapCanvasTool =
  | 'move'
  | 'tokens'
  | 'fog_add'
  | 'fog_erase'
  | 'ruler'
  | 'ping'
  | 'template'
  | 'wall'
  | 'door'
  | 'window'
  | 'zone'
  | 'light'

/** `tx`/`ty` : décalage en fraction de la largeur de la carte, pour que MJ et joueurs aient le même cadrage quelle que soit la taille d'écran. */
export type MapViewState = { scale: number; tx: number; ty: number }

function TemplateShape(props: {
  shape: MapTemplateShape
  x1: number
  y1: number
  x2: number
  y2: number
  cell: number
  unit: number
  onDoubleClick?: (e: React.MouseEvent) => void
}) {
  const { shape, x1, y1, x2, y2, cell, unit, onDoubleClick } = props
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return null
  // Normale unitaire à la direction du gabarit
  const nx = -dy / len
  const ny = dx / len
  const common = {
    fill: 'rgba(239, 68, 68, 0.25)',
    stroke: 'rgba(239, 68, 68, 0.9)',
    strokeWidth: 1.5,
    onDoubleClick,
    style: { pointerEvents: onDoubleClick ? ('auto' as const) : ('none' as const) },
  }
  const pts = (list: [number, number][]) => list.map((p) => p.join(',')).join(' ')
  const side = Math.max(Math.abs(dx), Math.abs(dy))
  const meters = cell > 0 ? +(((shape === 'cube' ? side : len) / cell) * unit).toFixed(1) : null
  return (
    <g>
      {shape === 'circle' ? <circle cx={x1} cy={y1} r={len} {...common} /> : null}
      {shape === 'cone' ? (
        // Cône 5e : aussi large à son extrémité que long
        <polygon
          points={pts([
            [x1, y1],
            [x2 + (nx * len) / 2, y2 + (ny * len) / 2],
            [x2 - (nx * len) / 2, y2 - (ny * len) / 2],
          ])}
          {...common}
        />
      ) : null}
      {shape === 'line' ? (
        <polygon
          points={pts([
            [x1 + (nx * cell) / 2, y1 + (ny * cell) / 2],
            [x2 + (nx * cell) / 2, y2 + (ny * cell) / 2],
            [x2 - (nx * cell) / 2, y2 - (ny * cell) / 2],
            [x1 - (nx * cell) / 2, y1 - (ny * cell) / 2],
          ])}
          {...common}
        />
      ) : null}
      {shape === 'cube' ? (
        <rect x={dx < 0 ? x1 - side : x1} y={dy < 0 ? y1 - side : y1} width={side} height={side} {...common} />
      ) : null}
      {meters !== null ? (
        <text x={x2} y={y2 - 6} fill="#fff" fontSize={12} fontWeight={700} textAnchor="middle" stroke="#000" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
          {meters} m
        </text>
      ) : null}
    </g>
  )
}

export function MapCanvas(props: {
  token: string
  imageUrl: string
  canEdit: boolean
  width?: number
  height?: number
  tokens: MapToken[]
  onTokensChange: (next: MapToken[]) => void
  fogMask?: FogMask | null
  onFogOp?: (op: FogOp) => void
  fogShape?: FogShape
  /** Diamètre du pinceau, en cases. */
  fogBrush?: number
  /** Dimensions naturelles de l'image, dès qu'elle est chargée. */
  onImageSize?: (w: number, h: number) => void
  zones?: MapZone[]
  onZonesChange?: (next: MapZone[]) => void
  tool: MapCanvasTool
  selectedTokenId: string | null
  onSelectedTokenIdChange: (id: string | null) => void
  viewState?: MapViewState
  onViewStateChange?: (next: MapViewState) => void
  grid?: MapGrid
  walls?: MapWall[]
  onWallsChange?: (next: MapWall[]) => void
  lights?: MapLight[]
  onLightsChange?: (next: MapLight[]) => void
  lightRadius?: number
  templates?: MapTemplate[]
  onTemplatesChange?: (next: MapTemplate[]) => void
  templateShape?: MapTemplateShape
  vision?: MapVision
  /** Zones déjà explorées par le groupe : assombries au lieu de noires. */
  exploredMask?: FogMask | null
  /** Vision partagée : chaque joueur voit par tous les PJ, pas seulement les siens. */
  sharedVision?: boolean
  /** Personnages du joueur connecté : il peut déplacer leurs jetons et voit à travers eux. */
  myCharacterIds?: number[]
  onPlayerTokenMove?: (id: string, x: number, y: number) => void
  tokenStatus?: Record<string, MapTokenStatus>
  pings?: MapPing[]
  onPing?: (x: number, y: number) => void
}) {
  const {
    token,
    imageUrl,
    canEdit,
    width = 1100,
    height = 650,
    tokens,
    onTokensChange,
    fogMask = null,
    onFogOp,
    fogShape = 'rect',
    fogBrush = 1,
    onImageSize,
    zones = [],
    onZonesChange,
    tool,
    selectedTokenId,
    onSelectedTokenIdChange,
    viewState,
    onViewStateChange,
    grid = DEFAULT_GRID,
    walls = [],
    onWallsChange,
    lights = [],
    onLightsChange,
    lightRadius = 8,
    templates = [],
    onTemplatesChange,
    templateShape = 'circle',
    vision = { dynamic: false, dark: false },
    myCharacterIds = [],
    exploredMask = null,
    sharedVision = false,
    onPlayerTokenMove,
    tokenStatus = {},
    pings = [],
    onPing,
  } = props

  const svgId = useId().replace(/:/g, '')
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  // `src` : taille valable seulement pour l'image affichée (évite le ratio de la carte précédente)
  const [imageNaturalSize, setImageNaturalSize] = useState<{ src: string; w: number; h: number } | null>(null)
  const naturalSize = imageNaturalSize && imageNaturalSize.src === imageObjectUrl ? imageNaturalSize : null
  // Plein écran : API du navigateur si elle existe, sinon (iPhone) calque fixe sur toute la fenêtre
  const fullRef = useRef<HTMLDivElement | null>(null)
  const [full, setFull] = useState(false)
  useEffect(() => {
    if (!full) return
    const onChange = () => !document.fullscreenElement && setFull(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false)
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('keydown', onKey)
    }
  }, [full])
  function toggleFull() {
    if (full) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
      setFull(false)
      return
    }
    setFull(true)
    fullRef.current?.requestFullscreen?.().catch(() => {})
  }
  // Taille de la carte à l'écran, suivie pour redessiner au redimensionnement (rotation mobile, fenêtre)
  const [surfaceSize, setSurfaceSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSurfaceSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Brouillard en cours de tracé (pixels image) : rectangle, trait de pinceau, ou polygone (aussi pour les zones)
  const [fogDraft, setFogDraft] = useState<{ kind: 'rect'; x1: number; y1: number; x2: number; y2: number } | { kind: 'brush'; points: Pt[] } | null>(null)
  const [polyDraft, setPolyDraft] = useState<Pt[]>([])
  const [moveSelectedIds, setMoveSelectedIds] = useState<string[]>([])
  // Tracé en cours (règle, gabarit, mur), en pixels relatifs à l'image
  const [draft, setDraft] = useState<{ kind: 'ruler' | 'template' | 'wall'; x1: number; y1: number; x2: number; y2: number } | null>(null)

  const sw = surfaceSize?.w ?? 0
  // Vue en pixels de cet écran
  const vs: MapViewState = useMemo(() => {
    const s = viewState?.scale
    const tx = viewState?.tx
    const ty = viewState?.ty
    return {
      scale: typeof s === 'number' && Number.isFinite(s) ? s : 1,
      tx: typeof tx === 'number' && Number.isFinite(tx) ? tx * sw : 0,
      ty: typeof ty === 'number' && Number.isFinite(ty) ? ty * sw : 0,
    }
  }, [viewState?.scale, viewState?.tx, viewState?.ty, sw])
  /** Vue en pixels → fraction de largeur pour l'envoi. */
  const emitView = (next: MapViewState) =>
    sw > 0 && onViewStateChange?.({ scale: next.scale, tx: next.tx / sw, ty: next.ty / sw })

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
    emitView({ scale: nextScale, tx: nextTx, ty: nextTy })
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

  /** La surface a le ratio de l'image : la carte la remplit. Rien n'est dessiné avant de connaître ce ratio, sinon gabarits et vision seraient faux. */
  function getImageBox() {
    if (!surfaceSize || !naturalSize || surfaceSize.w <= 1 || surfaceSize.h <= 1) return null
    return { left: 0, top: 0, w: surfaceSize.w, h: surfaceSize.h }
  }

  function getLocalPointOnImage(e: { clientX: number; clientY: number }) {
    const surface = surfaceRef.current
    const box = getImageBox()
    if (!surface || !box || box.w <= 1 || box.h <= 1) return null
    const s = surface.getBoundingClientRect()
    const x = (e.clientX - s.left - vs.tx) / vs.scale - box.left
    const y = (e.clientY - s.top - vs.ty) / vs.scale - box.top
    return { x, y, w: box.w, h: box.h }
  }

  /** Aimante un point (pixels image) sur les intersections de la grille. Maj maintenue = pas d'aimant. */
  function snapPoint(x: number, y: number, imageW: number, e: { shiftKey: boolean }): Pt {
    if (!grid.snap || e.shiftKey) return { x, y }
    const c = grid.size * imageW
    return { x: snapTo(x, grid.ox * c, c), y: snapTo(y, grid.oy * c, c) }
  }

  function tokenSizePx(t: MapToken, boxW: number): number {
    const normalized = typeof t.size === 'number' && Number.isFinite(t.size) ? t.size : 36 / 1100
    return clamp(normalized * boxW, 10, 400)
  }

  const isMine = (t: MapToken) => t.characterId != null && myCharacterIds.includes(t.characterId)
  const canMoveToken = (t: MapToken) => (canEdit ? tool === 'tokens' || tool === 'move' : tool === 'move' && isMine(t))

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
    | { kind: 'fog' }
    | { kind: 'draft' }
  >(null)

  function canStartPan(e: React.PointerEvent): boolean {
    if (!onViewStateChange) return false
    // Joueur : glisser sur le fond avec l'outil Déplacer (seul geste possible au doigt)
    if (!canEdit && tool === 'move' && e.button === 0) return true
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

  function startDragToken(e: React.PointerEvent, t: MapToken) {
    if (!canMoveToken(t)) return
    if (e.button !== 0) return
    e.stopPropagation()
    const id = t.id

    let ids = [id]
    if (!canEdit) {
      // joueur : un seul jeton à la fois
    } else if (tool === 'tokens') {
      onSelectedTokenIdChange(id)
    } else {
      const has = moveSelectedIds.includes(id)
      ids = e.shiftKey ? (has ? moveSelectedIds.filter((x) => x !== id) : [...moveSelectedIds, id]) : has ? moveSelectedIds : [id]
      if (ids.length === 0) ids = [id]
      setMoveSelectedIds(ids)
    }
    const p = getLocalPointOnImage(e)
    if (!p) return
    const start: Record<string, { x: number; y: number }> = {}
    for (const tid of ids) {
      const tk = tokens.find((x) => x.id === tid)
      if (tk) start[tid] = { x: tk.x, y: tk.y }
    }
    dragRef.current = { kind: 'token', ids, anchorId: id, dx: p.x - t.x * p.w, dy: p.y - t.y * p.h, start }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function moveDragToken(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || d.kind !== 'token') return
    const p = getLocalPointOnImage(e)
    if (!p) return
    const snapped = snapPoint(clamp(p.x - d.dx, 0, p.w), clamp(p.y - d.dy, 0, p.h), p.w, e)
    const anchorX = snapped.x / p.w
    const anchorY = snapped.y / p.h

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

  function finishPoly(points: Pt[], box: { w: number; h: number }) {
    setPolyDraft([])
    if (points.length < 3) return
    const norm = points.map((q) => ({ x: q.x / box.w, y: q.y / box.h }))
    if (tool === 'zone') {
      const name = window.prompt('Nom de la zone', `Zone ${zones.length + 1}`)?.trim()
      if (name) onZonesChange?.([...zones, { id: uid('zone'), name, points: norm }])
    } else onFogOp?.({ shape: 'poly', erase: tool === 'fog_erase', points: norm })
  }

  // Changer d'outil abandonne le polygone en cours ; Échap aussi.
  useEffect(() => setPolyDraft([]), [tool, fogShape])
  useEffect(() => {
    if (!polyDraft.length) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPolyDraft([])
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [polyDraft.length])

  function onSurfacePointerDown(e: React.PointerEvent) {
    if (canStartPan(e)) {
      startPan(e)
      return
    }
    if (e.button !== 0) return
    const p = getLocalPointOnImage(e)
    if (!p) return

    // Outils ouverts à tous
    if (tool === 'ping') {
      if (p.x >= 0 && p.x <= p.w && p.y >= 0 && p.y <= p.h) onPing?.(p.x / p.w, p.y / p.h)
      return
    }
    if (tool === 'ruler') {
      dragRef.current = { kind: 'draft' }
      setDraft({ kind: 'ruler', x1: p.x, y1: p.y, x2: p.x, y2: p.y })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    if (!canEdit) return

    if (tool === 'light') {
      onLightsChange?.([...lights, { id: uid('light'), x: clamp(p.x / p.w, 0, 1), y: clamp(p.y / p.h, 0, 1), radius: lightRadius }])
      return
    }
    const isFogTool = tool === 'fog_add' || tool === 'fog_erase'
    if (tool === 'zone' || (isFogTool && fogShape === 'poly')) {
      // Polygone : un clic par sommet ; clic sur le premier sommet ou double-clic pour fermer, Échap pour annuler.
      const s = snapPoint(clamp(p.x, 0, p.w), clamp(p.y, 0, p.h), p.w, e)
      const first = polyDraft[0]
      if (first && polyDraft.length >= 3 && Math.hypot(s.x - first.x, s.y - first.y) < 10) finishPoly(polyDraft, p)
      else setPolyDraft([...polyDraft, s])
      return
    }
    if (tool === 'template' || tool === 'wall' || tool === 'door' || tool === 'window') {
      const s = snapPoint(clamp(p.x, 0, p.w), clamp(p.y, 0, p.h), p.w, e)
      dragRef.current = { kind: 'draft' }
      setDraft({ kind: tool === 'template' ? 'template' : 'wall', x1: s.x, y1: s.y, x2: s.x, y2: s.y })
    } else if (isFogTool) {
      dragRef.current = { kind: 'fog' }
      if (fogShape === 'brush') setFogDraft({ kind: 'brush', points: [{ x: p.x, y: p.y }] })
      else {
        const s = snapPoint(clamp(p.x, 0, p.w), clamp(p.y, 0, p.h), p.w, e)
        setFogDraft({ kind: 'rect', x1: s.x, y1: s.y, x2: s.x, y2: s.y })
      }
    } else {
      return
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
      emitView({ scale: vs.scale, tx: d.startTx + dx, ty: d.startTy + dy })
      return
    }
    const p = getLocalPointOnImage(e)
    if (!p) return

    if (d.kind === 'draft') {
      setDraft((prev) => {
        if (!prev) return prev
        const s = prev.kind === 'ruler' ? { x: p.x, y: p.y } : snapPoint(clamp(p.x, 0, p.w), clamp(p.y, 0, p.h), p.w, e)
        return { ...prev, x2: s.x, y2: s.y }
      })
      return
    }

    if (d.kind === 'fog') {
      setFogDraft((prev) => {
        if (prev?.kind === 'brush') return { kind: 'brush', points: [...prev.points, { x: p.x, y: p.y }] }
        if (prev?.kind === 'rect') {
          const s = snapPoint(clamp(p.x, 0, p.w), clamp(p.y, 0, p.h), p.w, e)
          return { ...prev, x2: s.x, y2: s.y }
        }
        return prev
      })
      return
    }

    if (d.kind === 'token') moveDragToken(e)
  }

  function onSurfacePointerUp(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    const box = getImageBox()

    if (d.kind === 'draft') {
      const dr = draft
      setDraft(null)
      if (dr && box && dr.kind !== 'ruler' && Math.hypot(dr.x2 - dr.x1, dr.y2 - dr.y1) > 4) {
        const norm = { x1: dr.x1 / box.w, y1: dr.y1 / box.h, x2: dr.x2 / box.w, y2: dr.y2 / box.h }
        if (dr.kind === 'template') onTemplatesChange?.([...templates, { id: uid('tpl'), shape: templateShape, ...norm }])
        else
          onWallsChange?.([
            ...walls,
            { id: uid('wall'), ...norm, ...(tool === 'door' ? { door: true, open: false } : tool === 'window' ? { window: true } : {}) },
          ])
      }
    }

    if (d.kind === 'fog') {
      const fd = fogDraft
      setFogDraft(null)
      const erase = tool === 'fog_erase'
      if (fd && box && fd.kind === 'rect' && Math.abs(fd.x2 - fd.x1) > 2 && Math.abs(fd.y2 - fd.y1) > 2) {
        onFogOp?.({ shape: 'rect', erase, x1: fd.x1 / box.w, y1: fd.y1 / box.h, x2: fd.x2 / box.w, y2: fd.y2 / box.h })
      }
      if (fd && box && fd.kind === 'brush') {
        onFogOp?.({ shape: 'brush', erase, radius: (fogBrush * grid.size) / 2, points: fd.points.map((q) => ({ x: q.x / box.w, y: q.y / box.h })) })
      }
    }

    // Joueur : la position finale part au serveur (le MJ, lui, synchronise tout l'état).
    if (d.kind === 'token' && !canEdit) {
      const t = tokens.find((x) => x.id === d.anchorId)
      if (t) onPlayerTokenMove?.(t.id, t.x, t.y)
    }

    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  // ——— Rendu : tout ce qui suit est en pixels relatifs à l'image (avant zoom/pan) ———
  const box = getImageBox()
  const cell = box ? grid.size * box.w : 0
  const tokenCenter = (t: MapToken, b: { w: number; h: number }): Pt => {
    const s = tokenSizePx(t, b.w)
    return { x: t.x * b.w + s / 2, y: t.y * b.h + s / 2 }
  }

  // Vision : chaque jeton de PJ voit ce qu'aucun mur (ou porte fermée) ne lui cache.
  let sources: { c: Pt; poly: Pt[]; dv: number }[] = []
  let lit: { c: Pt; r: number; poly: Pt[] }[] = []
  if (box && vision.dynamic) {
    const segs: Seg[] = walls
      .filter((w) => !w.window && !(w.door && w.open))
      .map((w) => ({ x1: w.x1 * box.w, y1: w.y1 * box.h, x2: w.x2 * box.w, y2: w.y2 * box.h }))
    const pcs = tokens.filter((t) => t.characterId != null && !t.hidden)
    const mine = pcs.filter(isMine)
    // Le MJ et les spectateurs voient l'aperçu de tout le groupe.
    const viewers = !canEdit && mine.length && !sharedVision ? mine : pcs
    sources = viewers.map((t) => {
      const c = tokenCenter(t, box)
      return { c, poly: visibilityPolygon(c, segs, box.w, box.h), dv: (t.darkvision ?? 0) * cell }
    })
    if (vision.dark) {
      lit = [
        ...lights.map((l) => ({ c: { x: l.x * box.w, y: l.y * box.h }, r: l.radius * cell })),
        ...tokens.filter((t) => !t.hidden && (t.light ?? 0) > 0).map((t) => ({ c: tokenCenter(t, box), r: (t.light ?? 0) * cell })),
      ].map((l) => ({ ...l, poly: visibilityPolygon(l.c, segs, box.w, box.h) }))
    }
  }
  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
  const pointVisible = (p: Pt) =>
    sources.some(
      (s) =>
        pointInPolygon(p, s.poly) &&
        (!vision.dark || dist(p, s.c) <= s.dv || lit.some((l) => dist(p, l.c) <= l.r && pointInPolygon(p, l.poly))),
    )
  // Joueur : le serveur n'envoie déjà que les jetons visibles (back/lib/map-visibility.js) ; ce filtre garde l'affichage juste entre deux envois.
  const tokenShown = (t: MapToken) =>
    canEdit || !vision.dynamic || t.characterId != null || (box ? pointVisible(tokenCenter(t, box)) : false)
  const exploredUrl = useMemo(() => exploredDataUrl(vision.dynamic ? exploredMask : null), [exploredMask, vision.dynamic])
  const polyPoints = (poly: Pt[]) => poly.map((p) => `${p.x},${p.y}`).join(' ')
  const editingWalls = canEdit && (tool === 'wall' || tool === 'door' || tool === 'window')

  const ratio = naturalSize ? naturalSize.w / naturalSize.h : width / height
  return (
    <div
      ref={fullRef}
      style={
        full
          ? { position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }
          : undefined
      }
    >
    <div
      ref={surfaceRef}
      onPointerDown={onSurfacePointerDown}
      onPointerMove={onSurfacePointerMove}
      onPointerUp={onSurfacePointerUp}
      onContextMenu={(e) => {
        // Allow right-drag pan without browser menu
        if (onViewStateChange) e.preventDefault()
      }}
      onClick={() => {
        if (!canEdit) return
        if (tool === 'tokens') onSelectedTokenIdChange(null)
        if (tool === 'move') setMoveSelectedIds([])
      }}
      onDoubleClick={(e) => {
        if (polyDraft.length) {
          const b = getImageBox()
          // Le double-clic a déjà posé deux sommets au même endroit : on retire le doublon.
          if (b) finishPoly(polyDraft.slice(0, -1), b)
          return
        }
        // Raccourci : double-clic = ping (hors outils de tracé, où il sert à supprimer)
        if (tool !== 'move' && tool !== 'tokens' && tool !== 'ruler') return
        const p = getLocalPointOnImage(e)
        if (p && p.x >= 0 && p.x <= p.w && p.y >= 0 && p.y <= p.h) onPing?.(p.x / p.w, p.y / p.h)
      }}
      style={{
        position: 'relative',
        // Ratio de l'image, bornée en largeur et en hauteur d'écran : même cadrage pour tous, à l'échelle près
        width: full ? `min(100vw, calc(100dvh * ${ratio}))` : `min(100%, ${width}px, calc(75vh * ${ratio}))`,
        aspectRatio: String(ratio),
        borderRadius: full ? 0 : 12,
        overflow: 'hidden',
        // Contour sans bordure : une bordure fausserait le ratio de la surface
        outline: '1px solid rgba(255,255,255,0.12)',
        background: '#111',
        touchAction: 'none',
        userSelect: 'none',
        cursor:
          tool === 'ruler' || tool === 'ping' || tool === 'template' || editingWalls || tool === 'light' || tool === 'zone' || tool === 'fog_add' || tool === 'fog_erase'
            ? 'crosshair'
            : undefined,
      }}
    >
      <div style={{ position: 'absolute', right: 10, top: 10, zIndex: 5, display: 'flex', gap: 6 }}>
        {onViewStateChange ? (
          <>
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
          </>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            toggleFull()
          }}
          aria-label={full ? 'Quitter le plein écran' : 'Plein écran'}
          title={full ? 'Quitter le plein écran' : 'Plein écran'}
        >
          {full ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
        </button>
      </div>

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
                setImageNaturalSize({ src: imageObjectUrl, w: el.naturalWidth, h: el.naturalHeight })
                onImageSize?.(el.naturalWidth, el.naturalHeight)
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

        {/* Grille */}
        {box && grid.show && cell >= 4 ? (
          <div
            style={{
              position: 'absolute',
              left: box.left,
              top: box.top,
              width: box.w,
              height: box.h,
              pointerEvents: 'none',
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.28) 1px, transparent 1px)',
              backgroundSize: `${cell}px ${cell}px`,
              backgroundPosition: `${grid.ox * cell}px ${grid.oy * cell}px`,
            }}
          />
        ) : null}

        {/* Tokens (sous le fog) */}
        {box
          ? tokens.filter(tokenShown).map((t) => {
              const s = tokenSizePx(t, box.w)
              const st = tokenStatus[t.id]
              const showHp = st?.maxHp != null && st.maxHp > 0 && st.hp != null && (canEdit || isMine(t))
              const selected =
                canEdit && ((tool === 'tokens' && selectedTokenId === t.id) || (tool === 'move' && moveSelectedIds.includes(t.id)))
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => startDragToken(e, t)}
                  onClick={(e) => e.stopPropagation()}
                  title={[t.label, st?.conditions].filter(Boolean).join(' — ') || undefined}
                  style={{
                    position: 'absolute',
                    left: box.left + t.x * box.w,
                    top: box.top + t.y * box.h,
                    width: s,
                    height: s,
                    borderRadius: 999,
                    background: t.color ?? '#7c3aed',
                    color: 'white',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    opacity: t.hidden ? 0.5 : 1,
                    cursor: canMoveToken(t) ? 'grab' : 'default',
                    boxShadow: st?.active ? '0 0 0 3px #facc15, 0 0 16px 4px rgba(250,204,21,0.8)' : '0 6px 18px rgba(0,0,0,0.35)',
                    outline: selected ? '2px solid rgba(255,255,255,0.9)' : t.hidden ? '2px dashed rgba(255,255,255,0.8)' : undefined,
                  }}
                >
                  {(t.label ?? 'T').slice(0, 2).toUpperCase()}
                  {showHp ? (
                    <div
                      style={{ position: 'absolute', left: 0, right: 0, top: -8, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.7)', overflow: 'hidden' }}
                      title={`${st.hp} / ${st.maxHp} PV`}
                    >
                      <div
                        style={{
                          width: `${clamp(((st.hp ?? 0) / (st.maxHp ?? 1)) * 100, 0, 100)}%`,
                          height: '100%',
                          background: (st.hp ?? 0) / (st.maxHp ?? 1) > 0.5 ? '#22c55e' : (st.hp ?? 0) / (st.maxHp ?? 1) > 0.25 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  ) : null}
                  {t.label ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: 2,
                        padding: '0 4px',
                        borderRadius: 4,
                        background: 'rgba(0,0,0,0.65)',
                        fontSize: 10,
                        fontWeight: 600,
                        lineHeight: 1.4,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        textAlign: 'center',
                      }}
                    >
                      {t.label}
                      {st?.conditions ? <div style={{ color: '#fcd34d', fontWeight: 500 }}>{st.conditions}</div> : null}
                    </div>
                  ) : null}
                </div>
              )
            })
          : null}

        {/* Brouillard (bitmap) : opaque pour les joueurs, en transparence pour le MJ */}
        {box && fogMask ? (
          <FogCanvas mask={fogMask} style={{ position: 'absolute', left: box.left, top: box.top, width: box.w, height: box.h, opacity: canEdit ? 0.45 : 1 }} />
        ) : null}

        {/* Calque vectoriel : gabarits, murs, lumières, obscurité, règle, pings */}
        {box ? (
          <svg
            viewBox={`0 0 ${box.w} ${box.h}`}
            style={{ position: 'absolute', left: box.left, top: box.top, width: box.w, height: box.h, overflow: 'hidden', pointerEvents: 'none' }}
          >
            {templates.map((tp) => (
              <TemplateShape
                key={tp.id}
                shape={tp.shape}
                x1={tp.x1 * box.w}
                y1={tp.y1 * box.h}
                x2={tp.x2 * box.w}
                y2={tp.y2 * box.h}
                cell={cell}
                unit={grid.unit}
                onDoubleClick={
                  canEdit && tool === 'template'
                    ? (e) => {
                        e.stopPropagation()
                        onTemplatesChange?.(templates.filter((x) => x.id !== tp.id))
                      }
                    : undefined
                }
              />
            ))}

            {vision.dynamic ? (
              <>
                <defs>
                  {sources.map((s, i) => (
                    <clipPath key={i} id={`${svgId}-src-${i}`}>
                      <polygon points={polyPoints(s.poly)} />
                    </clipPath>
                  ))}
                  {lit.map((l, i) => (
                    <radialGradient key={i} id={`${svgId}-lit-${i}`} gradientUnits="userSpaceOnUse" cx={l.c.x} cy={l.c.y} r={l.r}>
                      <stop offset="0.5" stopColor="#000" stopOpacity="1" />
                      <stop offset="1" stopColor="#000" stopOpacity="0" />
                    </radialGradient>
                  ))}
                  {/* Blanc = obscurité conservée, noir = zone vue */}
                  <mask id={`${svgId}-dark`} maskUnits="userSpaceOnUse" x={0} y={0} width={box.w} height={box.h}>
                    <rect width={box.w} height={box.h} fill="#fff" />
                    {exploredUrl ? <image href={exploredUrl} width={box.w} height={box.h} preserveAspectRatio="none" /> : null}
                    {sources.map((s, i) =>
                      vision.dark ? (
                        <g key={i} clipPath={`url(#${svgId}-src-${i})`}>
                          {s.dv > 0 ? <circle cx={s.c.x} cy={s.c.y} r={s.dv} fill="#000" /> : null}
                          {lit.map((l, j) => (
                            <polygon key={j} points={polyPoints(l.poly)} fill={`url(#${svgId}-lit-${j})`} />
                          ))}
                        </g>
                      ) : (
                        <polygon key={i} points={polyPoints(s.poly)} fill="#000" />
                      ),
                    )}
                  </mask>
                </defs>
                {/* Le MJ voit l'obscurité en transparence (aperçu de ce que voient les joueurs) */}
                <rect width={box.w} height={box.h} fill="#000" opacity={canEdit ? 0.5 : 1} mask={`url(#${svgId}-dark)`} />
              </>
            ) : null}

            {canEdit
              ? lights.map((l) => (
                  <g key={l.id}>
                    <circle cx={l.x * box.w} cy={l.y * box.h} r={l.radius * cell} fill="none" stroke="rgba(250,204,21,0.45)" strokeDasharray="4 4" />
                    <circle
                      cx={l.x * box.w}
                      cy={l.y * box.h}
                      r={7}
                      fill="#facc15"
                      stroke="#000"
                      style={{ pointerEvents: tool === 'light' ? 'auto' : 'none', cursor: 'pointer' }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        onLightsChange?.(lights.filter((x) => x.id !== l.id))
                      }}
                    >
                      <title>Lumière ({l.radius} cases) — cliquer pour supprimer</title>
                    </circle>
                  </g>
                ))
              : null}

            {canEdit
              ? walls.map((w) => {
                  const x1 = w.x1 * box.w
                  const y1 = w.y1 * box.h
                  const x2 = w.x2 * box.w
                  const y2 = w.y2 * box.h
                  const color = w.window ? '#c084fc' : w.door ? (w.open ? '#22c55e' : '#f97316') : '#38bdf8'
                  return (
                    <g key={w.id}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3} strokeDasharray={w.window ? '2 4' : w.door && w.open ? '6 5' : undefined} />
                      {editingWalls ? (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="transparent"
                          strokeWidth={14}
                          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            onWallsChange?.(walls.filter((x) => x.id !== w.id))
                          }}
                        >
                          <title>Double-clic pour supprimer</title>
                        </line>
                      ) : null}
                      {w.door && !editingWalls ? (
                        <circle
                          cx={(x1 + x2) / 2}
                          cy={(y1 + y2) / 2}
                          r={8}
                          fill={color}
                          stroke="#000"
                          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            onWallsChange?.(walls.map((x) => (x.id === w.id ? { ...x, open: !x.open } : x)))
                          }}
                        >
                          <title>{w.open ? 'Porte ouverte — cliquer pour fermer' : 'Porte fermée — cliquer pour ouvrir'}</title>
                        </circle>
                      ) : null}
                    </g>
                  )
                })
              : null}

            {draft?.kind === 'template' ? (
              <TemplateShape shape={templateShape} x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} cell={cell} unit={grid.unit} />
            ) : null}
            {draft?.kind === 'wall' ? (
              <line x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} stroke={tool === 'door' ? '#f97316' : tool === 'window' ? '#c084fc' : '#38bdf8'} strokeWidth={3} />
            ) : null}
            {draft?.kind === 'ruler' ? (
              <g>
                <line x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} stroke="#facc15" strokeWidth={2} strokeDasharray="6 4" />
                <circle cx={draft.x1} cy={draft.y1} r={3} fill="#facc15" />
                <text x={draft.x2} y={draft.y2 - 10} fill="#fff" fontSize={13} fontWeight={700} textAnchor="middle" stroke="#000" strokeWidth={3} paintOrder="stroke">
                  {(() => {
                    const n = gridDistance(draft.x2 - draft.x1, draft.y2 - draft.y1, cell)
                    return `${n} case${n > 1 ? 's' : ''} · ${+(n * grid.unit).toFixed(1)} m`
                  })()}
                </text>
              </g>
            ) : null}

            {canEdit
              ? zones.map((z) => {
                  const pts = z.points.map((q) => ({ x: q.x * box.w, y: q.y * box.h }))
                  const cx = pts.reduce((a, q) => a + q.x, 0) / pts.length
                  const cy = pts.reduce((a, q) => a + q.y, 0) / pts.length
                  return (
                    <g key={z.id}>
                      <polygon
                        points={polyPoints(pts)}
                        fill="rgba(56,189,248,0.08)"
                        stroke="#38bdf8"
                        strokeDasharray="5 4"
                        style={{ pointerEvents: tool === 'zone' ? 'auto' : 'none', cursor: 'pointer' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          onZonesChange?.(zones.filter((x) => x.id !== z.id))
                        }}
                      >
                        <title>{tool === 'zone' ? `${z.name} — double-clic pour supprimer` : z.name}</title>
                      </polygon>
                      <text x={cx} y={cy} fill="#fff" fontSize={12} fontWeight={600} textAnchor="middle" stroke="#000" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
                        {z.name}
                      </text>
                    </g>
                  )
                })
              : null}

            {fogDraft?.kind === 'rect' ? (
              <rect
                x={Math.min(fogDraft.x1, fogDraft.x2)}
                y={Math.min(fogDraft.y1, fogDraft.y2)}
                width={Math.abs(fogDraft.x2 - fogDraft.x1)}
                height={Math.abs(fogDraft.y2 - fogDraft.y1)}
                fill={tool === 'fog_erase' ? 'rgba(255,0,0,0.12)' : 'rgba(0,0,0,0.45)'}
                stroke={tool === 'fog_erase' ? 'rgba(255,120,120,0.9)' : 'rgba(255,255,255,0.6)'}
                strokeDasharray="4 3"
              />
            ) : null}
            {fogDraft?.kind === 'brush' ? (
              <polyline
                points={polyPoints(fogDraft.points)}
                fill="none"
                stroke={tool === 'fog_erase' ? 'rgba(255,120,120,0.5)' : 'rgba(0,0,0,0.6)'}
                strokeWidth={Math.max(1, fogBrush * cell)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {polyDraft.length ? (
              <g>
                <polyline points={polyPoints(polyDraft)} fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth={2} />
                {polyDraft.map((q, i) => (
                  <circle key={i} cx={q.x} cy={q.y} r={i === 0 ? 6 : 3} fill={i === 0 ? '#38bdf8' : '#fff'} stroke="#000" />
                ))}
              </g>
            ) : null}

            {pings.map((p) => (
              <g key={p.id}>
                <circle cx={p.x * box.w} cy={p.y * box.h} r={5} fill="#facc15" />
                <circle cx={p.x * box.w} cy={p.y * box.h} r={6} fill="none" stroke="#facc15" strokeWidth={3}>
                  <animate attributeName="r" from="6" to="46" dur="0.9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="1" to="0" dur="0.9s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </svg>
        ) : null}

      </div>
    </div>
    </div>
  )
}

/** Masque de brouillard dessiné dans un canvas à sa résolution ; le navigateur le lisse à l'agrandissement. */
function FogCanvas(props: { mask: FogMask; style: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const { mask } = props
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(mask.w, mask.h)
    for (let i = 0; i < mask.px.length; i++) img.data[i * 4 + 3] = mask.px[i]
    ctx.putImageData(img, 0, 0)
  }, [mask])
  return <canvas ref={ref} width={mask.w} height={mask.h} style={{ ...props.style, pointerEvents: 'none' }} />
}

/**
 * Exploration en image pour le masque SVG d'obscurité : gris là où le groupe est déjà passé.
 * Gris 60 % = obscurité à 60 % : le décor reste lisible mais nettement assombri.
 */
function exploredDataUrl(mask: FogMask | null): string | null {
  if (!mask || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = mask.w
  canvas.height = mask.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const img = ctx.createImageData(mask.w, mask.h)
  for (let i = 0; i < mask.px.length; i++) {
    if (mask.px[i]) img.data.set([153, 153, 153, 255], i * 4)
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}
