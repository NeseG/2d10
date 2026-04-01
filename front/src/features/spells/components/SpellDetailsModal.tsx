import { MarkdownContent } from '../../../shared/components/MarkdownContent'

export type SpellDetail = {
  id: number
  index?: string
  name: string
  level?: number | null
  school?: string | null
  classesName?: string | null
  castingTime?: string | null
  range?: string | null
  components?: string | null
  duration?: string | null
  description?: string | null
  higherLevel?: string | null
  ritual?: boolean | null
  concentration?: boolean | null
  raw?: unknown
}

function formatSpellClassesName(spell: SpellDetail): string {
  const explicit = String(spell.classesName ?? '').trim()
  if (explicit) return explicit

  const raw = spell.raw
  if (!raw || typeof raw !== 'object') return '—'
  const obj = raw as Record<string, unknown>
  const classes = obj.classes
  if (!Array.isArray(classes)) return '—'
  const names: string[] = []
  for (const c of classes) {
    if (!c) continue
    if (typeof c === 'string') names.push(c)
    else if (typeof c === 'object') {
      const o = c as Record<string, unknown>
      if (typeof o.name === 'string') names.push(o.name)
    }
  }
  return names.length ? names.join(', ') : '—'
}

function getSpellDamageType(spell: SpellDetail): string | null {
  const raw = spell.raw
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const direct = obj.damageType ?? obj.damage_type ?? obj.damage_type_name
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const damage = obj.damage
  if (damage && typeof damage === 'object') {
    const d = damage as Record<string, unknown>
    const dt = d.damage_type
    if (dt && typeof dt === 'object') {
      const dto = dt as Record<string, unknown>
      if (typeof dto.name === 'string' && dto.name.trim()) return dto.name.trim()
    }
    if (typeof d.damageType === 'string' && d.damageType.trim()) return d.damageType.trim()
  }

  return null
}

export function SpellDetailsModal(props: {
  open: boolean
  loading: boolean
  spellDetails: SpellDetail | null
  onClose: () => void
}) {
  const { open, loading, spellDetails, onClose } = props
  if (!open) return null

  const damageTypeLabel = !loading && spellDetails ? getSpellDamageType(spellDetails) : null
  const hasHigherLevel = !loading && spellDetails ? Boolean(String(spellDetails.higherLevel ?? '').trim()) : false

  return (
    <div className="modal-backdrop" onClick={() => (!loading ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {loading ? <p>Chargement…</p> : null}
        {!loading && spellDetails ? (
          <>
            <div className="item-details-header">
              <div>
                <div className="item-details-header-name" style={{ fontSize: '1.12rem' }}>
                  {spellDetails.name}
                </div>
                <div className="item-details-header-submeta">{formatSpellClassesName(spellDetails)}</div>
              </div>
              <div className="item-details-header-meta">
                <span className="item-details-header-type">
                  {spellDetails.level == null ? '—' : spellDetails.level === 0 ? 'Niveau 0' : `Niveau ${spellDetails.level}`}
                </span>
                <span className="item-details-header-type" style={{ fontSize: '0.78rem', opacity: 0.92 }}>
                  {spellDetails.school ?? '—'}
                </span>
              </div>
            </div>

            <div className="item-details">
              <p>
                <strong>{spellDetails.castingTime?.trim() ? spellDetails.castingTime : '—'}</strong>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {spellDetails.range?.trim() ? spellDetails.range : '—'}
                </span>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {spellDetails.duration?.trim() ? spellDetails.duration : '—'}
                </span>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {spellDetails.components?.trim() ? spellDetails.components : '—'}
                </span>
                {damageTypeLabel ? (
                  <>
                    <span style={{ color: 'var(--muted)' }}> · </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                      {damageTypeLabel}
                    </span>
                  </>
                ) : null}
                {spellDetails.ritual ? (
                  <>
                    <span style={{ color: 'var(--muted)' }}> · </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>Rituel</span>
                  </>
                ) : null}
                {spellDetails.concentration ? (
                  <>
                    <span style={{ color: 'var(--muted)' }}> · </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>Concentration</span>
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

            <div className="item-details">
              <MarkdownContent content={spellDetails.description} />
            </div>
            {hasHigherLevel ? (
              <div className="item-details">
                <p>
                  <strong>Higher level</strong>
                </p>
                <MarkdownContent content={spellDetails.higherLevel} />
              </div>
            ) : null}
          </>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="btn btn-secondary" type="button" disabled={loading} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

