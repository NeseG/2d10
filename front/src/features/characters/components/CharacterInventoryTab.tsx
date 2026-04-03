import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Car,
  Cog,
  Dog,
  FlaskRound,
  Funnel,
  GripVertical,
  Pickaxe,
  RotateCcw,
  Shapes,
  Shield,
  Sword,
} from 'lucide-react'
import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/api/client'
import { parseLocalizedDecimalString } from '../../../shared/utils/parseLocalizedDecimal'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { ItemDetailsModal, type ItemDetail } from '../../inventory/components/ItemDetailsModal'
import {
  ItemEditModal,
  RemoveFromInventoryConfirmModal,
  type EditItemFormState,
} from '../../inventory/components/ItemEditModal'

type CharacterPurse = {
  copper_pieces: number
  silver_pieces: number
  electrum_pieces: number
  gold_pieces: number
  platinum_pieces: number
}

type InventoryItem = {
  id: number
  item_id?: number | null
  index?: string | null
  sort_order?: number
  name: string
  quantity: number
  is_equipped: boolean
  weight?: number | null
  type?: string | null
  category?: string | null
  cost?: string | null
  properties?: unknown
}

type Dnd5eEquipmentListItem = {
  id: number
  index: string
  name: string
  type: string
  category?: string | null
  subcategory?: string | null
  weight?: number | null
  cost?: string | null
}

type Dnd5eMagicItemListItem = {
  id: number
  index: string
  name: string
  categoryIndex?: string | null
  categoryName?: string | null
  rarity?: string | null
}

/** Réponse détail GET /api/dnd5e/equipment/:index (champs Prisma / JSON). */
type Dnd5eEquipmentApiDetail = {
  id: number
  index: string
  name: string
  type: string
  category?: string | null
  subcategory?: string | null
  cost?: string | null
  weight?: number | null
  description?: string | null
  damage?: string | null
  damageType?: string | null
  range?: string | null
  armorClass?: number | null
  stealthDisadvantage?: boolean | null
  properties?: unknown
  raw?: unknown
}

/** Réponse détail GET /api/dnd5e/magic-items/:index */
type Dnd5eMagicItemApiDetail = {
  id: number
  index: string
  name: string
  categoryIndex?: string | null
  categoryName?: string | null
  rarity?: string | null
  description?: string | null
  variant?: boolean
  variants?: unknown
  image?: string | null
  apiUpdatedAt?: string | null
  raw?: unknown
}

type DndCatalogDetailState =
  | { kind: 'equipment'; data: Dnd5eEquipmentApiDetail }
  | { kind: 'magic'; data: Dnd5eMagicItemApiDetail }

function formatJsonOrDash(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value.trim() || '—'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function isDnd5eMagicItemProperties(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return v.dnd5e_magic_item === true
}

function findInventoryRowElementFromPoint(clientX: number, clientY: number): HTMLElement | null {
  if (typeof document.elementsFromPoint === 'function') {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const tr = el.closest?.('tr[data-inventory-line-id]')
      if (tr instanceof HTMLElement) return tr
    }
    return null
  }
  const hit = document.elementFromPoint(clientX, clientY)
  const tr = hit?.closest?.('tr[data-inventory-line-id]')
  return tr instanceof HTMLElement ? tr : null
}

function isEquipableItemType(typeValue?: string | null): boolean {
  const normalized = String(typeValue || '')
    .trim()
    .toLowerCase()
  return (
    normalized === 'armor' ||
    normalized === 'weapon' ||
    normalized === 'gear' ||
    normalized === 'consumable' ||
    normalized === 'ammunition'
  )
}

function getItemTypeIcon(typeValue?: string | null): { icon: React.ReactNode; label: string } | null {
  const t = String(typeValue ?? '')
    .trim()
    .toLowerCase()
  if (!t) return { icon: <Shapes size={18} aria-hidden="true" />, label: 'other' }

  if (t === 'armor') return { icon: <Shield size={18} aria-hidden="true" />, label: 'armor' }
  if (t === 'weapon') return { icon: <Sword size={18} aria-hidden="true" />, label: 'weapon' }
  if (t === 'gear') return { icon: <Cog size={18} aria-hidden="true" />, label: 'gear' }
  if (t === 'tool') return { icon: <Pickaxe size={18} aria-hidden="true" />, label: 'tool' }
  if (t === 'mount') return { icon: <Dog size={18} aria-hidden="true" />, label: 'mount' }
  if (t === 'vehicle') return { icon: <Car size={18} aria-hidden="true" />, label: 'vehicle' }
  if (t === 'ammunition') return { icon: <RotateCcw size={18} aria-hidden="true" />, label: 'ammunition' }
  if (t === 'consumable') return { icon: <FlaskRound size={18} aria-hidden="true" />, label: 'consumable' }

  return { icon: <Shapes size={18} aria-hidden="true" />, label: t }
}

type PurseDraft = {
  copper: string
  silver: string
  electrum: string
  gold: string
  platinum: string
}

const DND5E_ITEM_TYPES: Array<{ value: string; label: string }> = [
  { value: 'weapon', label: 'weapon' },
  { value: 'armor', label: 'armor' },
  { value: 'gear', label: 'gear' },
  { value: 'tool', label: 'tool' },
  { value: 'mount', label: 'mount' },
  { value: 'vehicle', label: 'vehicle' },
  { value: 'ammunition', label: 'ammunition' },
  { value: 'consumable', label: 'consumable' },
  { value: 'other', label: 'other' },
]

const ITEM_CATEGORY_SUGGESTIONS = [
  'Melee Weapon',
  'Ranged Weapon',
  'Magic Weapon',
  'Light Armor',
  'Medium Armor',
  'Heavy Armor',
  'Magic Armor',
  'Shield',
  'Magic Shield',
  'Adventuring Gear',
  'Tool',
  'Artisan Tool',
  'Musical Instrument',
  'Gaming Set',
  'Mount',
  'Vehicle',
  'Ammunition',
  'Consumable',
  'Potion',
  'Scroll',
  'Wondrous Item',
  'Ring',
  'Rod',
  'Staff',
  'Wand',
  'Artifact',
  'Wonderous Item',
]

const ITEM_SUBCATEGORY_SUGGESTIONS = [
  'Simple Melee',
  'Martial Melee',
  'Simple Ranged',
  'Martial Ranged',
  'Light',
  'Medium',
  'Heavy',
  'Shield',
  'Arcane Focus',
  'Druidic Focus',
  'Holy Symbol',
  'Ammunition',
  'Potion',
  'Scroll',
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
  'Varies',
  'Unknown',
]

function parseJsonOrNull(raw: string): unknown | null {
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function extractArmorDexBonus(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const armorClass = (value as Record<string, unknown>).armor_class
  if (!armorClass || typeof armorClass !== 'object' || Array.isArray(armorClass)) return false
  return Boolean((armorClass as Record<string, unknown>).dex_bonus)
}

function parseItemRange(value: unknown): { normal: string; long: string } {
  if (value == null) return { normal: '', long: '' }
  if (typeof value === 'number') return { normal: String(value), long: '' }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    const normal = obj.normal != null ? String(obj.normal) : ''
    const long = obj.long != null ? String(obj.long) : ''
    return { normal, long }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return { normal: '', long: '' }
    try {
      return parseItemRange(JSON.parse(trimmed) as unknown)
    } catch {
      const [normal, long] = trimmed.split('/').map((entry) => entry.trim())
      if (long !== undefined) return { normal: normal || '', long: long || '' }
      return { normal: trimmed, long: '' }
    }
  }
  return { normal: String(value), long: '' }
}

function serializeItemRange(normal: string, long: string): string | null {
  const trimmedNormal = normal.trim()
  const trimmedLong = long.trim()
  if (!trimmedNormal && !trimmedLong) return null
  if (trimmedNormal && !trimmedLong) return trimmedNormal
  return JSON.stringify({
    normal: trimmedNormal ? Number(trimmedNormal) || trimmedNormal : null,
    long: trimmedLong ? Number(trimmedLong) || trimmedLong : null,
  })
}

