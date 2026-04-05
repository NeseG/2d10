import React, { useEffect, useRef, useState } from 'react'

const SPELL_SCHOOL_SUGGESTIONS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
]

/** Noms anglais (alignés SRD / dnd5eapi) ; libellés FR pour l’UI. */
export const SPELL_CLASS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Artificer', label: 'Artificier' },
  { value: 'Bard', label: 'Barde' },
  { value: 'Cleric', label: 'Clerc' },
  { value: 'Druid', label: 'Druide' },
  { value: 'Sorcerer', label: 'Ensorceleur' },
  { value: 'Warlock', label: 'Occultiste' },
  { value: 'Wizard', label: 'Magicien' },
  { value: 'Paladin', label: 'Paladin' },
  { value: 'Ranger', label: 'Rôdeur' },
  { value: 'Fighter', label: 'Guerrier' },
  { value: 'Rogue', label: 'Roublard' },
]

const CLASS_VALUE_BY_LOWER = new Map<string, string>()
for (const o of SPELL_CLASS_OPTIONS) {
  CLASS_VALUE_BY_LOWER.set(o.value.toLowerCase(), o.value)
}

function sortSelectedSpellClasses(selected: string[]): string[] {
  const set = new Set(selected)
  return SPELL_CLASS_OPTIONS.map((o) => o.value).filter((v) => set.has(v))
}

/** Lit `raw.classes` (format dnd5e : `{ name }` ou `{ index }`). */
export function parseSpellClassesFromRaw(raw: unknown): string[] {
  const out: string[] = []
  if (!raw || typeof raw !== 'object') return []
  const classes = (raw as Record<string, unknown>).classes
  if (!Array.isArray(classes)) return []
  for (const c of classes) {
    let key: string | undefined
    if (typeof c === 'string') key = c.trim()
    else if (c && typeof c === 'object') {
      const o = c as Record<string, unknown>
      if (typeof o.name === 'string') key = o.name.trim()
      else if (typeof o.index === 'string') key = o.index.trim()
    }
    if (!key) continue
    const canon = CLASS_VALUE_BY_LOWER.get(key.toLowerCase())
    if (canon && !out.includes(canon)) out.push(canon)
  }
  return sortSelectedSpellClasses(out)
}

/** Fusionne les classes choisies dans l’objet `raw` envoyé à l’API. */
export function mergeSpellClassesIntoRaw(baseRaw: unknown, classNames: string[]): unknown {
  const ordered = sortSelectedSpellClasses(classNames)
  if (ordered.length > 0) {
    const payload = ordered.map((name) => ({ name }))
    if (baseRaw == null || typeof baseRaw !== 'object' || Array.isArray(baseRaw)) {
      return { classes: payload }
    }
    return { ...(baseRaw as Record<string, unknown>), classes: payload }
  }

  if (baseRaw == null || typeof baseRaw !== 'object' || Array.isArray(baseRaw)) {
    return baseRaw ?? null
  }
  const obj = { ...(baseRaw as Record<string, unknown>) }
  delete obj.classes
  return Object.keys(obj).length > 0 ? obj : null
}

function spellClassesSummaryLabel(selected: string[]): string {
  if (selected.length === 0) return 'Aucune classe'
  if (selected.length <= 2) {
    return selected
      .map((v) => SPELL_CLASS_OPTIONS.find((o) => o.value === v)?.label ?? v)
      .join(', ')
  }
  return `${selected.length} classes`
}

