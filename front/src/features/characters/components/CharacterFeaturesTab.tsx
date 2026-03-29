import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/api/client'
import { useSnackbar } from '../../../app/hooks/useSnackbar'

export type FeatureCategory =
  | 'CLASS_FEATURE'
  | 'RACIAL_TRAIT'
  | 'FEAT'
  | 'PERSONALITY_AND_BACKGROUND'
  | 'OTHER_PROFICIENCIES_AND_LANGUAGES'

type CharacterFeature = {
  id: number
  character_id: number
  category: FeatureCategory
  name: string
  description?: string | null
}

export const CATEGORY_LABELS: Array<{ value: FeatureCategory; label: string }> = [
  { value: 'CLASS_FEATURE', label: 'Capacité de classe' },
  { value: 'RACIAL_TRAIT', label: 'Traits raciaux' },
  { value: 'FEAT', label: 'Dons' },
  { value: 'PERSONALITY_AND_BACKGROUND', label: 'Personnalités et historique' },
  { value: 'OTHER_PROFICIENCIES_AND_LANGUAGES', label: 'Autres maîtrises et langues' },
]

export type SessionLiveTraitsAccordionState = Record<FeatureCategory, boolean>

export const DEFAULT_SESSION_LIVE_TRAITS_ACCORDIONS: SessionLiveTraitsAccordionState = {
  CLASS_FEATURE: true,
  RACIAL_TRAIT: true,
  FEAT: true,
  PERSONALITY_AND_BACKGROUND: true,
  OTHER_PROFICIENCIES_AND_LANGUAGES: true,
}