function computeDraftGoldValue(draft: PurseDraft | null): number {
  if (!draft) return 0
  const pp = Number(draft.platinum) || 0
  const gp = Number(draft.gold) || 0
  const ep = Number(draft.electrum) || 0
  const sp = Number(draft.silver) || 0
  const cp = Number(draft.copper) || 0
  return pp * 10 + gp + ep * 0.5 + sp * 0.1 + cp * 0.01
}

type PursePayload = {
  platinum: number
  gold: number
  electrum: number
  silver: number
  copper: number
}

function draftToPursePayload(draft: PurseDraft): PursePayload {
  return {
    platinum: Number.parseInt(String(draft.platinum).trim(), 10) || 0,
    gold: Number.parseInt(String(draft.gold).trim(), 10) || 0,
    electrum: Number.parseInt(String(draft.electrum).trim(), 10) || 0,
    silver: Number.parseInt(String(draft.silver).trim(), 10) || 0,
    copper: Number.parseInt(String(draft.copper).trim(), 10) || 0,
  }
}

function pursePayloadsEqual(a: PursePayload, b: PursePayload): boolean {
  return (
    a.platinum === b.platinum &&
    a.gold === b.gold &&
    a.electrum === b.electrum &&
    a.silver === b.silver &&
    a.copper === b.copper
  )
}

