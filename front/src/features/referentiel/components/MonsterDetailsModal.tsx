import { useLanguage } from '../../../app/hooks/useLanguage'
import { MarkdownContent } from '../../../shared/components/MarkdownContent'
import { pickLang } from '../../../shared/utils/pickLang'

export type MonsterDetail = {
  id: number
  slug?: string
  name: string
  size?: string | null
  type?: string | null
  subtype?: string | null
  alignment?: string | null
  armorClass?: number | null
  hitPoints?: number | null
  hitDice?: string | null
  speed?: string | null
  strength?: number | null
  dexterity?: number | null
  constitution?: number | null
  intelligence?: number | null
  wisdom?: number | null
  charisma?: number | null
  challengeRating?: string | null
  xp?: number | null
  description?: string | null
  source?: string | null
  raw?: unknown
  // Traduction FR du référentiel importé (absente pour les monstres custom)
  nameFr?: string | null
  sizeFr?: string | null
  typeFr?: string | null
  subtypeFr?: string | null
  alignmentFr?: string | null
  speedFr?: string | null
  descriptionFr?: string | null
  // Traduction FR des blocs d'actions/capacités (JSON `[{name, desc}]`, absente pour les monstres custom)
  specialAbilitiesFr?: unknown
  actionsFr?: unknown
  reactionsFr?: unknown
  legendaryActionsFr?: unknown
}

function abilityModifierLabel(score?: number | null): string {
  if (score == null) return '—'
  const modifier = Math.floor((score - 10) / 2)
  return modifier >= 0 ? `+${modifier}` : String(modifier)
}

type MonsterFeatureEntry = { name: string | null; desc: string }

/** Normalise un tableau `[{name, desc}]` (JSON brut dnd5eapi ou colonne `*Fr` traduite). */
function toFeatureEntries(list: unknown): MonsterFeatureEntry[] {
  if (!Array.isArray(list)) return []
  const entries: MonsterFeatureEntry[] = []
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const desc = typeof e.desc === 'string' ? e.desc.trim() : ''
    if (!desc) continue
    entries.push({ name: typeof e.name === 'string' ? e.name : null, desc })
  }
  return entries
}

/** Extrait les traits/actions du JSON brut dnd5eapi (anglais, non présents en colonnes dédiées). */
function extractMonsterFeaturesEn(raw: unknown, key: string): MonsterFeatureEntry[] {
  if (!raw || typeof raw !== 'object') return []
  return toFeatureEntries((raw as Record<string, unknown>)[key])
}

function monsterFeaturesToMarkdown(entries: MonsterFeatureEntry[]): string {
  return entries.map((e) => (e.name ? `**${e.name}.** ${e.desc}` : e.desc)).join('\n\n')
}

const MONSTER_FEATURE_SECTIONS: Array<{ key: string; frKey: keyof MonsterDetail; label: string }> = [
  { key: 'special_abilities', frKey: 'specialAbilitiesFr', label: 'Capacités spéciales' },
  { key: 'actions', frKey: 'actionsFr', label: 'Actions' },
  { key: 'reactions', frKey: 'reactionsFr', label: 'Réactions' },
  { key: 'legendary_actions', frKey: 'legendaryActionsFr', label: 'Actions légendaires' },
]

