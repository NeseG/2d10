import React from 'react'

const WEAPON_PROPERTIES = [
  'Ammunition',
  'Finesse',
  'Heavy',
  'Light',
  'Loading',
  'Reach',
  'Special',
  'Thrown',
  'Two-Handed',
  'Versatile',
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

function getSelectedWeaponProperties(propertiesJson: string): string[] {
  if (!propertiesJson.trim()) return []
  try {
    const parsed = JSON.parse(propertiesJson) as unknown
    const values: string[] = []
    const pushFromArray = (arr: unknown[]) => {
      for (const entry of arr) {
        if (typeof entry === 'string' && entry.trim()) values.push(entry.trim())
        else if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>
          if (typeof obj.name === 'string' && obj.name.trim()) values.push(obj.name.trim())
        }
      }
    }
    if (Array.isArray(parsed)) pushFromArray(parsed)
    else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (Array.isArray(obj.properties)) pushFromArray(obj.properties)
    }
    return Array.from(new Set(values))
  } catch {
    return []
  }
}

function serializeWeaponProperties(propertyNames: string[]): string {
  const next = Array.from(new Set(propertyNames.map((entry) => entry.trim()).filter(Boolean)))
  return next.length ? JSON.stringify(next.map((name) => ({ name })), null, 2) : ''
}

function isMeleeWeapon(category: string, subcategory: string): boolean {
  const value = `${category} ${subcategory}`.toLowerCase()
  return value.includes('melee') && !value.includes('ranged')
}