export function SpellClassMultiSelect(props: {
  id?: string
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const { id, value, onChange, disabled = false } = props
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      const el = wrapRef.current
      if (el && !el.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function toggleClass(classValue: string) {
    const next = value.includes(classValue) ? value.filter((x) => x !== classValue) : sortSelectedSpellClasses([...value, classValue])
    onChange(next)
  }

  const labelId = id ? `${id}-label` : undefined

  return (
    <div className="spell-class-multiselect" ref={wrapRef}>
      {labelId ? (
        <label className="spell-class-multiselect-label" id={labelId} htmlFor={id}>
          Classes
        </label>
      ) : (
        <span className="spell-class-multiselect-label">Classes</span>
      )}
      <button
        id={id}
        type="button"
        className="btn btn-secondary spell-class-multiselect-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="spell-class-multiselect-trigger-text">{spellClassesSummaryLabel(value)}</span>
        <span className="spell-class-multiselect-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="spell-class-multiselect-panel" role="listbox" aria-multiselectable onMouseDown={(e) => e.preventDefault()}>
          {SPELL_CLASS_OPTIONS.map((opt) => (
            <label key={opt.value} className="spell-class-multiselect-option">
              <input type="checkbox" checked={value.includes(opt.value)} onChange={() => toggleClass(opt.value)} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export type EditGrimoireFormState = {
  is_known: boolean
  is_prepared: boolean
  notes: string
  name: string
  level: string
  school: string
  spellClasses: string[]
  castingTime: string
  range: string
  components: string
  duration: string
  description: string
  higherLevel: string
  ritual: boolean
  concentration: boolean
  rawJson: string
}

export function SpellEditModal(props: {
  open: boolean
  saving: boolean
  form: EditGrimoireFormState
  setForm: React.Dispatch<React.SetStateAction<EditGrimoireFormState>>
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
  onOpenRemoveConfirm: () => void
  /** Admin : publier un sort custom dans la base des sorts importés (liste « Importer depuis le SRD »). */
  showValidateCatalogButton?: boolean
  onValidateCatalog?: () => void
  validateCatalogSaving?: boolean
}) {
  const {
    open,
    saving,
    form,
    setForm,
    onSubmit,
    onClose,
    onOpenRemoveConfirm,
    showValidateCatalogButton,
    onValidateCatalog,
    validateCatalogSaving = false,
  } = props
  const busy = saving || validateCatalogSaving
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={() => (!busy ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <label className="item-edit-title-field" htmlFor="edit-spell-name">
          <span>Éditer le sort</span>
          <input
            id="edit-spell-name"
            type="text"
            required
            disabled={busy}
            placeholder="Nom du sort"
            value={form.name}
            onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
          />
        </label>
        <form className="login-form item-edit-form" onSubmit={onSubmit}>
          <div className="item-edit-form-inline-pair spell-edit-level-school-row">
            <label className="item-edit-form-row" htmlFor="edit-spell-level">
              <span>Niveau</span>
              <input
                className="spell-edit-level-input"
                id="edit-spell-level"
                type="number"
                min={0}
                max={9}
                value={form.level}
                onChange={(event) => setForm((p) => ({ ...p, level: event.target.value }))}
              />
            </label>

            <label className="item-edit-form-row" htmlFor="edit-spell-school">
              <span>École</span>
              <input
                className="spell-edit-school-input"
                id="edit-spell-school"
                type="text"
                list="edit-spell-school-suggestions"
                value={form.school}
                onChange={(event) => setForm((p) => ({ ...p, school: event.target.value }))}
              />
            </label>
            <datalist id="edit-spell-school-suggestions">
              {SPELL_SCHOOL_SUGGESTIONS.map((school) => (
                <option key={school} value={school} />
              ))}
            </datalist>
          </div>

          <SpellClassMultiSelect
            id="edit-spell-classes"
            value={form.spellClasses}
            onChange={(next) => setForm((p) => ({ ...p, spellClasses: next }))}
            disabled={busy}
          />

          <div className="item-edit-form-inline-pair">
            <label className="item-edit-form-row" htmlFor="edit-spell-casting">
              <span>Casting time</span>
              <input
                id="edit-spell-casting"
                type="text"
                value={form.castingTime}
                onChange={(event) => setForm((p) => ({ ...p, castingTime: event.target.value }))}
              />
            </label>

            <label className="item-edit-form-row" htmlFor="edit-spell-duration">
              <span>Duration</span>
              <input
                id="edit-spell-duration"
                type="text"
                value={form.duration}
                onChange={(event) => setForm((p) => ({ ...p, duration: event.target.value }))}
              />
            </label>
          </div>

          <div className="item-edit-form-inline-pair">
            <label className="item-edit-form-row" htmlFor="edit-spell-range">
              <span>Range</span>
              <input
                id="edit-spell-range"
                type="text"
                value={form.range}
                onChange={(event) => setForm((p) => ({ ...p, range: event.target.value }))}
              />
            </label>

            <label className="item-edit-form-row" htmlFor="edit-spell-components">
              <span>Components</span>
              <input
                id="edit-spell-components"
                type="text"
                value={form.components}
                onChange={(event) => setForm((p) => ({ ...p, components: event.target.value }))}
              />
            </label>
          </div>

          <div className="item-edit-armor-checks">
            <label className="skill-check item-edit-inline-check">
              <input
                type="checkbox"
                checked={form.ritual}
                onChange={(event) => setForm((p) => ({ ...p, ritual: event.target.checked }))}
              />
              Rituel
            </label>

            <label className="skill-check item-edit-inline-check">
              <input
                type="checkbox"
                checked={form.concentration}
                onChange={(event) => setForm((p) => ({ ...p, concentration: event.target.checked }))}
              />
              Concentration
            </label>
          </div>

          <div className="item-edit-armor-checks">
            <label className="skill-check item-edit-inline-check">
              <input
                type="checkbox"
                checked={form.is_known}
                onChange={(event) => setForm((p) => ({ ...p, is_known: event.target.checked }))}
              />
              Connu
            </label>

            <label className="skill-check item-edit-inline-check">
              <input
                type="checkbox"
                checked={form.is_prepared}
                onChange={(event) => setForm((p) => ({ ...p, is_prepared: event.target.checked }))}
              />
              Préparé
            </label>
          </div>

          <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="edit-spell-desc">
            <span>Description</span>
            <textarea
              id="edit-spell-desc"
              rows={5}
              value={form.description}
              onChange={(event) => setForm((p) => ({ ...p, description: event.target.value }))}
            />
          </label>

          <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="edit-spell-higher">
            <span>Higher level</span>
            <textarea
              id="edit-spell-higher"
              rows={3}
              value={form.higherLevel}
              onChange={(event) => setForm((p) => ({ ...p, higherLevel: event.target.value }))}
            />
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={busy}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {showValidateCatalogButton && onValidateCatalog ? (
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busy}
                title="Ajoute ce sort à la base utilisée par la liste « sorts importés » (D&amp;D 5e)"
                onClick={() => onValidateCatalog()}
              >
                {validateCatalogSaving ? 'Validation…' : 'Valider'}
              </button>
            ) : null}
            <button className="btn btn-secondary" type="button" disabled={busy} onClick={onOpenRemoveConfirm}>
              Supprimer du grimoire
            </button>
            <button className="btn btn-secondary" type="button" disabled={busy} onClick={onClose}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RemoveFromGrimoireConfirmModal(props: {
  open: boolean
  removing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { open, removing, onClose, onConfirm } = props
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={() => (!removing ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Supprimer du grimoire</h3>
        <p>Confirmer la suppression de ce sort du grimoire ?</p>
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

/** Au-dessus d’une modale détail déjà empilée (ex. fiche sort catalogue importé). */
export function RemoveImportedCatalogSpellConfirmModal(props: {
  open: boolean
  removing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { open, removing, onClose, onConfirm } = props
  if (!open) return null

  return (
    <div
      className="modal-backdrop modal-backdrop-stacked-deep"
      onClick={() => (!removing ? onClose() : null)}
    >
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Retirer du catalogue importé</h3>
        <p>
          Retirer ce sort du catalogue des sorts importés ? Les copies déjà ajoutées aux grimoires ne sont pas supprimées.
        </p>
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

