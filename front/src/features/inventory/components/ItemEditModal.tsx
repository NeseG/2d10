import React from 'react'

export type EditItemFormState = {
  index: string
  name: string
  description: string
  type: string
  category: string
  subcategory: string
  cost: string
  weight: string
  damage: string
  damageType: string
  range: string
  armorClass: string
  stealthDisadvantage: boolean
  propertiesJson: string
}

export function ItemEditModal(props: {
  open: boolean
  loading: boolean
  saving: boolean
  form: EditItemFormState
  setForm: React.Dispatch<React.SetStateAction<EditItemFormState>>
  itemTypes: Array<{ value: string; label: string }>
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
  onOpenRemoveConfirm: () => void
}) {
  const { open, loading, saving, form, setForm, itemTypes, onSubmit, onClose, onOpenRemoveConfirm } = props

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!saving) onClose()
      }}
    >
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Éditer l’objet</h3>
        {loading ? <p>Chargement…</p> : null}

        <form className="login-form" onSubmit={onSubmit}>
          <label htmlFor="edit-item-name">Nom</label>
          <input
            id="edit-item-name"
            type="text"
            required
            disabled={loading || saving}
            value={form.name}
            onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
          />

          <label htmlFor="edit-item-index">Index</label>
          <input
            id="edit-item-index"
            type="text"
            disabled={loading || saving}
            value={form.index}
            onChange={(event) => setForm((p) => ({ ...p, index: event.target.value }))}
          />

          <label htmlFor="edit-item-type">Type</label>
          <select
            id="edit-item-type"
            disabled={loading || saving}
            value={form.type}
            onChange={(event) => setForm((p) => ({ ...p, type: event.target.value }))}
          >
            {itemTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <label htmlFor="edit-item-category">Catégorie</label>
          <input
            id="edit-item-category"
            type="text"
            disabled={loading || saving}
            value={form.category}
            onChange={(event) => setForm((p) => ({ ...p, category: event.target.value }))}
          />

          <label htmlFor="edit-item-subcategory">Sous-catégorie</label>
          <input
            id="edit-item-subcategory"
            type="text"
            disabled={loading || saving}
            value={form.subcategory}
            onChange={(event) => setForm((p) => ({ ...p, subcategory: event.target.value }))}
          />

          <label htmlFor="edit-item-cost">Coût</label>
          <input
            id="edit-item-cost"
            type="text"
            disabled={loading || saving}
            value={form.cost}
            onChange={(event) => setForm((p) => ({ ...p, cost: event.target.value }))}
          />

          <label htmlFor="edit-item-weight">Poids</label>
          <input
            id="edit-item-weight"
            type="number"
            min={0}
            disabled={loading || saving}
            value={form.weight}
            onChange={(event) => setForm((p) => ({ ...p, weight: event.target.value }))}
          />

          <label htmlFor="edit-item-description">Description</label>
          <textarea
            id="edit-item-description"
            rows={3}
            disabled={loading || saving}
            value={form.description}
            onChange={(event) => setForm((p) => ({ ...p, description: event.target.value }))}
          />

          <label htmlFor="edit-item-damage">Dégâts</label>
          <input
            id="edit-item-damage"
            type="text"
            disabled={loading || saving}
            value={form.damage}
            onChange={(event) => setForm((p) => ({ ...p, damage: event.target.value }))}
          />

          <label htmlFor="edit-item-damage-type">Type de dégâts</label>
          <input
            id="edit-item-damage-type"
            type="text"
            disabled={loading || saving}
            value={form.damageType}
            onChange={(event) => setForm((p) => ({ ...p, damageType: event.target.value }))}
          />

          <label htmlFor="edit-item-range">Portée</label>
          <input
            id="edit-item-range"
            type="text"
            disabled={loading || saving}
            value={form.range}
            onChange={(event) => setForm((p) => ({ ...p, range: event.target.value }))}
          />

          <label htmlFor="edit-item-ac">CA</label>
          <input
            id="edit-item-ac"
            type="number"
            min={0}
            disabled={loading || saving}
            value={form.armorClass}
            onChange={(event) => setForm((p) => ({ ...p, armorClass: event.target.value }))}
          />

          <label className="skill-check">
            <input
              type="checkbox"
              disabled={loading || saving}
              checked={form.stealthDisadvantage}
              onChange={(event) => setForm((p) => ({ ...p, stealthDisadvantage: event.target.checked }))}
            />
            Désavantage discrétion
          </label>

          <label htmlFor="edit-item-properties">Propriétés (JSON)</label>
          <textarea
            id="edit-item-properties"
            rows={6}
            disabled={loading || saving}
            value={form.propertiesJson}
            onChange={(event) => setForm((p) => ({ ...p, propertiesJson: event.target.value }))}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn" type="submit" disabled={loading || saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={loading || saving}
              onClick={onOpenRemoveConfirm}
            >
              Supprimer de l’inventaire
            </button>
            <button className="btn btn-secondary" type="button" disabled={loading || saving} onClick={onClose}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RemoveFromInventoryConfirmModal(props: {
  open: boolean
  removing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { open, removing, onClose, onConfirm } = props
  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!removing) onClose()
      }}
    >
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Supprimer de l’inventaire</h3>
        <p>Confirmer la suppression de cet objet de l’inventaire ?</p>
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

