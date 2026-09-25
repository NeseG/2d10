import { useLanguage } from '../../../app/hooks/useLanguage'
import { MarkdownContent } from '../../../shared/components/MarkdownContent'
import { pickLang } from '../../../shared/utils/pickLang'

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
  source?: string | null
  raw?: unknown
  // Traduction FR du référentiel importé (absent pour les sorts du grimoire / custom)
  nameFr?: string | null
  schoolFr?: string | null
  castingTimeFr?: string | null
  rangeFr?: string | null
  componentsFr?: string | null
  durationFr?: string | null
  descriptionFr?: string | null
  higherLevelFr?: string | null
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
  stacked?: boolean
  showDeleteFromImportedCatalog?: boolean
  onDeleteFromImportedCatalog?: () => void
  deleteFromImportedCatalogSaving?: boolean
}) {
  const {
    open,
    loading,
    spellDetails,
    onClose,
    stacked = false,
    showDeleteFromImportedCatalog = false,
    onDeleteFromImportedCatalog,
    deleteFromImportedCatalogSaving = false,
  } = props
  const { language } = useLanguage()
  if (!open) return null

  const busy = loading || deleteFromImportedCatalogSaving
  const damageTypeLabel = !loading && spellDetails ? getSpellDamageType(spellDetails) : null
  const displayName = spellDetails ? pickLang(language, spellDetails.nameFr, spellDetails.name) : null
  const displaySchool = spellDetails ? pickLang(language, spellDetails.schoolFr, spellDetails.school) : null
  const displayCastingTime = spellDetails ? pickLang(language, spellDetails.castingTimeFr, spellDetails.castingTime) : null
  const displayRange = spellDetails ? pickLang(language, spellDetails.rangeFr, spellDetails.range) : null
  const displayDuration = spellDetails ? pickLang(language, spellDetails.durationFr, spellDetails.duration) : null
  const displayComponents = spellDetails ? pickLang(language, spellDetails.componentsFr, spellDetails.components) : null
  const displayDescription = spellDetails ? pickLang(language, spellDetails.descriptionFr, spellDetails.description) : null
  const displayHigherLevel = spellDetails ? pickLang(language, spellDetails.higherLevelFr, spellDetails.higherLevel) : null
  const hasHigherLevel = !loading && spellDetails ? Boolean(displayHigherLevel?.trim()) : false

  return (
    <div
      className={stacked ? 'modal-backdrop modal-backdrop-stacked' : 'modal-backdrop'}
      onClick={() => (!busy ? onClose() : null)}
    >
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {loading ? <p>Chargement…</p> : null}
        {!loading && spellDetails ? (
          <>
            <div className="item-details-header">
              <div>
                <div className="item-details-header-name" style={{ fontSize: '1.12rem' }}>
                  {displayName ?? spellDetails.name}
                </div>
                <div className="item-details-header-submeta">{formatSpellClassesName(spellDetails)}</div>
              </div>
              <div className="item-details-header-meta">
                <span className="item-details-header-type">
                  {spellDetails.level == null ? '—' : spellDetails.level === 0 ? 'Niveau 0' : `Niveau ${spellDetails.level}`}
                </span>
                <span className="item-details-header-type" style={{ fontSize: '0.78rem', opacity: 0.92 }}>
                  {displaySchool ?? '—'}
                </span>
              </div>
            </div>

            <div className="item-details">
              <p>
                <strong>{displayCastingTime?.trim() ? displayCastingTime : '—'}</strong>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {displayRange?.trim() ? displayRange : '—'}
                </span>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {displayDuration?.trim() ? displayDuration : '—'}
                </span>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {displayComponents?.trim() ? displayComponents : '—'}
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
              <MarkdownContent content={displayDescription} />
            </div>
            {hasHigherLevel ? (
              <div className="item-details">
                <p>
                  <strong>{language === 'fr' ? 'Aux niveaux supérieurs' : 'Higher level'}</strong>
                </p>
                <MarkdownContent content={displayHigherLevel} />
              </div>
            ) : null}
          </>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {showDeleteFromImportedCatalog && onDeleteFromImportedCatalog ? (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => onDeleteFromImportedCatalog()}
            >
              {deleteFromImportedCatalogSaving ? 'Suppression…' : 'Supprimer du catalogue importé'}
            </button>
          ) : null}
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