export function CharacterInventoryTab(props: { characterId: string; token: string }) {
  const { characterId, token } = props
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()

  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryLoaded, setInventoryLoaded] = useState(false)

  const [purseSyncing, setPurseSyncing] = useState(false)
  const [purseDraft, setPurseDraft] = useState<PurseDraft | null>(null)
  const purseDraftRef = useRef<PurseDraft | null>(null)
  const lastPersistedPurseRef = useRef<PursePayload | null>(null)
  const purseSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    purseDraftRef.current = purseDraft
  }, [purseDraft])

  useEffect(() => {
    return () => {
      if (purseSaveTimerRef.current) clearTimeout(purseSaveTimerRef.current)
    }
  }, [])

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryQuantityDraft, setInventoryQuantityDraft] = useState<Record<number, string>>({})
  const [savingQuantityId, setSavingQuantityId] = useState<number | null>(null)
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryFiltersOpen, setInventoryFiltersOpen] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [draggingInventoryId, setDraggingInventoryId] = useState<number | null>(null)
  const [dragOverInventoryId, setDragOverInventoryId] = useState<number | null>(null)
  const reorderPointerRef = useRef<{
    pointerId: number
    sourceId: number
    captureTarget: HTMLElement | null
  } | null>(null)
  const dragOverInventoryIdRef = useRef<number | null>(null)
  /** Évite d’ouvrir la fiche item juste après un relâchement de glisser (mobile / souris). */
  const skipNextInventoryRowClickRef = useRef(false)

  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false)
  const [createItemSaving, setCreateItemSaving] = useState(false)
  const [createItemKind, setCreateItemKind] = useState<'normal' | 'magic'>('normal')
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    description: '',
    quantity: '1',
    type: 'other',
    category: '',
    subcategory: '',
    rarity: '',
    cost: '',
    weight: '',
  })

  const [isItemDetailsModalOpen, setIsItemDetailsModalOpen] = useState(false)
  const [itemDetailsLoading, setItemDetailsLoading] = useState(false)
  const [itemDetails, setItemDetails] = useState<ItemDetail | null>(null)
  const [itemDetailsInventoryLineId, setItemDetailsInventoryLineId] = useState<number | null>(null)

  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false)
  const [editItemLoading, setEditItemLoading] = useState(false)
  const [editItemSaving, setEditItemSaving] = useState(false)
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [editInventoryLineId, setEditInventoryLineId] = useState<number | null>(null)
  const [editItemForm, setEditItemForm] = useState<EditItemFormState>({
    name: '',
    description: '',
    type: 'other',
    category: '',
    subcategory: '',
    cost: '',
    weight: '',
    damage: '',
    damageType: '',
    rangeNormal: '',
    rangeLong: '',
    armorClass: '',
    armorDexBonus: false,
    stealthDisadvantage: false,
    propertiesJson: '',
  })
  const [removeFromInventoryConfirmOpen, setRemoveFromInventoryConfirmOpen] = useState(false)
  const [removingFromInventory, setRemovingFromInventory] = useState(false)

  const [isDndEquipmentModalOpen, setIsDndEquipmentModalOpen] = useState(false)
  const [dndImportTab, setDndImportTab] = useState<'equipment' | 'magic'>('equipment')
  const [dndEquipmentQuery, setDndEquipmentQuery] = useState('')
  const [dndEquipmentLoading, setDndEquipmentLoading] = useState(false)
  const [dndEquipmentItems, setDndEquipmentItems] = useState<Dnd5eEquipmentListItem[]>([])
  const [dndEquipmentPage, setDndEquipmentPage] = useState(1)
  const [dndEquipmentTotalPages, setDndEquipmentTotalPages] = useState(1)
  const [dndEquipmentAddingId, setDndEquipmentAddingId] = useState<number | null>(null)
  const [dndMagicQuery, setDndMagicQuery] = useState('')
  const [dndMagicLoading, setDndMagicLoading] = useState(false)
  const [dndMagicItems, setDndMagicItems] = useState<Dnd5eMagicItemListItem[]>([])
  const [dndMagicPage, setDndMagicPage] = useState(1)
  const [dndMagicTotalPages, setDndMagicTotalPages] = useState(1)
  const [dndMagicAddingId, setDndMagicAddingId] = useState<number | null>(null)
  const [dndCatalogDetailLoading, setDndCatalogDetailLoading] = useState(false)
  const [dndCatalogDetail, setDndCatalogDetail] = useState<DndCatalogDetailState | null>(null)
  const canImportDndEquipment = user?.role === 'admin' || user?.role === 'gm'

  const dndCatalogDetailOpen = dndCatalogDetailLoading || dndCatalogDetail != null

  function closeDndCatalogDetail() {
    setDndCatalogDetail(null)
    setDndCatalogDetailLoading(false)
  }

  async function openDndCatalogEquipmentDetail(apiIndex: string) {
    setDndCatalogDetail(null)
    setDndCatalogDetailLoading(true)
    try {
      const res = await apiGet<{ item: Dnd5eEquipmentApiDetail }>(
        `/api/dnd5e/equipment/${encodeURIComponent(apiIndex)}`,
        token,
      )
      setDndCatalogDetail({ kind: 'equipment', data: res.item })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement fiche équipement',
        severity: 'error',
      })
    } finally {
      setDndCatalogDetailLoading(false)
    }
  }

  async function openDndCatalogMagicDetail(apiIndex: string) {
    setDndCatalogDetail(null)
    setDndCatalogDetailLoading(true)
    try {
      const res = await apiGet<{ magic_item: Dnd5eMagicItemApiDetail }>(
        `/api/dnd5e/magic-items/${encodeURIComponent(apiIndex)}`,
        token,
      )
      if (res.magic_item) setDndCatalogDetail({ kind: 'magic', data: res.magic_item })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement fiche objet magique',
        severity: 'error',
      })
    } finally {
      setDndCatalogDetailLoading(false)
    }
  }

  useEffect(() => {
    setInventoryLoaded(false)
    setInventoryQuantityDraft({})
  }, [characterId])

  useEffect(() => {
    async function loadInventory() {
      if (!characterId || inventoryLoaded) return
      setInventoryLoading(true)
      try {
        const [purseResult, inventoryResult] = await Promise.allSettled([
          apiGet<{ success: boolean; purse: CharacterPurse; total_gold_value: number }>(`/api/purse/${characterId}`, token),
          apiGet<{ inventory: InventoryItem[]; total_weight: number; total_items: number }>(`/api/inventory/${characterId}`, token),
        ])

        if (purseResult.status === 'fulfilled') {
          const p = purseResult.value.purse
          lastPersistedPurseRef.current = {
            copper: p.copper_pieces ?? 0,
            silver: p.silver_pieces ?? 0,
            electrum: p.electrum_pieces ?? 0,
            gold: p.gold_pieces ?? 0,
            platinum: p.platinum_pieces ?? 0,
          }
          setPurseDraft({
            copper: String(p.copper_pieces ?? 0),
            silver: String(p.silver_pieces ?? 0),
            electrum: String(p.electrum_pieces ?? 0),
            gold: String(p.gold_pieces ?? 0),
            platinum: String(p.platinum_pieces ?? 0),
          })
        } else {
          lastPersistedPurseRef.current = { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 }
          setPurseDraft({ copper: '0', silver: '0', electrum: '0', gold: '0', platinum: '0' })
        }

        if (inventoryResult.status === 'fulfilled') setInventoryItems(inventoryResult.value.inventory ?? [])
        else setInventoryItems([])

        if (purseResult.status === 'rejected' && inventoryResult.status === 'rejected') {
          showSnackbar({
            message: 'Impossible de charger la bourse et l’inventaire pour ce personnage.',
            severity: 'error',
          })
        }

        setInventoryLoaded(true)
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur chargement inventaire',
          severity: 'error',
        })
      } finally {
        setInventoryLoading(false)
      }
    }

    void loadInventory()
  }, [characterId, inventoryLoaded, token, showSnackbar])

  useEffect(() => {
    setInventoryQuantityDraft((prev) => {
      const next: Record<number, string> = {}
      for (const it of inventoryItems) {
        next[it.id] = prev[it.id] !== undefined ? prev[it.id] : String(it.quantity)
      }
      return next
    })
  }, [inventoryItems])

  const availableTypes = useMemo(() => {
    const present = new Set(
      inventoryItems.map((item) => (getItemTypeIcon(item.type)?.label || 'other').trim().toLowerCase()),
    )

    const knownInOrder = DND5E_ITEM_TYPES.map((t) => t.value).filter((value) => present.has(value))
    const unknown = Array.from(present)
      .filter((value) => !DND5E_ITEM_TYPES.some((t) => t.value === value))
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))

    return [...knownInOrder, ...unknown]
  }, [inventoryItems])

  const filteredInventoryItems = useMemo(() => {
    const normalizedSearch = inventorySearch.trim().toLowerCase()
    return inventoryItems.filter((item) => {
      const matchesSearch = !normalizedSearch || String(item.name || '').toLowerCase().includes(normalizedSearch)
      const itemType = (getItemTypeIcon(item.type)?.label || 'other').trim().toLowerCase()
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(itemType)
      return matchesSearch && matchesType
    })
  }, [inventoryItems, inventorySearch, selectedTypes])

  const canReorderInventory = useMemo(
    () =>
      inventoryItems.length > 1 && !inventorySearch.trim() && selectedTypes.length === 0,
    [inventoryItems.length, inventorySearch, selectedTypes.length],
  )

  async function applyInventoryReorder(draggedId: number, targetId: number) {
    if (!characterId || draggedId === targetId || !canReorderInventory) return
    const prev = inventoryItems
    const from = prev.findIndex((i) => i.id === draggedId)
    const to = prev.findIndex((i) => i.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...prev]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    const orderedIds = next.map((i) => i.id)
    setInventoryItems(next)
    try {
      await apiPut(`/api/inventory/${characterId}/reorder`, { ordered_inventory_ids: orderedIds }, token)
    } catch (err) {
      setInventoryItems(prev)
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lors de l’enregistrement de l’ordre',
        severity: 'error',
      })
    }
  }

  function handleInventoryReorderPointerDown(
    event: React.PointerEvent<HTMLTableCellElement>,
    sourceId: number,
  ) {
    if (!canReorderInventory) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const el = event.currentTarget
    el.setPointerCapture(event.pointerId)
    reorderPointerRef.current = {
      pointerId: event.pointerId,
      sourceId,
      captureTarget: el,
    }
    dragOverInventoryIdRef.current = sourceId
    setDraggingInventoryId(sourceId)
    setDragOverInventoryId(sourceId)
  }

  function handleInventoryReorderPointerMove(event: React.PointerEvent<HTMLTableCellElement>) {
    const st = reorderPointerRef.current
    if (!st || event.pointerId !== st.pointerId) return
    const tr = findInventoryRowElementFromPoint(event.clientX, event.clientY)
    const raw = tr?.dataset?.inventoryLineId
    const overId = raw != null ? Number.parseInt(raw, 10) : Number.NaN
    if (!Number.isFinite(overId)) return
    if (dragOverInventoryIdRef.current !== overId) {
      dragOverInventoryIdRef.current = overId
      setDragOverInventoryId(overId)
    }
  }

  function clearInventoryReorderPointer(event: React.PointerEvent<HTMLTableCellElement>) {
    const st = reorderPointerRef.current
    if (!st || event.pointerId !== st.pointerId) return
    event.stopPropagation()
    try {
      st.captureTarget?.releasePointerCapture(event.pointerId)
    } catch {
      /* déjà relâché */
    }
    const sourceId = st.sourceId
    const targetId = dragOverInventoryIdRef.current
    reorderPointerRef.current = null
    dragOverInventoryIdRef.current = null
    setDraggingInventoryId(null)
    setDragOverInventoryId(null)
    skipNextInventoryRowClickRef.current = true
    window.setTimeout(() => {
      skipNextInventoryRowClickRef.current = false
    }, 0)
    if (targetId != null && sourceId !== targetId) {
      void applyInventoryReorder(sourceId, targetId)
    }
  }

  function abortInventoryReorderPointer(event: React.PointerEvent<HTMLTableCellElement>) {
    const st = reorderPointerRef.current
    if (!st || event.pointerId !== st.pointerId) return
    event.stopPropagation()
    try {
      st.captureTarget?.releasePointerCapture(event.pointerId)
    } catch {
      /* déjà relâché */
    }
    reorderPointerRef.current = null
    dragOverInventoryIdRef.current = null
    setDraggingInventoryId(null)
    setDragOverInventoryId(null)
  }

  function schedulePursePersist() {
    if (purseSaveTimerRef.current) clearTimeout(purseSaveTimerRef.current)
    purseSaveTimerRef.current = setTimeout(() => {
      purseSaveTimerRef.current = null
      const d = purseDraftRef.current
      if (d) void persistPurseIfChanged(d)
    }, 450)
  }

  function flushPursePersist() {
    if (purseSaveTimerRef.current) {
      clearTimeout(purseSaveTimerRef.current)
      purseSaveTimerRef.current = null
    }
    const d = purseDraftRef.current
    if (d) void persistPurseIfChanged(d)
  }

  async function persistPurseIfChanged(draft: PurseDraft) {
    if (!characterId) return
    const next = draftToPursePayload(draft)
    const prev = lastPersistedPurseRef.current
    if (prev && pursePayloadsEqual(prev, next)) return

    setPurseSyncing(true)
    try {
      await apiPut(`/api/purse/${characterId}`, next, token)
      lastPersistedPurseRef.current = next
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la bourse',
        severity: 'error',
      })
      if (prev) {
        setPurseDraft({
          copper: String(prev.copper),
          silver: String(prev.silver),
          electrum: String(prev.electrum),
          gold: String(prev.gold),
          platinum: String(prev.platinum),
        })
      }
    } finally {
      setPurseSyncing(false)
    }
  }

  async function handleInventoryQuantityBlur(inventoryLineId: number) {
    const raw = inventoryQuantityDraft[inventoryLineId] ?? ''
    const parsed = Number.parseInt(String(raw).trim(), 10)
    const row = inventoryItems.find((x) => x.id === inventoryLineId)
    if (!row) return

    if (Number.isNaN(parsed) || parsed < 0) {
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(row.quantity) }))
      showSnackbar({
        message: 'La quantité doit être un entier au moins égal à 0.',
        severity: 'error',
      })
      return
    }

    if (parsed === row.quantity) {
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(parsed) }))
      return
    }

    setSavingQuantityId(inventoryLineId)
    try {
      await apiPut(`/api/inventory/${characterId}/items/${inventoryLineId}`, { quantity: parsed }, token)
      setInventoryItems((prev) => prev.map((it) => (it.id === inventoryLineId ? { ...it, quantity: parsed } : it)))
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(parsed) }))
      showSnackbar({ message: 'Quantité mise à jour.', severity: 'success' })
    } catch (err) {
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(row.quantity) }))
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la quantité.',
        severity: 'error',
      })
    } finally {
      setSavingQuantityId(null)
    }
  }

  async function handleInventoryQuantityStep(inventoryLineId: number, delta: number) {
    const row = inventoryItems.find((x) => x.id === inventoryLineId)
    if (!row || savingQuantityId === inventoryLineId) return
    const currentDraft = Number.parseInt(String(inventoryQuantityDraft[inventoryLineId] ?? row.quantity).trim(), 10)
    const safeCurrent = Number.isNaN(currentDraft) ? row.quantity : currentDraft
    const nextQuantity = Math.max(0, safeCurrent + delta)
    setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(nextQuantity) }))
    await handleInventoryQuantityBlurWithValue(inventoryLineId, nextQuantity, row.quantity)
  }

  async function handleInventoryQuantityBlurWithValue(inventoryLineId: number, parsed: number, fallbackQuantity: number) {
    if (Number.isNaN(parsed) || parsed < 0) {
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(fallbackQuantity) }))
      showSnackbar({
        message: 'La quantité doit être un entier au moins égal à 0.',
        severity: 'error',
      })
      return
    }

    if (parsed === fallbackQuantity) {
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(parsed) }))
      return
    }

    setSavingQuantityId(inventoryLineId)
    try {
      await apiPut(`/api/inventory/${characterId}/items/${inventoryLineId}`, { quantity: parsed }, token)
      setInventoryItems((prev) => prev.map((it) => (it.id === inventoryLineId ? { ...it, quantity: parsed } : it)))
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(parsed) }))
    } catch (err) {
      setInventoryQuantityDraft((d) => ({ ...d, [inventoryLineId]: String(fallbackQuantity) }))
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la quantité.',
        severity: 'error',
      })
    } finally {
      setSavingQuantityId(null)
    }
  }

  async function handleToggleEquipped(item: InventoryItem, nextIsEquipped: boolean) {
    if (!characterId) return
    if (!isEquipableItemType(item.type)) {
      showSnackbar({
        message: 'Seuls les items de type armor, weapon, gear, consumable ou ammunition peuvent être équipés.',
        severity: 'error',
      })
      return
    }

    try {
      await apiPut(`/api/inventory/${characterId}/items/${item.id}`, { is_equipped: nextIsEquipped }, token)
      setInventoryItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_equipped: nextIsEquipped } : it)))
      showSnackbar({
        message: nextIsEquipped ? 'Objet équipé.' : 'Objet déséquipé.',
        severity: 'success',
      })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l’état équipé.',
        severity: 'error',
      })
    }
  }

  function resetNewItemForm() {
    setCreateItemKind('normal')
    setNewItemForm({
      name: '',
      description: '',
      quantity: '1',
      type: 'other',
      category: '',
      subcategory: '',
      rarity: '',
      cost: '',
      weight: '',
    })
  }

  async function openCreateItemModal() {
    setIsCreateItemModalOpen(true)
    resetNewItemForm()
  }

  async function handleCreateAndLinkItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!characterId) return
    setCreateItemSaving(true)
    const createdAsMagic = createItemKind === 'magic'
    try {
      let weightPayload: number | null = null
      if (newItemForm.weight.trim() !== '') {
        const w = parseLocalizedDecimalString(newItemForm.weight)
        if (w == null) {
          showSnackbar({ message: 'Poids invalide (ex. 1 ou 0,5).', severity: 'error' })
          return
        }
        weightPayload = w
      }

      const payload: Record<string, unknown> = {
        name: newItemForm.name.trim(),
        description: newItemForm.description.trim() || null,
        type: newItemForm.type,
        category: newItemForm.category.trim() || null,
        subcategory: newItemForm.subcategory.trim() || null,
        cost: newItemForm.cost.trim() || null,
        weight: weightPayload,
      }
      if (createdAsMagic) {
        payload.subcategory = newItemForm.rarity.trim() || null
        payload.properties = { dnd5e_magic_item: true, custom: true }
      }

      const created = await apiPost<{ item: { id: number } }>(`/api/items`, payload, token)

      const qty = Number.parseInt(newItemForm.quantity, 10)
      await apiPost(`/api/inventory/${characterId}/items`, { item_id: created.item.id, quantity: Number.isNaN(qty) ? 1 : qty }, token)

      setIsCreateItemModalOpen(false)
      resetNewItemForm()
      setInventoryLoaded(false)
      showSnackbar({
        message: createdAsMagic ? 'Objet magique créé et ajouté.' : 'Objet créé et ajouté.',
        severity: 'success',
      })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création item',
        severity: 'error',
      })
    } finally {
      setCreateItemSaving(false)
    }
  }

  async function openItemDetailsModal(item: InventoryItem) {
    const itemId = item.item_id ?? null
    if (!itemId) return
    setIsItemDetailsModalOpen(true)
    setItemDetails(null)
    setItemDetailsLoading(true)
    setItemDetailsInventoryLineId(item.id)
    try {
      const res = await apiGet<{ item: ItemDetail }>(`/api/items/${itemId}`, token)
      setItemDetails(res.item)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Erreur lors du chargement de l'objet",
        severity: 'error',
      })
    } finally {
      setItemDetailsLoading(false)
    }
  }

  async function openEditItemModal(params: { itemId: number; inventoryLineId: number }) {
    setIsEditItemModalOpen(true)
    setEditItemLoading(true)
    setEditItemSaving(false)
    setEditItemId(params.itemId)
    setEditInventoryLineId(params.inventoryLineId)
    try {
      const itemRes = await apiGet<{ item: ItemDetail }>(`/api/items/${params.itemId}`, token)
      const it = itemRes.item
      const armorDexBonus = extractArmorDexBonus(it.raw) || extractArmorDexBonus(it.properties)
      const parsedRange = parseItemRange(it.range)
      setEditItemForm({
        name: it.name ?? '',
        description: it.description ?? '',
        type: (it.type as string) ?? 'other',
        category: it.category ?? '',
        subcategory: it.subcategory ?? '',
        cost: it.cost ?? '',
        weight: it.weight != null ? String(it.weight) : '',
        damage: it.damage ?? '',
        damageType: it.damageType ?? '',
        rangeNormal: parsedRange.normal,
        rangeLong: parsedRange.long,
        armorClass: it.armorClass != null ? String(it.armorClass) : '',
        armorDexBonus,
        stealthDisadvantage: Boolean(it.stealthDisadvantage),
        propertiesJson: it.properties ? JSON.stringify(it.properties, null, 2) : '',
      })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Erreur lors du chargement de l'objet",
        severity: 'error',
      })
    } finally {
      setEditItemLoading(false)
    }
  }

  async function handleSaveEditedItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editItemId) return
    setEditItemSaving(true)
    try {
      let weightOut: number | null = null
      if (editItemForm.weight.trim() !== '') {
        const w = parseLocalizedDecimalString(editItemForm.weight)
        if (w == null) {
          showSnackbar({ message: 'Poids invalide (ex. 1 ou 0,5).', severity: 'error' })
          return
        }
        weightOut = w
      }

      const parsedProperties = parseJsonOrNull(editItemForm.propertiesJson)
      const armorProperties =
        editItemForm.type === 'armor'
          ? {
              ...(parsedProperties && typeof parsedProperties === 'object' && !Array.isArray(parsedProperties)
                ? (parsedProperties as Record<string, unknown>)
                : {}),
              armor_class: {
                base: editItemForm.armorClass.trim() === '' ? null : Number.parseInt(editItemForm.armorClass, 10),
                dex_bonus: Boolean(editItemForm.armorDexBonus),
              },
            }
          : parsedProperties
      await apiPut(
        `/api/items/${editItemId}`,
        {
          name: editItemForm.name.trim(),
          description: editItemForm.description.trim() || null,
          type: editItemForm.type,
          category: editItemForm.category.trim() || null,
          subcategory: editItemForm.subcategory.trim() || null,
          cost: editItemForm.cost.trim() || null,
          weight: weightOut,
          damage: editItemForm.damage.trim() || null,
          damageType: editItemForm.damageType.trim() || null,
          range: serializeItemRange(editItemForm.rangeNormal, editItemForm.rangeLong),
          armorClass: editItemForm.armorClass.trim() === '' ? null : Number.parseInt(editItemForm.armorClass, 10),
          armorDexBonus: Boolean(editItemForm.armorDexBonus),
          stealthDisadvantage: Boolean(editItemForm.stealthDisadvantage),
          properties: armorProperties,
        },
        token,
      )
      setIsEditItemModalOpen(false)
      setEditItemId(null)
      setInventoryLoaded(false)
      showSnackbar({ message: 'Objet mis à jour.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'objet",
        severity: 'error',
      })
    } finally {
      setEditItemSaving(false)
    }
  }

  async function handleRemoveFromInventory() {
    if (!editInventoryLineId) return
    setRemovingFromInventory(true)
    try {
      await apiDelete(`/api/inventory/${characterId}/items/${editInventoryLineId}`, token)
      setRemoveFromInventoryConfirmOpen(false)
      setIsEditItemModalOpen(false)
      setEditItemId(null)
      setEditInventoryLineId(null)
      setInventoryLoaded(false)
      showSnackbar({ message: 'Objet supprimé de l’inventaire.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression inventaire',
        severity: 'error',
      })
    } finally {
      setRemovingFromInventory(false)
    }
  }

  async function loadDndEquipment(params: { q: string; page: number }) {
    setDndEquipmentLoading(true)
    try {
      const res = await apiGet<{
        items: Dnd5eEquipmentListItem[]
        pagination: { page: number; totalPages: number }
      }>(`/api/dnd5e/equipment?q=${encodeURIComponent(params.q)}&page=${params.page}&limit=20`, token)
      setDndEquipmentItems(res.items ?? [])
      setDndEquipmentPage(res.pagination?.page ?? params.page)
      setDndEquipmentTotalPages(res.pagination?.totalPages ?? 1)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement équipements',
        severity: 'error',
      })
    } finally {
      setDndEquipmentLoading(false)
    }
  }

  async function openDndEquipmentModal() {
    if (!canImportDndEquipment) return
    closeDndCatalogDetail()
    setIsDndEquipmentModalOpen(true)
    setDndImportTab('equipment')
    setDndEquipmentQuery('')
    setDndEquipmentItems([])
    setDndEquipmentPage(1)
    setDndEquipmentTotalPages(1)
    setDndMagicQuery('')
    setDndMagicItems([])
    setDndMagicPage(1)
    setDndMagicTotalPages(1)
    await loadDndEquipment({ q: '', page: 1 })
  }

  async function loadDndMagicItems(params: { q: string; page: number }) {
    setDndMagicLoading(true)
    try {
      const res = await apiGet<{
        items: Dnd5eMagicItemListItem[]
        pagination: { page: number; totalPages: number }
      }>(`/api/dnd5e/magic-items?q=${encodeURIComponent(params.q)}&page=${params.page}&limit=20`, token)
      setDndMagicItems(res.items ?? [])
      setDndMagicPage(res.pagination?.page ?? params.page)
      setDndMagicTotalPages(res.pagination?.totalPages ?? 1)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement objets magiques',
        severity: 'error',
      })
    } finally {
      setDndMagicLoading(false)
    }
  }

  async function handleDndImportTabChange(tab: 'equipment' | 'magic') {
    setDndImportTab(tab)
    if (tab === 'magic') {
      setDndMagicItems([])
      setDndMagicPage(1)
      await loadDndMagicItems({ q: dndMagicQuery, page: 1 })
    } else {
      setDndEquipmentItems([])
      setDndEquipmentPage(1)
      await loadDndEquipment({ q: dndEquipmentQuery, page: 1 })
    }
  }

  async function handleAddDndEquipment(equipmentId: number) {
    setDndEquipmentAddingId(equipmentId)
    try {
      await apiPost(`/api/dnd5e/characters/${characterId}/inventory`, { equipment_id: equipmentId }, token)
      setInventoryLoaded(false)
      showSnackbar({ message: 'Équipement ajouté à l’inventaire.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur ajout équipement',
        severity: 'error',
      })
    } finally {
      setDndEquipmentAddingId(null)
    }
  }

  async function handleAddDndMagicItem(magicItemId: number) {
    setDndMagicAddingId(magicItemId)
    try {
      await apiPost(`/api/dnd5e/characters/${characterId}/inventory/magic-item`, { magic_item_id: magicItemId }, token)
      setInventoryLoaded(false)
      showSnackbar({ message: 'Objet magique ajouté à l’inventaire.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur ajout objet magique',
        severity: 'error',
      })
    } finally {
      setDndMagicAddingId(null)
    }
  }

  function toggleTypeFilter(typeValue: string) {
    const normalized = typeValue.trim().toLowerCase()
    if (!normalized) return
    setSelectedTypes((prev) =>
      prev.includes(normalized) ? prev.filter((entry) => entry !== normalized) : [...prev, normalized],
    )
  }

  return (
    <div>
      {inventoryLoading && <p>Chargement inventaire...</p>}

      {!inventoryLoading && (
        <>
          <details className="character-skills-accordion inventory-purse-accordion">
            <summary className="character-skills-accordion-summary">
              <span>Bourse</span>
              <span className="inventory-purse-summary-po">
                {computeDraftGoldValue(purseDraft).toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                po
                {purseSyncing ? <span className="inventory-purse-syncing"> · …</span> : null}
              </span>
            </summary>
            <div className="character-skills-accordion-panel">
              <div className="purse-row">
                <label htmlFor="purse-platinum">Platine</label>
                <label htmlFor="purse-gold">Or</label>
                <label htmlFor="purse-electrum">Électrum</label>
                <label htmlFor="purse-silver">Argent</label>
                <label htmlFor="purse-copper">Cuivre</label>

                <input
                  id="purse-platinum"
                  type="number"
                  min={0}
                  value={purseDraft?.platinum ?? '0'}
                  onChange={(event) => {
                    setPurseDraft((prev) => {
                      const base = prev ?? { copper: '0', silver: '0', electrum: '0', gold: '0', platinum: '0' }
                      const next = { ...base, platinum: event.target.value }
                      purseDraftRef.current = next
                      return next
                    })
                    schedulePursePersist()
                  }}
                  onBlur={flushPursePersist}
                />
                <input
                  id="purse-gold"
                  type="number"
                  min={0}
                  value={purseDraft?.gold ?? '0'}
                  onChange={(event) => {
                    setPurseDraft((prev) => {
                      const base = prev ?? { copper: '0', silver: '0', electrum: '0', gold: '0', platinum: '0' }
                      const next = { ...base, gold: event.target.value }
                      purseDraftRef.current = next
                      return next
                    })
                    schedulePursePersist()
                  }}
                  onBlur={flushPursePersist}
                />
                <input
                  id="purse-electrum"
                  type="number"
                  min={0}
                  value={purseDraft?.electrum ?? '0'}
                  onChange={(event) => {
                    setPurseDraft((prev) => {
                      const base = prev ?? { copper: '0', silver: '0', electrum: '0', gold: '0', platinum: '0' }
                      const next = { ...base, electrum: event.target.value }
                      purseDraftRef.current = next
                      return next
                    })
                    schedulePursePersist()
                  }}
                  onBlur={flushPursePersist}
                />
                <input
                  id="purse-silver"
                  type="number"
                  min={0}
                  value={purseDraft?.silver ?? '0'}
                  onChange={(event) => {
                    setPurseDraft((prev) => {
                      const base = prev ?? { copper: '0', silver: '0', electrum: '0', gold: '0', platinum: '0' }
                      const next = { ...base, silver: event.target.value }
                      purseDraftRef.current = next
                      return next
                    })
                    schedulePursePersist()
                  }}
                  onBlur={flushPursePersist}
                />
                <input
                  id="purse-copper"
                  type="number"
                  min={0}
                  value={purseDraft?.copper ?? '0'}
                  onChange={(event) => {
                    setPurseDraft((prev) => {
                      const base = prev ?? { copper: '0', silver: '0', electrum: '0', gold: '0', platinum: '0' }
                      const next = { ...base, copper: event.target.value }
                      purseDraftRef.current = next
                      return next
                    })
                    schedulePursePersist()
                  }}
                  onBlur={flushPursePersist}
                />
              </div>
            </div>
          </details>

          <h4>Items possedes</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={() => void openCreateItemModal()}>
              Créer un item
            </button>
            {canImportDndEquipment ? (
              <button className="btn btn-secondary" type="button" onClick={() => void openDndEquipmentModal()}>
                Importer (SRD D&D)
              </button>
            ) : null}
          </div>

          <div className="inventory-search-row">
            <input
              className="inventory-search-input"
              type="search"
              placeholder="Rechercher un item..."
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
            />
            <button
              className={`btn btn-secondary inventory-filter-btn${inventoryFiltersOpen ? ' active' : ''}`}
              type="button"
              onClick={() => setInventoryFiltersOpen((prev) => !prev)}
              title="Filtres"
              aria-label="Filtres"
            >
              <Funnel size={18} aria-hidden="true" />
            </button>
          </div>

          {inventoryFiltersOpen ? (
            <div className="inventory-filters-panel">
              <div className="inventory-filters-head">
                <span className="inventory-filters-title">Type</span>
                {selectedTypes.length > 0 ? (
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => setSelectedTypes([])}
                  >
                    Réinitialiser
                  </button>
                ) : null}
              </div>
              <div className="inventory-filter-tags">
                {availableTypes.length === 0 ? (
                  <span className="inventory-filter-empty">Aucun type</span>
                ) : (
                  availableTypes.map((typeValue) => {
                    const icon = getItemTypeIcon(typeValue)
                    const selected = selectedTypes.includes(typeValue)
                    return (
                      <button
                        key={typeValue}
                        type="button"
                        className={`inventory-type-filter ${selected ? 'active' : ''}`}
                        aria-pressed={selected}
                        title={icon?.label || typeValue}
                        onClick={() => toggleTypeFilter(typeValue)}
                      >
                        <span className={`inventory-type-filter-icon ${selected ? 'active' : ''}`}>
                          {icon?.icon ?? <Shapes size={18} aria-hidden="true" />}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}

          {inventoryItems.length === 0 ? (
            <p>Aucun item dans l’inventaire.</p>
          ) : filteredInventoryItems.length === 0 ? (
            <p>Aucun item ne correspond à la recherche ou aux filtres.</p>
          ) : (
            <div className="table-wrap inventory-table-wrap">
              <table className="table inventory-items-table">
                <thead>
                  <tr>
                    <th className="inventory-name-col">Nom</th>
                    <th className="inventory-qty-col">Qty</th>
                    <th className="inventory-equipped-col">Équipé</th>
                    <th className="inventory-drag-handle-th" aria-label="Réordonner" title="Réordonner">
                      <GripVertical size={16} aria-hidden="true" className="inventory-drag-header-icon" />
                    </th>
                    <th className="inventory-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventoryItems.map((item) => (
                    <tr
                      key={item.id}
                      data-inventory-line-id={String(item.id)}
                      className={[
                        item.item_id ? 'clickable-row' : '',
                        draggingInventoryId === item.id ? 'inventory-row-dragging' : '',
                        draggingInventoryId != null &&
                        dragOverInventoryId === item.id &&
                        draggingInventoryId !== item.id
                          ? 'inventory-row-drag-over'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        if (skipNextInventoryRowClickRef.current) return
                        if (!item.item_id) return
                        const idx = typeof item.index === 'string' ? item.index.trim() : ''
                        // `Item.index` est utilisé aussi pour les items custom (ex: `__manual__...`) :
                        // on n'ouvre la fiche SRD que pour les vrais index SRD.
                        const looksLikeSrdIndex =
                          Boolean(idx) && !idx.includes('__manual__') && !idx.includes('__copy__')
                        if (looksLikeSrdIndex) {
                          if (isDnd5eMagicItemProperties(item.properties)) void openDndCatalogMagicDetail(idx)
                          else void openDndCatalogEquipmentDetail(idx)
                          return
                        }
                        void openItemDetailsModal(item)
                      }}
                    >
                      <td className="inventory-name-col" data-label="Nom">
                        <span className="inventory-item-name">
                          {(() => {
                            const icon = getItemTypeIcon(item.type)
                            return icon ? (
                              <span className="inventory-item-type-icon" title={icon.label} aria-label={icon.label}>
                                {icon.icon}
                              </span>
                            ) : null
                          })()}
                          <span>{item.name ?? '—'}</span>
                        </span>
                      </td>
                      <td className="inventory-qty-col" data-label="Qty">
                        <div className="inventory-qty-control" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="inventory-qty-step"
                            disabled={savingQuantityId === item.id}
                            onClick={() => void handleInventoryQuantityStep(item.id, -1)}
                            aria-label={`Diminuer la quantité de ${item.name ?? 'cet objet'}`}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="inventory-qty-input"
                            min={0}
                            disabled={savingQuantityId === item.id}
                            value={inventoryQuantityDraft[item.id] ?? String(item.quantity)}
                            onChange={(event) =>
                              setInventoryQuantityDraft((d) => ({
                                ...d,
                                [item.id]: event.target.value,
                              }))
                            }
                            onBlur={() => void handleInventoryQuantityBlur(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                ;(event.target as HTMLInputElement).blur()
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="inventory-qty-step"
                            disabled={savingQuantityId === item.id}
                            onClick={() => void handleInventoryQuantityStep(item.id, 1)}
                            aria-label={`Augmenter la quantité de ${item.name ?? 'cet objet'}`}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="inventory-equipped-col" data-label="Équipé">
                        <input
                          type="checkbox"
                          checked={Boolean(item.is_equipped)}
                          disabled={!isEquipableItemType(item.type)}
                          title={
                            !isEquipableItemType(item.type)
                              ? 'Disponible uniquement pour armor, weapon, gear, consumable et ammunition'
                              : undefined
                          }
                          onChange={(event) => {
                            event.stopPropagation()
                            void handleToggleEquipped(item, event.target.checked)
                          }}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td
                        data-label="Ordre"
                        className="inventory-drag-handle-col"
                        onPointerDown={(event) =>
                          handleInventoryReorderPointerDown(event, item.id)
                        }
                        onPointerMove={handleInventoryReorderPointerMove}
                        onPointerUp={clearInventoryReorderPointer}
                        onPointerCancel={abortInventoryReorderPointer}
                        onLostPointerCapture={(event) => {
                          const st = reorderPointerRef.current
                          if (!st || st.pointerId !== event.pointerId) return
                          reorderPointerRef.current = null
                          dragOverInventoryIdRef.current = null
                          setDraggingInventoryId(null)
                          setDragOverInventoryId(null)
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span
                          className="inventory-drag-handle"
                          title={
                            canReorderInventory
                              ? 'Glisser pour réordonner'
                              : 'Réordonner : retirez recherche et filtres'
                          }
                        >
                          <GripVertical size={18} aria-hidden="true" />
                        </span>
                      </td>
                      <td data-label="Actions" className="inventory-actions-col">
                        <button
                          className="btn btn-secondary btn-small"
                          type="button"
                          disabled={!item.item_id}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (item.item_id) void openEditItemModal({ itemId: item.item_id, inventoryLineId: item.id })
                          }}
                        >
                          Éditer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {isCreateItemModalOpen && (
        <div className="modal-backdrop" onClick={() => (!createItemSaving ? setIsCreateItemModalOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Créer un item</h3>
            <form className="login-form" onSubmit={handleCreateAndLinkItem}>
              <span className="create-item-kind-label">Type d&apos;objet</span>
              <div className="tabs-row create-item-kind-tabs" role="group" aria-label="Type d'objet">
                <button
                  type="button"
                  className={`tab-btn ${createItemKind === 'normal' ? 'active' : ''}`}
                  onClick={() => {
                    setCreateItemKind('normal')
                    setNewItemForm((prev) => ({ ...prev, rarity: '' }))
                  }}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`tab-btn ${createItemKind === 'magic' ? 'active' : ''}`}
                  onClick={() => setCreateItemKind('magic')}
                >
                  Magique
                </button>
              </div>

              <label htmlFor="new-item-name">Nom</label>
              <input
                id="new-item-name"
                type="text"
                required
                value={newItemForm.name}
                onChange={(event) => setNewItemForm((prev) => ({ ...prev, name: event.target.value }))}
              />

              <label htmlFor="new-item-type">Type</label>
              <select id="new-item-type" value={newItemForm.type} onChange={(event) => setNewItemForm((prev) => ({ ...prev, type: event.target.value }))}>
                {DND5E_ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <label htmlFor="new-item-category">Catégorie</label>
              <input
                id="new-item-category"
                type="text"
                list="new-item-category-suggestions"
                value={newItemForm.category}
                onChange={(event) => setNewItemForm((prev) => ({ ...prev, category: event.target.value }))}
              />
              <datalist id="new-item-category-suggestions">
                {ITEM_CATEGORY_SUGGESTIONS.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>

              <label htmlFor="new-item-subcategory">Sous-catégorie</label>
              <input
                id="new-item-subcategory"
                type="text"
                list="new-item-subcategory-suggestions"
                value={newItemForm.subcategory}
                onChange={(event) => setNewItemForm((prev) => ({ ...prev, subcategory: event.target.value }))}
              />
              <datalist id="new-item-subcategory-suggestions">
                {ITEM_SUBCATEGORY_SUGGESTIONS.map((subcategory) => (
                  <option key={subcategory} value={subcategory} />
                ))}
              </datalist>

              {createItemKind === 'magic' ? (
                <>
                  <label htmlFor="new-item-rarity">Rareté</label>
                  <input
                    id="new-item-rarity"
                    type="text"
                    placeholder="Ex. Peu commun, Rare, Très rare…"
                    value={newItemForm.rarity}
                    onChange={(event) => setNewItemForm((prev) => ({ ...prev, rarity: event.target.value }))}
                  />
                </>
              ) : null}

              <label htmlFor="new-item-cost">Coût</label>
              <input id="new-item-cost" type="text" placeholder="Ex. 15 gp" value={newItemForm.cost} onChange={(event) => setNewItemForm((prev) => ({ ...prev, cost: event.target.value }))} />

              <label htmlFor="new-item-weight">Poids (kg)</label>
              <input
                id="new-item-weight"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="ex. 1 ou 0,5"
                value={newItemForm.weight}
                onChange={(event) => setNewItemForm((prev) => ({ ...prev, weight: event.target.value }))}
              />

              <label htmlFor="new-item-description">Description</label>
              <textarea id="new-item-description" rows={3} value={newItemForm.description} onChange={(event) => setNewItemForm((prev) => ({ ...prev, description: event.target.value }))} />

              <label htmlFor="new-item-quantity">Quantité</label>
              <input id="new-item-quantity" type="number" min={0} value={newItemForm.quantity} onChange={(event) => setNewItemForm((prev) => ({ ...prev, quantity: event.target.value }))} />

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn" type="submit" disabled={createItemSaving}>
                  {createItemSaving ? 'Création...' : 'Créer et ajouter'}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={createItemSaving}
                  onClick={() => {
                    setIsCreateItemModalOpen(false)
                    resetNewItemForm()
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isItemDetailsModalOpen && (
        <ItemDetailsModal
          open={isItemDetailsModalOpen}
          loading={itemDetailsLoading}
          itemDetails={itemDetails}
          onClose={() => {
            setIsItemDetailsModalOpen(false)
            setItemDetailsInventoryLineId(null)
          }}
          onEdit={() => {
            if (!itemDetails?.id || !itemDetailsInventoryLineId) return
            setIsItemDetailsModalOpen(false)
            void openEditItemModal({ itemId: itemDetails.id, inventoryLineId: itemDetailsInventoryLineId })
          }}
          editDisabled={!itemDetails?.id || !itemDetailsInventoryLineId}
        />
      )}

      {isEditItemModalOpen && (
        <ItemEditModal
          open={isEditItemModalOpen}
          loading={editItemLoading}
          saving={editItemSaving}
          form={editItemForm}
          setForm={setEditItemForm}
          itemTypes={DND5E_ITEM_TYPES}
          onSubmit={handleSaveEditedItem}
          onClose={() => {
            if (!editItemSaving) {
              setIsEditItemModalOpen(false)
              setEditItemId(null)
            }
          }}
          onOpenRemoveConfirm={() => setRemoveFromInventoryConfirmOpen(true)}
        />
      )}

      <RemoveFromInventoryConfirmModal
        open={removeFromInventoryConfirmOpen}
        removing={removingFromInventory}
        onClose={() => {
          if (!removingFromInventory) setRemoveFromInventoryConfirmOpen(false)
        }}
        onConfirm={() => void handleRemoveFromInventory()}
      />

      {isDndEquipmentModalOpen && canImportDndEquipment && (
        <>
        <div
          className="modal-backdrop"
          onClick={() => {
            if (dndCatalogDetailOpen) return
            if (
              !dndEquipmentLoading &&
              !dndMagicLoading &&
              dndEquipmentAddingId == null &&
              dndMagicAddingId == null
            ) {
              closeDndCatalogDetail()
              setIsDndEquipmentModalOpen(false)
            }
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Importer depuis le SRD (D&D 5e)</h3>
            <div className="dnd-import-tabs" style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-small ${dndImportTab === 'equipment' ? '' : 'btn-secondary'}`}
                type="button"
                disabled={dndEquipmentLoading || dndMagicLoading}
                onClick={() => void handleDndImportTabChange('equipment')}
              >
                Équipement
              </button>
              <button
                className={`btn btn-small ${dndImportTab === 'magic' ? '' : 'btn-secondary'}`}
                type="button"
                disabled={dndEquipmentLoading || dndMagicLoading}
                onClick={() => void handleDndImportTabChange('magic')}
              >
                Objets magiques
              </button>
            </div>

            {dndImportTab === 'equipment' ? (
              <>
                <form
                  className="login-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void loadDndEquipment({ q: dndEquipmentQuery, page: 1 })
                  }}
                >
                  <label htmlFor="dnd-eq-search">Recherche</label>
                  <input
                    id="dnd-eq-search"
                    type="text"
                    placeholder="Ex. longsword, shield…"
                    value={dndEquipmentQuery}
                    onChange={(event) => setDndEquipmentQuery(event.target.value)}
                    disabled={dndEquipmentLoading}
                  />

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" type="submit" disabled={dndEquipmentLoading}>
                      {dndEquipmentLoading ? 'Recherche…' : 'Rechercher'}
                    </button>
                    <button className="btn btn-secondary" type="button" disabled={dndEquipmentLoading} onClick={() => void loadDndEquipment({ q: '', page: 1 })}>
                      Réinitialiser
                    </button>
                  </div>
                </form>

                {dndEquipmentLoading ? <p>Chargement…</p> : null}

                {!dndEquipmentLoading && dndEquipmentItems.length === 0 ? <p>Aucun résultat.</p> : null}

                {!dndEquipmentLoading && dndEquipmentItems.length > 0 ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Type</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dndEquipmentItems.map((eq) => (
                          <tr
                            key={eq.id}
                            className="clickable-row"
                            title="Cliquer pour la fiche complète"
                            onClick={() => void openDndCatalogEquipmentDetail(eq.index)}
                          >
                            <td>{eq.name}</td>
                            <td>{eq.type}</td>
                            <td>
                              <button
                                className="btn btn-small"
                                type="button"
                                disabled={dndEquipmentAddingId === eq.id}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleAddDndEquipment(eq.id)
                                }}
                              >
                                {dndEquipmentAddingId === eq.id ? 'Ajout…' : 'Ajouter'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={dndEquipmentLoading || dndEquipmentPage <= 1}
                    onClick={() => void loadDndEquipment({ q: dndEquipmentQuery, page: dndEquipmentPage - 1 })}
                  >
                    Précédent
                  </button>
                  <span style={{ color: 'var(--muted)' }}>
                    Page {dndEquipmentPage} / {dndEquipmentTotalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={dndEquipmentLoading || dndEquipmentPage >= dndEquipmentTotalPages}
                    onClick={() => void loadDndEquipment({ q: dndEquipmentQuery, page: dndEquipmentPage + 1 })}
                  >
                    Suivant
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={dndEquipmentLoading || dndEquipmentAddingId != null || dndCatalogDetailOpen}
                    onClick={() => {
                      closeDndCatalogDetail()
                      setIsDndEquipmentModalOpen(false)
                    }}
                  >
                    Retour
                  </button>
                </div>
              </>
            ) : (
              <>
                <form
                  className="login-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void loadDndMagicItems({ q: dndMagicQuery, page: 1 })
                  }}
                >
                  <label htmlFor="dnd-magic-search">Recherche</label>
                  <input
                    id="dnd-magic-search"
                    type="text"
                    placeholder="Ex. bag of holding, flame tongue…"
                    value={dndMagicQuery}
                    onChange={(event) => setDndMagicQuery(event.target.value)}
                    disabled={dndMagicLoading}
                  />

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" type="submit" disabled={dndMagicLoading}>
                      {dndMagicLoading ? 'Recherche…' : 'Rechercher'}
                    </button>
                    <button className="btn btn-secondary" type="button" disabled={dndMagicLoading} onClick={() => void loadDndMagicItems({ q: '', page: 1 })}>
                      Réinitialiser
                    </button>
                  </div>
                </form>

                {dndMagicLoading ? <p>Chargement…</p> : null}

                {!dndMagicLoading && dndMagicItems.length === 0 ? (
                  <p>Aucun résultat. Exécutez l’import backend : npm run import-dnd5e-magic-items</p>
                ) : null}

                {!dndMagicLoading && dndMagicItems.length > 0 ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Catégorie</th>
                          <th>Rareté</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dndMagicItems.map((m) => (
                          <tr
                            key={m.id}
                            className="clickable-row"
                            title="Cliquer pour la fiche complète"
                            onClick={() => void openDndCatalogMagicDetail(m.index)}
                          >
                            <td>{m.name}</td>
                            <td>{m.categoryName ?? m.categoryIndex ?? '—'}</td>
                            <td>{m.rarity ?? '—'}</td>
                            <td>
                              <button
                                className="btn btn-small"
                                type="button"
                                disabled={dndMagicAddingId === m.id}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleAddDndMagicItem(m.id)
                                }}
                              >
                                {dndMagicAddingId === m.id ? 'Ajout…' : 'Ajouter'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={dndMagicLoading || dndMagicPage <= 1}
                    onClick={() => void loadDndMagicItems({ q: dndMagicQuery, page: dndMagicPage - 1 })}
                  >
                    Précédent
                  </button>
                  <span style={{ color: 'var(--muted)' }}>
                    Page {dndMagicPage} / {dndMagicTotalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={dndMagicLoading || dndMagicPage >= dndMagicTotalPages}
                    onClick={() => void loadDndMagicItems({ q: dndMagicQuery, page: dndMagicPage + 1 })}
                  >
                    Suivant
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={dndMagicLoading || dndMagicAddingId != null || dndCatalogDetailOpen}
                    onClick={() => {
                      closeDndCatalogDetail()
                      setIsDndEquipmentModalOpen(false)
                    }}
                  >
                    Retour
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {dndCatalogDetailOpen ? (
          <div
            className="modal-backdrop modal-backdrop-stacked"
            onClick={() => {
              if (!dndCatalogDetailLoading) closeDndCatalogDetail()
            }}
          >
            <div className="modal-card modal-card-srd-detail" onClick={(event) => event.stopPropagation()}>
              <h3>
                {dndCatalogDetailLoading
                  ? 'Fiche SRD'
                  : dndCatalogDetail?.kind === 'magic'
                    ? 'Objet magique (SRD)'
                    : 'Équipement (SRD)'}
              </h3>
              {dndCatalogDetailLoading ? <p>Chargement…</p> : null}

              {!dndCatalogDetailLoading && dndCatalogDetail?.kind === 'equipment' ? (
                <div className="item-details">
                  <p>
                    <strong>Index</strong> {dndCatalogDetail.data.index}
                  </p>
                  <p>
                    <strong>Nom</strong> {dndCatalogDetail.data.name}
                  </p>
                  <p>
                    <strong>Type</strong> {dndCatalogDetail.data.type ?? '—'}
                  </p>
                  <p>
                    <strong>Catégorie</strong> {dndCatalogDetail.data.category ?? '—'}
                  </p>
                  <p>
                    <strong>Sous-catégorie</strong> {dndCatalogDetail.data.subcategory ?? '—'}
                  </p>
                  <p>
                    <strong>Coût</strong> {dndCatalogDetail.data.cost ?? '—'}
                  </p>
                  <p>
                    <strong>Poids</strong> {dndCatalogDetail.data.weight ?? '—'}
                  </p>
                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    <strong>Description</strong>{' '}
                    {dndCatalogDetail.data.description?.trim() ? dndCatalogDetail.data.description : '—'}
                  </p>
                  <p>
                    <strong>Dégâts</strong> {dndCatalogDetail.data.damage ?? '—'}{' '}
                    {dndCatalogDetail.data.damageType ? `(${dndCatalogDetail.data.damageType})` : ''}
                  </p>
                  <p>
                    <strong>Portée</strong> {dndCatalogDetail.data.range ?? '—'}
                  </p>
                  <p>
                    <strong>CA</strong> {dndCatalogDetail.data.armorClass ?? '—'}
                  </p>
                  <p>
                    <strong>Désavantage discrétion</strong>{' '}
                    {dndCatalogDetail.data.stealthDisadvantage == null
                      ? '—'
                      : dndCatalogDetail.data.stealthDisadvantage
                        ? 'Oui'
                        : 'Non'}
                  </p>
                  <p>
                    <strong>Propriétés</strong>
                  </p>
                  <pre className="srd-raw-json">
                    {dndCatalogDetail.data.properties == null
                      ? '—'
                      : formatJsonOrDash(dndCatalogDetail.data.properties)}
                  </pre>
                </div>
              ) : null}

              {!dndCatalogDetailLoading && dndCatalogDetail?.kind === 'magic' ? (
                <div className="item-details">
                  <p>
                    <strong>Index</strong> {dndCatalogDetail.data.index}
                  </p>
                  <p>
                    <strong>Nom</strong> {dndCatalogDetail.data.name}
                  </p>
                  <p>
                    <strong>Catégorie</strong>{' '}
                    {dndCatalogDetail.data.categoryName ?? dndCatalogDetail.data.categoryIndex ?? '—'}
                  </p>
                  <p>
                    <strong>Rareté</strong> {dndCatalogDetail.data.rarity ?? '—'}
                  </p>
                  <p>
                    <strong>Variante</strong> {dndCatalogDetail.data.variant ? 'Oui' : 'Non'}
                  </p>
                  <p>
                    <strong>Variantes (liste API)</strong>
                  </p>
                  <pre className="srd-raw-json">
                    {dndCatalogDetail.data.variants == null ? '—' : formatJsonOrDash(dndCatalogDetail.data.variants)}
                  </pre>
                  <p>
                    <strong>Image (chemin API)</strong> {dndCatalogDetail.data.image ?? '—'}
                  </p>
                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    <strong>Description</strong>{' '}
                    {dndCatalogDetail.data.description?.trim() ? dndCatalogDetail.data.description : '—'}
                  </p>
                  <p>
                    <strong>Données brutes (JSON)</strong>
                  </p>
                  <pre className="srd-raw-json">{formatJsonOrDash(dndCatalogDetail.data.raw)}</pre>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={dndCatalogDetailLoading}
                  onClick={closeDndCatalogDetail}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        ) : null}
        </>
      )}
    </div>
  )
}

