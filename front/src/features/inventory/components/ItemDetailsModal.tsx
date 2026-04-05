import { MarkdownContent } from '../../../shared/components/MarkdownContent'
import { translateItemCategory, translateItemSubcategory, translateItemType } from '../../../shared/inventory/itemDisplayLabels'

export type ItemDetail = {
  id: number
  index?: string
  name: string
  type?: string
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
  /** `custom` | `dnd5e` — aligné sur le modèle Prisma `Item`. */
  source?: string | null
  isActive?: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

function formatWeaponPropertyNames(raw: unknown): string {
  const names: string[] = []
  const pushFromArray = (arr: unknown) => {
    if (!Array.isArray(arr)) return
    for (const p of arr) {
      if (!p) continue
      if (typeof p === 'string') names.push(p)
      else if (typeof p === 'object') {
        const o = p as Record<string, unknown>
        if (typeof o.name === 'string') names.push(o.name)
      }
    }
  }
  if (raw == null) return '—'
  if (Array.isArray(raw)) {
    pushFromArray(raw)
    return names.length ? names.join(', ') : '—'
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    pushFromArray(obj.properties)
    if (names.length) return names.join(', ')
  }
  return '—'
}

function formatWeaponRange(rangeValue: unknown): string {
  if (rangeValue == null) return '—'
  if (typeof rangeValue === 'number') return String(rangeValue)

  const tryFormatObject = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object') return null
    const o = obj as Record<string, unknown>
    const normal = o.normal
    const long = o.long
    const n = typeof normal === 'number' ? normal : typeof normal === 'string' ? Number(normal) : NaN
    const l = typeof long === 'number' ? long : typeof long === 'string' ? Number(long) : NaN
    if (!Number.isNaN(n) && !Number.isNaN(l)) return `${n}/${l}`
    if (!Number.isNaN(n)) return String(n)
    return null
  }

  if (typeof rangeValue === 'object') {
    return tryFormatObject(rangeValue) ?? '—'
  }

  if (typeof rangeValue === 'string') {
    const s = rangeValue.trim()
    if (!s) return '—'
    try {
      const parsed = JSON.parse(s) as unknown
      const formatted = tryFormatObject(parsed)
      if (formatted) return formatted
    } catch {
      // keep fallback below
    }
    return s
  }

  return String(rangeValue)
}

function extractArmorClass(value: unknown): { base: number | null; dexBonus: boolean | null } {
  const tryFromObj = (obj: unknown): { base: number | null; dexBonus: boolean | null } | null => {
    if (!obj || typeof obj !== 'object') return null
    const o = obj as Record<string, unknown>
    const armorClass = o.armor_class
    if (!armorClass || typeof armorClass !== 'object') return null
    const ac = armorClass as Record<string, unknown>
    const base = typeof ac.base === 'number' ? ac.base : null
    const dexBonus = typeof ac.dex_bonus === 'boolean' ? ac.dex_bonus : null
    if (base == null && dexBonus == null) return null
    return { base, dexBonus }
  }

  if (value == null) return { base: null, dexBonus: null }
  if (typeof value === 'object') return tryFromObj(value) ?? { base: null, dexBonus: null }
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return { base: null, dexBonus: null }
    try {
      return tryFromObj(JSON.parse(s)) ?? { base: null, dexBonus: null }
    } catch {
      return { base: null, dexBonus: null }
    }
  }
  return { base: null, dexBonus: null }
}

