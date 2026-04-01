import React from 'react'

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

export type EditGrimoireFormState = {
  is_known: boolean
  is_prepared: boolean
  notes: string
  name: string
  level: string
  school: string
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
}) {
  const { open, saving, form, setForm, onSubmit, onClose, onOpenRemoveConfirm } = props
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={() => (!saving ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <label className="item-edit-title-field" htmlFor="edit-spell-name">
          <span>Éditer le sort</span>
          <input
            id="edit-spell-name"
            type="text"
            required
            disabled={saving}
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

          <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="grimoire-notes">
            <span>Notes</span>
            <textarea
              id="grimoire-notes"
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((p) => ({ ...p, notes: event.target.value }))}
            />
          </label>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button className="btn btn-secondary" type="button" disabled={saving} onClick={onOpenRemoveConfirm}>
              Supprimer du grimoire
            </button>
            <button className="btn btn-secondary" type="button" disabled={saving} onClick={onClose}>
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

