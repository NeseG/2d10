import React from 'react'

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
        <h3>Éditer le sort</h3>
        <form className="login-form" onSubmit={onSubmit}>
          <h4>Sort</h4>
          <label htmlFor="edit-spell-name">Nom</label>
          <input
            id="edit-spell-name"
            type="text"
            required
            value={form.name}
            onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
          />

          <label htmlFor="edit-spell-level">Niveau</label>
          <input
            id="edit-spell-level"
            type="number"
            min={0}
            max={9}
            value={form.level}
            onChange={(event) => setForm((p) => ({ ...p, level: event.target.value }))}
          />

          <label htmlFor="edit-spell-school">École</label>
          <input
            id="edit-spell-school"
            type="text"
            value={form.school}
            onChange={(event) => setForm((p) => ({ ...p, school: event.target.value }))}
          />

          <label htmlFor="edit-spell-casting">Casting time</label>
          <input
            id="edit-spell-casting"
            type="text"
            value={form.castingTime}
            onChange={(event) => setForm((p) => ({ ...p, castingTime: event.target.value }))}
          />

          <label htmlFor="edit-spell-range">Range</label>
          <input
            id="edit-spell-range"
            type="text"
            value={form.range}
            onChange={(event) => setForm((p) => ({ ...p, range: event.target.value }))}
          />

          <label htmlFor="edit-spell-components">Components</label>
          <input
            id="edit-spell-components"
            type="text"
            value={form.components}
            onChange={(event) => setForm((p) => ({ ...p, components: event.target.value }))}
          />

          <label htmlFor="edit-spell-duration">Duration</label>
          <input
            id="edit-spell-duration"
            type="text"
            value={form.duration}
            onChange={(event) => setForm((p) => ({ ...p, duration: event.target.value }))}
          />

          <label htmlFor="edit-spell-desc">Description</label>
          <textarea
            id="edit-spell-desc"
            rows={5}
            value={form.description}
            onChange={(event) => setForm((p) => ({ ...p, description: event.target.value }))}
          />

          <label htmlFor="edit-spell-higher">Higher level</label>
          <textarea
            id="edit-spell-higher"
            rows={3}
            value={form.higherLevel}
            onChange={(event) => setForm((p) => ({ ...p, higherLevel: event.target.value }))}
          />

          <label className="skill-check">
            <input
              type="checkbox"
              checked={form.ritual}
              onChange={(event) => setForm((p) => ({ ...p, ritual: event.target.checked }))}
            />
            Rituel
          </label>

          <label className="skill-check">
            <input
              type="checkbox"
              checked={form.concentration}
              onChange={(event) => setForm((p) => ({ ...p, concentration: event.target.checked }))}
            />
            Concentration
          </label>

          <label htmlFor="edit-spell-raw">Raw (JSON)</label>
          <textarea
            id="edit-spell-raw"
            rows={6}
            value={form.rawJson}
            onChange={(event) => setForm((p) => ({ ...p, rawJson: event.target.value }))}
          />

          <h4>Grimoire</h4>
          <label className="skill-check">
            <input
              type="checkbox"
              checked={form.is_known}
              onChange={(event) => setForm((p) => ({ ...p, is_known: event.target.checked }))}
            />
            Connu
          </label>

          <label className="skill-check">
            <input
              type="checkbox"
              checked={form.is_prepared}
              onChange={(event) => setForm((p) => ({ ...p, is_prepared: event.target.checked }))}
            />
            Préparé
          </label>

          <label htmlFor="grimoire-notes">Notes</label>
          <textarea
            id="grimoire-notes"
            rows={4}
            value={form.notes}
            onChange={(event) => setForm((p) => ({ ...p, notes: event.target.value }))}
          />

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