const ABILITY_FIELDS: Array<{ key: keyof MonsterDetail; label: string }> = [
  { key: 'strength', label: 'FOR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'SAG' },
  { key: 'charisma', label: 'CHA' },
]

export function MonsterDetailsModal(props: {
  open: boolean
  loading: boolean
  monsterDetails: MonsterDetail | null
  onClose: () => void
  showDeleteFromImportedCatalog?: boolean
  onDeleteFromImportedCatalog?: () => void
  deleteFromImportedCatalogSaving?: boolean
}) {
  const {
    open,
    loading,
    monsterDetails,
    onClose,
    showDeleteFromImportedCatalog = false,
    onDeleteFromImportedCatalog,
    deleteFromImportedCatalogSaving = false,
  } = props
  const { language } = useLanguage()
  if (!open) return null

  const busy = loading || deleteFromImportedCatalogSaving
  const displayName = monsterDetails ? pickLang(language, monsterDetails.nameFr, monsterDetails.name) : null
  const displaySize = monsterDetails ? pickLang(language, monsterDetails.sizeFr, monsterDetails.size) : null
  const displayType = monsterDetails ? pickLang(language, monsterDetails.typeFr, monsterDetails.type) : null
  const displaySubtype = monsterDetails ? pickLang(language, monsterDetails.subtypeFr, monsterDetails.subtype) : null
  const displayAlignment = monsterDetails ? pickLang(language, monsterDetails.alignmentFr, monsterDetails.alignment) : null
  const displaySpeed = monsterDetails ? pickLang(language, monsterDetails.speedFr, monsterDetails.speed) : null
  const displayDescription = monsterDetails ? pickLang(language, monsterDetails.descriptionFr, monsterDetails.description) : null
  const submeta = !loading && monsterDetails
    ? [displaySize, displayType, displaySubtype ? `(${displaySubtype})` : null, displayAlignment]
        .filter((part) => part != null && String(part).trim())
        .join(' · ')
    : ''

  return (
    <div className="modal-backdrop" onClick={() => (!busy ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {loading ? <p>Chargement…</p> : null}
        {!loading && monsterDetails ? (
          <>
            <div className="item-details-header">
              <div>
                <div className="item-details-header-name" style={{ fontSize: '1.12rem' }}>
                  {displayName ?? monsterDetails.name}
                </div>
                <div className="item-details-header-submeta">{submeta || '—'}</div>
              </div>
              <div className="item-details-header-meta">
                <span className="item-details-header-type">
                  {monsterDetails.challengeRating != null ? `CR ${monsterDetails.challengeRating}` : '—'}
                </span>
                <span className="item-details-header-type" style={{ fontSize: '0.78rem', opacity: 0.92 }}>
                  {monsterDetails.xp != null ? `${monsterDetails.xp} XP` : '—'}
                </span>
              </div>
            </div>

            <div className="item-details">
              <p>
                <strong>CA {monsterDetails.armorClass ?? '—'}</strong>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  PV {monsterDetails.hitPoints ?? '—'}
                  {monsterDetails.hitDice ? ` (${monsterDetails.hitDice})` : ''}
                </span>
                <span style={{ color: 'var(--muted)' }}> · </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  Vitesse {displaySpeed?.trim() ? displaySpeed : '—'}
                </span>
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                gap: '0.5rem',
                margin: '0.75rem 0',
                textAlign: 'center',
              }}
            >
              {ABILITY_FIELDS.map((field) => (
                <div key={field.key}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
                    {field.label}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {(monsterDetails[field.key] as number | null | undefined) ?? '—'}{' '}
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      ({abilityModifierLabel(monsterDetails[field.key] as number | null | undefined)})
                    </span>
                  </div>
                </div>
              ))}
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

            {MONSTER_FEATURE_SECTIONS.map(({ key, frKey, label }) => {
              const enEntries = extractMonsterFeaturesEn(monsterDetails.raw, key)
              const frEntries = toFeatureEntries(monsterDetails[frKey])
              const entries = language === 'fr' && frEntries.length > 0 ? frEntries : enEntries
              if (entries.length === 0) return null
              return (
                <div className="item-details" key={key}>
                  <p>
                    <strong>{label}</strong>
                  </p>
                  <MarkdownContent content={monsterFeaturesToMarkdown(entries)} />
                </div>
              )
            })}
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

export function RemoveImportedCatalogMonsterConfirmModal(props: {
  open: boolean
  removing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { open, removing, onClose, onConfirm } = props
  if (!open) return null

  return (
    <div className="modal-backdrop modal-backdrop-stacked-deep" onClick={() => (!removing ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Retirer du catalogue importé</h3>
        <p>Retirer ce monstre du catalogue importé ?</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="btn" type="button" disabled={removing} onClick={onConfirm}>
            {removing ? 'Suppression…' : 'Oui, supprimer'}
          </button>
          <button className="btn btn-secondary" type="button" disabled={removing} onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