export function CharacterFeaturesTab(props: {
  characterId: string
  token: string
  sessionView?: boolean
  sessionTraitsAccordions?: SessionLiveTraitsAccordionState
  onSessionTraitsAccordionsChange?: (patch: Partial<SessionLiveTraitsAccordionState>) => void
}) {
  const { characterId, token, sessionView = false } = props
  const { sessionTraitsAccordions, onSessionTraitsAccordionsChange } = props
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [features, setFeatures] = useState<CharacterFeature[]>([])
  const [draftById, setDraftById] = useState<Record<number, { category: FeatureCategory; name: string; description: string }>>({})
  const [savingById, setSavingById] = useState<Record<number, boolean>>({})

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isFeatureDetailsOpen, setIsFeatureDetailsOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<CharacterFeature | null>(null)
  const [fallbackSessionTraitsAccordions, setFallbackSessionTraitsAccordions] =
    useState<SessionLiveTraitsAccordionState>(DEFAULT_SESSION_LIVE_TRAITS_ACCORDIONS)
  const [form, setForm] = useState<{ category: FeatureCategory; name: string; description: string }>(() => ({
    category: 'CLASS_FEATURE',
    name: '',
    description: '',
  }))

  const effectiveSessionTraitsAccordions =
    sessionTraitsAccordions !== undefined ? sessionTraitsAccordions : fallbackSessionTraitsAccordions

  function patchTraitsAccordions(patch: Partial<SessionLiveTraitsAccordionState>) {
    if (onSessionTraitsAccordionsChange) {
      onSessionTraitsAccordionsChange(patch)
    } else {
      setFallbackSessionTraitsAccordions((prev) => ({ ...prev, ...patch }))
    }
  }

  async function loadFeatures() {
    if (!characterId) return
    setLoading(true)
    try {
      const res = await apiGet<{ success: boolean; features: CharacterFeature[] }>(`/api/characters/${characterId}/features`, token)
      setFeatures(Array.isArray(res.features) ? res.features : [])
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement éléments',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFeatures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, token])

  useEffect(() => {
    setDraftById((prev) => {
      const next: Record<number, { category: FeatureCategory; name: string; description: string }> = { ...prev }
      for (const f of features) {
        if (!next[f.id]) {
          next[f.id] = {
            category: f.category,
            name: f.name ?? '',
            description: f.description ?? '',
          }
        }
      }
      // remove drafts that no longer exist
      for (const idStr of Object.keys(next)) {
        const id = Number(idStr)
        if (!features.some((f) => f.id === id)) delete next[id]
      }
      return next
    })
  }, [features])

  const grouped = useMemo(() => {
    const map = new Map<FeatureCategory, CharacterFeature[]>()
    for (const c of CATEGORY_LABELS) map.set(c.value, [])
    for (const f of features) {
      const arr = map.get(f.category) ?? []
      arr.push(f)
      map.set(f.category, arr)
    }
    return map
  }, [features])

  function openCreate() {
    setEditingId(null)
    setForm({ category: 'CLASS_FEATURE', name: '', description: '' })
    setIsModalOpen(true)
  }

  function openEdit(feature: CharacterFeature) {
    setEditingId(feature.id)
    setForm({
      category: feature.category,
      name: feature.name ?? '',
      description: feature.description ?? '',
    })
    setIsModalOpen(true)
  }

  function openFeatureDetails(feature: CharacterFeature) {
    setSelectedFeature(feature)
    setIsFeatureDetailsOpen(true)
  }

  async function saveInline(feature: CharacterFeature) {
    const draft = draftById[feature.id]
    if (!draft) return

    const nextName = draft.name.trim()
    if (!nextName) {
      showSnackbar({ message: 'Le nom est requis.', severity: 'error' })
      return
    }

    const hasChanges =
      draft.category !== feature.category ||
      nextName !== (feature.name ?? '') ||
      (draft.description.trim() || '') !== (feature.description ?? '')

    if (!hasChanges) {
      // normalize name trimming even without changes
      setDraftById((p) => ({ ...p, [feature.id]: { ...p[feature.id], name: nextName } }))
      return
    }

    setSavingById((p) => ({ ...p, [feature.id]: true }))
    try {
      await apiPut(
        `/api/characters/${characterId}/features/${feature.id}`,
        {
          category: draft.category,
          name: nextName,
          description: draft.description.trim() || null,
        },
        token,
      )
      await loadFeatures()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur sauvegarde',
        severity: 'error',
      })
    } finally {
      setSavingById((p) => ({ ...p, [feature.id]: false }))
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!characterId) return
    setSaving(true)
    try {
      const payload = {
        category: form.category,
        name: form.name.trim(),
        description: form.description.trim() || null,
      }
      if (!payload.name) {
        showSnackbar({ message: 'Le nom est requis.', severity: 'error' })
        return
      }

      if (editingId == null) {
        await apiPost(`/api/characters/${characterId}/features`, payload, token)
        showSnackbar({ message: 'Élément ajouté.', severity: 'success' })
      } else {
        await apiPut(`/api/characters/${characterId}/features/${editingId}`, payload, token)
        showSnackbar({ message: 'Élément mis à jour.', severity: 'success' })
      }

      setIsModalOpen(false)
      setEditingId(null)
      await loadFeatures()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur sauvegarde',
        severity: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(feature: CharacterFeature) {
    const ok = window.confirm(`Supprimer "${feature.name}" ?`)
    if (!ok) return
    setSaving(true)
    try {
      await apiDelete(`/api/characters/${characterId}/features/${feature.id}`, token)
      showSnackbar({ message: 'Élément supprimé.', severity: 'success' })
      await loadFeatures()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression',
        severity: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {!sessionView ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <button className="btn" type="button" onClick={openCreate}>
            Ajouter
          </button>
        </div>
      ) : null}

      {loading ? <p>Chargement…</p> : null}

      {CATEGORY_LABELS.map((cat) => {
        const items = grouped.get(cat.value) ?? []
        const isOpen = sessionView ? Boolean(effectiveSessionTraitsAccordions[cat.value]) : true
        return (
          <details
            key={cat.value}
            className="character-skills-accordion"
            open={isOpen}
            onToggle={(e) => {
              if (!sessionView) return
              patchTraitsAccordions({ [cat.value]: e.currentTarget.open } as Partial<SessionLiveTraitsAccordionState>)
            }}
          >
            <summary className="character-skills-accordion-summary">{cat.label}</summary>
            <div className="character-skills-accordion-panel">
              {items.length === 0 ? (
                <p style={{ color: 'var(--muted)', margin: 0 }}>Aucun élément.</p>
              ) : (
                <>
                  {/* Table (même comportement que l’inventaire : scroll horizontal si besoin) */}
                  <div className="table-wrap inventory-table-wrap character-features-table-wrap">
                    <table className="table inventory-items-table character-features-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Description</th>
                          {!sessionView ? <th></th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((feature) => (
                          <tr key={feature.id} className="clickable-row" onClick={() => openFeatureDetails(feature)}>
                            <td data-label="Nom">{feature.name}</td>
                            <td data-label="Description">
                              <div className="feature-desc">
                                {feature.description?.trim() ? feature.description : '—'}
                              </div>
                            </td>
                            {!sessionView ? (
                              <td data-label="Actions">
                                <div className="feature-actions">
                                  <button
                                    className="btn btn-secondary btn-small"
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEdit(feature)
                                    }}
                                  >
                                    Éditer
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-small"
                                    type="button"
                                    disabled={saving}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void handleDelete(feature)
                                    }}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="feature-cards">
                    {items.map((feature) => (
                      <div key={feature.id} className="feature-card">
                        <div className="feature-card-title">
                          <select
                            className="feature-card-select"
                            value={draftById[feature.id]?.category ?? feature.category}
                            disabled={Boolean(savingById[feature.id])}
                            onChange={(event) =>
                              setDraftById((p) => ({
                                ...p,
                                [feature.id]: {
                                  category: event.target.value as FeatureCategory,
                                  name: p[feature.id]?.name ?? feature.name ?? '',
                                  description: p[feature.id]?.description ?? feature.description ?? '',
                                },
                              }))
                            }
                            onBlur={() => void saveInline(feature)}
                          >
                            {CATEGORY_LABELS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <input
                            className="feature-card-input"
                            type="text"
                            value={draftById[feature.id]?.name ?? feature.name ?? ''}
                            disabled={Boolean(savingById[feature.id])}
                            onChange={(event) =>
                              setDraftById((p) => ({
                                ...p,
                                [feature.id]: {
                                  category: p[feature.id]?.category ?? feature.category,
                                  name: event.target.value,
                                  description: p[feature.id]?.description ?? feature.description ?? '',
                                },
                              }))
                            }
                            onBlur={() => void saveInline(feature)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                ;(event.target as HTMLInputElement).blur()
                              }
                            }}
                          />
                        </div>
                        <textarea
                          className="feature-card-textarea"
                          rows={4}
                          value={draftById[feature.id]?.description ?? feature.description ?? ''}
                          disabled={Boolean(savingById[feature.id])}
                          onChange={(event) =>
                            setDraftById((p) => ({
                              ...p,
                              [feature.id]: {
                                category: p[feature.id]?.category ?? feature.category,
                                name: p[feature.id]?.name ?? feature.name ?? '',
                                description: event.target.value,
                              },
                            }))
                          }
                          onBlur={() => void saveInline(feature)}
                        />
                        {savingById[feature.id] ? (
                          <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0' }}>Sauvegarde…</p>
                        ) : null}
                        <div className="feature-card-actions">
                          <button
                            className="btn btn-secondary btn-small"
                            type="button"
                            disabled={saving}
                            onClick={() => void handleDelete(feature)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </details>
        )
      })}

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={() => (!saving ? setIsModalOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{editingId == null ? 'Ajouter un élément' : 'Éditer un élément'}</h3>
            <form className="login-form" onSubmit={handleSave}>
              <label htmlFor="feature-category">Catégorie</label>
              <select
                id="feature-category"
                disabled={saving}
                value={form.category}
                onChange={(event) => setForm((p) => ({ ...p, category: event.target.value as FeatureCategory }))}
              >
                {CATEGORY_LABELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <label htmlFor="feature-name">Nom</label>
              <input
                id="feature-name"
                type="text"
                required
                disabled={saving}
                value={form.name}
                onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
              />

              <label htmlFor="feature-description">Description</label>
              <textarea
                id="feature-description"
                rows={5}
                disabled={saving}
                value={form.description}
                onChange={(event) => setForm((p) => ({ ...p, description: event.target.value }))}
              />

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isFeatureDetailsOpen && selectedFeature ? (
        <div className="modal-backdrop" onClick={() => setIsFeatureDetailsOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="item-details-header">
              <span className="item-details-header-name">{selectedFeature.name}</span>
              <div className="item-details-header-meta">
                <span className="item-details-header-type">
                  {CATEGORY_LABELS.find((c) => c.value === selectedFeature.category)?.label ?? selectedFeature.category}
                </span>
              </div>
            </div>

            <div className="item-details">
              <p>
                <strong>Description</strong> {selectedFeature.description?.trim() ? selectedFeature.description : '—'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-secondary" type="button" onClick={() => setIsFeatureDetailsOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

