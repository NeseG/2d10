import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { getItemTypeIcon } from '../../../shared/inventory/itemTypeIcon'
import { itemImageSrc } from '../../../shared/inventory/itemIcons'
import { BAG_COLUMNS, bagMoveChanges, bagRowCount, placeBagItems, type BagItem, type BagSlotChange } from '../bagSlots'

const MOVE_THRESHOLD = 6
const TOUCH_HOLD_MS = 250

type Drag = {
  pointerId: number
  id: number
  slot: number
  startX: number
  startY: number
  active: boolean
  longPressTimer: number | null
}

/** Inventaire en « sac » : grille fixe de cases, on glisse un objet vers n'importe quelle case (vide ou non). */
export function InventoryBagGrid(props: {
  items: BagItem[]
  canMove: boolean
  moveHint?: string
  onOpen: (id: number) => void
  onMove: (changes: BagSlotChange[]) => void
}) {
  const { items, canMove, moveHint, onOpen, onMove } = props
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const skipClickRef = useRef(false)
  /** Positions des objets juste avant un déplacement, pour les animer jusqu'à leur nouvelle case (FLIP). */
  const flipRef = useRef<Map<number, DOMRect> | null>(null)
  const [dragging, setDragging] = useState<{ id: number; dx: number; dy: number } | null>(null)
  const [overSlot, setOverSlot] = useState<number | null>(null)

  const bySlot = useMemo(() => placeBagItems(items), [items])
  const slotCount = bagRowCount(bySlot) * BAG_COLUMNS

  // Sur mobile, une fois le glisser lancé (appui long), on bloque le défilement de la page.
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const block = (e: TouchEvent) => {
      if (dragRef.current?.active) e.preventDefault()
    }
    grid.addEventListener('touchmove', block, { passive: false })
    return () => grid.removeEventListener('touchmove', block)
  }, [])

  useLayoutEffect(() => {
    const before = flipRef.current
    if (!before || !gridRef.current) return
    flipRef.current = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gridRef.current.querySelectorAll<HTMLElement>('[data-bag-id]').forEach((el) => {
      const prev = before.get(Number(el.dataset.bagId))
      if (!prev || typeof el.animate !== 'function') return
      const now = el.getBoundingClientRect()
      const dx = prev.left - now.left
      const dy = prev.top - now.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: 220,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      })
    })
  }, [items])

  function startDrag(d: Drag) {
    d.active = true
    setDragging({ id: d.id, dx: 0, dy: 0 })
    setOverSlot(d.slot)
  }

  function reset() {
    const d = dragRef.current
    if (d?.longPressTimer) window.clearTimeout(d.longPressTimer)
    dragRef.current = null
    setDragging(null)
    setOverSlot(null)
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>, id: number, slot: number) {
    if (!canMove || (e.pointerType === 'mouse' && e.button !== 0)) return
    const d: Drag = { pointerId: e.pointerId, id, slot, startX: e.clientX, startY: e.clientY, active: false, longPressTimer: null }
    dragRef.current = d
    e.currentTarget.setPointerCapture(e.pointerId)
    // Tactile : appui long pour saisir l'objet, sinon le geste reste un défilement ou un clic.
    if (e.pointerType !== 'mouse') d.longPressTimer = window.setTimeout(() => dragRef.current === d && startDrag(d), TOUCH_HOLD_MS)
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (Math.hypot(dx, dy) < MOVE_THRESHOLD) return
      if (e.pointerType !== 'mouse') return reset() // bougé avant l'appui long : c'est un défilement
      startDrag(d)
    }
    setDragging({ id: d.id, dx, dy })
    // L'objet glissé a pointer-events: none, on trouve donc la case sous le pointeur.
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-bag-slot]')
    const slot = cell && gridRef.current?.contains(cell) ? Number(cell.dataset.bagSlot) : null
    if (slot !== overSlot) setOverSlot(slot)
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    if (d.active) {
      skipClickRef.current = true
      window.setTimeout(() => (skipClickRef.current = false), 0)
      const changes = overSlot != null ? bagMoveChanges(bySlot, d.slot, overSlot) : []
      if (changes.length && gridRef.current) {
        const rects = new Map<number, DOMRect>()
        gridRef.current.querySelectorAll<HTMLElement>('[data-bag-id]').forEach((el) => rects.set(Number(el.dataset.bagId), el.getBoundingClientRect()))
        flipRef.current = rects
        onMove(changes)
      }
    }
    reset()
  }

  return (
    <>
      {!canMove && moveHint ? <p className="inventory-bag-hint">{moveHint}</p> : null}
      <div
        ref={gridRef}
        className={`inventory-bag${dragging ? ' inventory-bag-dragging' : ''}`}
        style={{ gridTemplateColumns: `repeat(${BAG_COLUMNS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: slotCount }, (_, slot) => {
          const item = bySlot.get(slot)
          const isDragged = item != null && dragging?.id === item.id
          return (
            <div
              key={slot}
              data-bag-slot={slot}
              className={`inventory-bag-cell${dragging && overSlot === slot && !isDragged ? ' is-over' : ''}`}
            >
              {item ? (
                <button
                  type="button"
                  data-bag-id={item.id}
                  className={`inventory-bag-slot${isDragged ? ' is-dragged' : ''}`}
                  style={isDragged ? { transform: `translate(${dragging.dx}px, ${dragging.dy}px) scale(1.08)` } : undefined}
                  title={item.name}
                  aria-label={`${item.name}${item.quantity > 1 ? `, quantité ${item.quantity}` : ''}${item.is_equipped ? ', équipé' : ''}`}
                  onClick={() => !skipClickRef.current && onOpen(item.id)}
                  onPointerDown={(e) => onPointerDown(e, item.id, slot)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={reset}
                  onContextMenu={(e) => dragRef.current && e.preventDefault()}
                >
                  {item.image_url ? (
                    <img src={itemImageSrc(item.image_url)} alt="" draggable={false} />
                  ) : (
                    <span className="inventory-bag-type-icon">{getItemTypeIcon(item.type).icon}</span>
                  )}
                  {item.quantity > 1 ? <span className="inventory-bag-qty">{item.quantity}</span> : null}
                  {item.is_equipped ? <Star className="inventory-bag-star" size={14} fill="currentColor" aria-hidden="true" /> : null}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </>
  )
}