export function ItemDetailsModal(props: {
  open: boolean
  loading: boolean
  itemDetails: ItemDetail | null
  onClose: () => void
  onEdit?: () => void
  editDisabled?: boolean
  /** Session live : ouvre le flux de transfert vers un autre personnage (inventaire). */
  onTransfer?: () => void
  transferDisabled?: boolean
}) {
  const { open, loading, itemDetails, onClose, onEdit, editDisabled, onTransfer, transferDisabled } = props

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={() => !loading && onClose()}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {loading ? <p>Chargement…</p> : null}
        {!loading && itemDetails ? (
          <>
            <div className="item-details-header">
              <div>
                <div className="item-details-header-name" style={{ fontSize: '1.12rem' }}>
                  {itemDetails.name}
                </div>
                <div className="item-details-header-submeta">
                  {itemDetails.cost ?? '—'} · {itemDetails.weight != null ? `${itemDetails.weight} kg` : '—'}
                </div>
              </div>
              <div className="item-details-header-meta">
                <span className="item-details-header-type" title="Type">
                  {translateItemType(itemDetails.type)}
                </span>
                <span className="item-details-header-type">{translateItemCategory(itemDetails.category)}</span>
                <span className="item-details-header-type" style={{ fontSize: '0.78rem', opacity: 0.92 }}>
                  {itemDetails.subcategory?.trim() ? translateItemSubcategory(itemDetails.subcategory) : '—'}
                </span>
              </div>
            </div>

            {String(itemDetails.type ?? '')
              .trim()
              .toLowerCase() === 'armor' ? (
              <>
                <div className="item-details">
                  <p>
                    <strong>CA</strong>{' '}
                    <strong>
                      {(() => {
                        const fromRaw = extractArmorClass(itemDetails.raw)
                        const fromProps = extractArmorClass(itemDetails.properties)
                        const base =
                          fromRaw.base ??
                          fromProps.base ??
                          (typeof itemDetails.armorClass === 'number' ? itemDetails.armorClass : null)
                        return base ?? '—'
                      })()}
                    </strong>{' '}
                    {itemDetails.stealthDisadvantage ? (
                      <>
                        <span style={{ color: 'var(--muted)' }}> · </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                          Désavantage discrétion
                        </span>
                      </>
                    ) : null}
                    {(() => {
                      const fromRaw = extractArmorClass(itemDetails.raw)
                      const fromProps = extractArmorClass(itemDetails.properties)
                      const dexBonus = fromRaw.dexBonus ?? fromProps.dexBonus ?? null
                      return dexBonus ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>+Dex</span>
                      ) : null
                    })()}
                    {itemDetails.subcategory?.trim() ? (
                      <>
                        <span style={{ color: 'var(--muted)' }}> · </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                          {translateItemSubcategory(itemDetails.subcategory)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <hr
                  style={{
                    border: 0,
                    borderTop: '1px solid var(--border)',
                    opacity: 0.7,
                    margin: '0.75rem 0',
                  }}
                />
              </>
            ) : null}

            {String(itemDetails.type ?? '')
              .trim()
              .toLowerCase() === 'weapon' ? (
              <>
                <div className="item-details">
                  <p>
                    <strong>{itemDetails.damage ?? '—'}</strong>{' '}
                    {itemDetails.damageType ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                        {itemDetails.damageType}
                      </span>
                    ) : null}
                    <span style={{ color: 'var(--muted)' }}> · </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                      {formatWeaponRange(itemDetails.range)}
                    </span>
                    <span style={{ color: 'var(--muted)' }}> · </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                      {formatWeaponPropertyNames(itemDetails.properties)}
                    </span>
                  </p>
                </div>
                <hr
                  style={{
                    border: 0,
                    borderTop: '1px solid var(--border)',
                    opacity: 0.7,
                    margin: '0.75rem 0',
                  }}
                />
              </>
            ) : null}

            <div className="item-details">
              <MarkdownContent content={itemDetails.description} />
            </div>
          </>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {onEdit ? (
            <button className="btn" type="button" disabled={loading || editDisabled} onClick={onEdit}>
              Éditer
            </button>
          ) : null}
          {onTransfer ? (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={loading || transferDisabled}
              onClick={onTransfer}
            >
              Transférer
            </button>
          ) : null}
          <button className="btn btn-secondary" type="button" disabled={loading} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

