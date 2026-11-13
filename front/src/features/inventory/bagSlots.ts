// Vue « sac » de l'inventaire : n° de case = sort_order de la ligne (les trous sont permis).

export type BagItem = {
  id: number
  name: string
  quantity: number
  is_equipped: boolean
  sort_order?: number
  type?: string | null
  image_url?: string | null
}

export type BagSlotChange = { id: number; slot: number }

export const BAG_COLUMNS = 8
const EXTRA_ROWS = 3

/** Case de chaque objet = son sort_order ; en cas de doublon, la case libre suivante. */
export function placeBagItems<T extends BagItem>(items: T[]): Map<number, T> {
  const bySlot = new Map<number, T>()
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
  for (const item of sorted) {
    let slot = Math.max(0, item.sort_order ?? 0)
    while (bySlot.has(slot)) slot++
    bySlot.set(slot, item)
  }
  return bySlot
}

/** Toujours EXTRA_ROWS rangées vides sous la rangée du dernier objet placé. */
export function bagRowCount(bySlot: Map<number, unknown>): number {
  const last = bySlot.size ? Math.max(...bySlot.keys()) : -1
  return (last >= 0 ? Math.floor(last / BAG_COLUMNS) + 1 : 0) + EXTRA_ROWS
}

/** Lâcher l'objet de la case `from` sur la case `to` : déplacement, ou échange si elle est occupée. */
export function bagMoveChanges(bySlot: Map<number, BagItem>, from: number, to: number): BagSlotChange[] {
  const moved = bySlot.get(from)
  if (!moved || from === to) return []
  const occupant = bySlot.get(to)
  return occupant ? [{ id: moved.id, slot: to }, { id: occupant.id, slot: from }] : [{ id: moved.id, slot: to }]
}