export type EditItemFormState = {
  name: string
  description: string
  type: string
  category: string
  subcategory: string
  cost: string
  weight: string
  damage: string
  damageType: string
  rangeNormal: string
  rangeLong: string
  armorClass: string
  armorDexBonus: boolean
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
  /** Absent en mode création : le bouton retirer de l’inventaire est masqué. */
  onOpenRemoveConfirm?: () => void
  /** Mode édition : crée une copie de l’objet (même fiche) et l’ajoute à l’inventaire. */
  onDuplicate?: () => void
  duplicateSaving?: boolean
  /** Admin : publier un objet custom dans la base utilisée par la liste « équipements importés » (D&D 5e). */
  showValidateCatalogButton?: boolean
  onValidateCatalog?: () => void
  validateCatalogSaving?: boolean
  variant?: 'edit' | 'create'
  /** Ex. onglets Normal / Magique au-dessus du formulaire */
  headerExtra?: React.ReactNode
  /** Champs supplémentaires après sous-catégorie (ex. rareté magique) */
  extraAfterSubcategory?: React.ReactNode
  /** Quantité à l’ajout en inventaire (création uniquement) */
  quantityDraft?: { value: string; onChange: (next: string) => void }
  submitLabel?: string
}) {
  const {
    open,
    loading,
    saving,
    form,
    setForm,
    itemTypes,
    onSubmit,
    onClose,
    onOpenRemoveConfirm,
    onDuplicate,
    duplicateSaving = false,
    showValidateCatalogButton,
    onValidateCatalog,
    validateCatalogSaving = false,
    variant = 'edit',
    headerExtra,
    extraAfterSubcategory,
    quantityDraft,
    submitLabel,
  } = props
  const isCreate = variant === 'create'
  const title = isCreate ? 'Créer un objet' : 'Éditer l’objet'
  const primaryLabel = submitLabel ?? (isCreate ? 'Créer et ajouter' : 'Enregistrer')
  const busy = saving || duplicateSaving || validateCatalogSaving
  const selectedWeaponProperties = getSelectedWeaponProperties(form.propertiesJson)
  const [weaponPropertyDraft, setWeaponPropertyDraft] = React.useState('')
  const meleeWeapon = isMeleeWeapon(form.category, form.subcategory)

  function replaceWeaponProperties(next: string[]) {
    setForm((prev) => ({
      ...prev,
      propertiesJson: serializeWeaponProperties(next),
    }))
  }

  function addWeaponProperty() {
    const nextValue = weaponPropertyDraft.trim()
    if (!nextValue) return
    replaceWeaponProperties([...selectedWeaponProperties, nextValue])
    setWeaponPropertyDraft('')
  }

  function removeWeaponProperty(propertyName: string) {
    replaceWeaponProperties(selectedWeaponProperties.filter((entry) => entry !== propertyName))
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {headerExtra ? <div className="item-edit-modal-header-extra">{headerExtra}</div> : null}
        <label className="item-edit-title-field" htmlFor="edit-item-name">
          <span>{title}</span>
          <input
            id="edit-item-name"
            type="text"
            required
            disabled={loading || busy}
            value={form.name}
            onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
          />
        </label>
        {loading ? <p>Chargement…</p> : null}

        <form className="login-form item-edit-form" onSubmit={onSubmit}>
          <label className="item-edit-form-row" htmlFor="edit-item-type">
            <span>Type</span>
          <select
            id="edit-item-type"
            disabled={loading || busy}
            value={form.type}
            onChange={(event) => setForm((p) => ({ ...p, type: event.target.value }))}
          >
            {itemTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          </label>

          <label className="item-edit-form-row" htmlFor="edit-item-category">
            <span>Catégorie</span>
            <input
              id="edit-item-category"
              type="text"
              list="edit-item-category-suggestions"
              disabled={loading || busy}
              value={form.category}
              onChange={(event) => setForm((p) => ({ ...p, category: event.target.value }))}
            />
          </label>
          <datalist id="edit-item-category-suggestions">
            {ITEM_CATEGORY_SUGGESTIONS.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          <label className="item-edit-form-row" htmlFor="edit-item-subcategory">
            <span>Sous-catégorie</span>
            <input
              id="edit-item-subcategory"
              type="text"
              list="edit-item-subcategory-suggestions"
              disabled={loading || busy}
              value={form.subcategory}
              onChange={(event) => setForm((p) => ({ ...p, subcategory: event.target.value }))}
            />
          </label>
          <datalist id="edit-item-subcategory-suggestions">
            {ITEM_SUBCATEGORY_SUGGESTIONS.map((subcategory) => (
              <option key={subcategory} value={subcategory} />
            ))}
          </datalist>

          {extraAfterSubcategory}

          <div className="item-edit-form-inline-pair">
            <label className="item-edit-form-row" htmlFor="edit-item-cost">
              <span>Coût</span>
              <input
                id="edit-item-cost"
                type="text"
                disabled={loading || busy}
                value={form.cost}
                onChange={(event) => setForm((p) => ({ ...p, cost: event.target.value }))}
              />
            </label>

            <label className="item-edit-form-row" htmlFor="edit-item-weight">
              <span>Poids (kg)</span>
              <input
                id="edit-item-weight"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="ex. 1 ou 0,5"
                disabled={loading || busy}
                value={form.weight}
                onChange={(event) => setForm((p) => ({ ...p, weight: event.target.value }))}
              />
            </label>
          </div>

          <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="edit-item-description">
            <span>Description</span>
          <textarea
            id="edit-item-description"
            rows={3}
            disabled={loading || busy}
            value={form.description}
            onChange={(event) => setForm((p) => ({ ...p, description: event.target.value }))}
          />
          </label>

          {quantityDraft ? (
            <label className="item-edit-form-row" htmlFor="edit-item-quantity">
              <span>Quantité</span>
              <input
                id="edit-item-quantity"
                type="number"
                min={0}
                disabled={loading || busy}
                value={quantityDraft.value}
                onChange={(event) => quantityDraft.onChange(event.target.value)}
              />
            </label>
          ) : null}

          {form.type === 'weapon' ? (
            <>
              <label className="item-edit-form-row" htmlFor="edit-item-damage">
                <span>Dégâts</span>
                <input
                  id="edit-item-damage"
                  type="text"
                  disabled={loading || busy}
                  value={form.damage}
                  onChange={(event) => setForm((p) => ({ ...p, damage: event.target.value }))}
                />
              </label>

              <label className="item-edit-form-row" htmlFor="edit-item-damage-type">
                <span>Type de dégâts</span>
                <input
                  id="edit-item-damage-type"
                  type="text"
                  disabled={loading || busy}
                  value={form.damageType}
                  onChange={(event) => setForm((p) => ({ ...p, damageType: event.target.value }))}
                />
              </label>

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="edit-item-range-normal">
                  <span>Normal</span>
                  <input
                    id="edit-item-range-normal"
                    type="text"
                    disabled={loading || busy}
                    value={form.rangeNormal}
                    onChange={(event) => setForm((p) => ({ ...p, rangeNormal: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="edit-item-range-long">
                  <span>Ranged</span>
                  <input
                    id="edit-item-range-long"
                    type="text"
                    disabled={loading || busy || meleeWeapon}
                    value={form.rangeLong}
                    onChange={(event) => setForm((p) => ({ ...p, rangeLong: event.target.value }))}
                  />
                </label>
              </div>

              <div className="item-edit-form-row item-edit-form-row-textarea">
                <span>Weapon properties</span>
                <div className="item-edit-weapon-properties-list">
                  {selectedWeaponProperties.length > 0 ? (
                    <div className="item-edit-weapon-properties-tags">
                      {selectedWeaponProperties.map((propertyName) => (
                        <span key={propertyName} className="item-edit-weapon-property-tag">
                          <span>{propertyName}</span>
                          <button
                            type="button"
                            className="item-edit-weapon-property-remove"
                            disabled={loading || busy}
                            onClick={() => removeWeaponProperty(propertyName)}
                          >
                            Retirer
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="item-edit-weapon-properties-empty">Aucune propriété sélectionnée.</p>
                  )}

                  <div className="item-edit-weapon-properties-add">
                    <input
                      type="text"
                      list="edit-item-weapon-property-suggestions"
                      placeholder="Ajouter une propriété"
                      disabled={loading || busy}
                      value={weaponPropertyDraft}
                      onChange={(event) => setWeaponPropertyDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addWeaponProperty()
                        }
                      }}
                    />
                    <button type="button" className="btn btn-secondary btn-small" disabled={loading || busy} onClick={addWeaponProperty}>
                      Ajouter
                    </button>
                  </div>
                  <datalist id="edit-item-weapon-property-suggestions">
                    {WEAPON_PROPERTIES.map((propertyName) => (
                      <option key={propertyName} value={propertyName} />
                    ))}
                  </datalist>
                </div>
              </div>
            </>
          ) : null}

          {form.type === 'armor' ? (
            <>
              <label className="item-edit-form-row" htmlFor="edit-item-ac">
                <span>CA</span>
                <input
                  id="edit-item-ac"
                  type="number"
                  min={0}
                  disabled={loading || busy}
                  value={form.armorClass}
                  onChange={(event) => setForm((p) => ({ ...p, armorClass: event.target.value }))}
                />
              </label>

              <div className="item-edit-armor-checks">
                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    disabled={loading || busy}
                    checked={form.armorDexBonus}
                    onChange={(event) => setForm((p) => ({ ...p, armorDexBonus: event.target.checked }))}
                  />
                  Bonus de Dex
                </label>

                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    disabled={loading || busy}
                    checked={form.stealthDisadvantage}
                    onChange={(event) => setForm((p) => ({ ...p, stealthDisadvantage: event.target.checked }))}
                  />
                  Désavantage discrétion
                </label>
              </div>
            </>
          ) : null}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={loading || busy}>
              {saving ? (isCreate ? 'Création…' : 'Enregistrement…') : primaryLabel}
            </button>
            {!isCreate && onDuplicate ? (
              <button
                className="btn btn-secondary"
                type="button"
                disabled={loading || busy}
                onClick={() => onDuplicate()}
              >
                {duplicateSaving ? 'Duplication…' : 'Dupliquer'}
              </button>
            ) : null}
            {showValidateCatalogButton && onValidateCatalog ? (
              <button
                className="btn btn-secondary"
                type="button"
                disabled={loading || busy}
                title="Enregistre la fiche dans la base « équipements importés » (liste D&amp;D 5e), après tes modifications"
                onClick={() => onValidateCatalog()}
              >
                {validateCatalogSaving ? 'Enregistrement…' : 'Valider (catalogue)'}
              </button>
            ) : null}
            {!isCreate && onOpenRemoveConfirm ? (
              <button
                className="btn btn-secondary"
                type="button"
                disabled={loading || busy}
                onClick={onOpenRemoveConfirm}
              >
                Supprimer de l’inventaire
              </button>
            ) : null}
            <button
              className="btn btn-secondary"
              type="button"
              disabled={loading || busy}
              onClick={onClose}
            >
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

