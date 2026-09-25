import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/hooks/useAuth'
import { useLanguage } from '../../../app/hooks/useLanguage'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiDelete, apiGet, apiPost } from '../../../shared/api/client'
import { pickLang } from '../../../shared/utils/pickLang'
import { SpellDetailsModal, type SpellDetail } from '../../spells/components/SpellDetailsModal'
import {
  RemoveImportedCatalogSpellConfirmModal,
  SpellClassMultiSelect,
  mergeSpellClassesIntoRaw,
} from '../../spells/components/SpellEditModal'

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

type Dnd5eSpellListItem = {
  id: number
  index: string
  name: string
  nameFr: string | null
  level: number | null
  school: string | null
  schoolFr: string | null
}

type DndImportSpellApiItem = {
  id: number
  index: string
  name: string
  level: number | null
  school: string | null
  castingTime: string | null
  range: string | null
  components: string | null
  duration: string | null
  description: string | null
  higherLevel: string | null
  ritual: boolean | null
  concentration: boolean | null
  raw?: unknown
  nameFr: string | null
  schoolFr: string | null
  castingTimeFr: string | null
  rangeFr: string | null
  componentsFr: string | null
  durationFr: string | null
  descriptionFr: string | null
  higherLevelFr: string | null
}

type SpellCatalogItem = {
  id: number
  index: string
  name: string
  level: number | null
  school: string | null
  castingTime: string | null
  range: string | null
  components: string | null
  duration: string | null
  description: string | null
  higherLevel: string | null
  ritual: boolean | null
  concentration: boolean | null
  source: string | null
  raw?: unknown
}

function mapDndImportToSpellDetail(item: DndImportSpellApiItem): SpellDetail {
  return {
    id: item.id,
    index: item.index,
    name: item.name,
    level: item.level,
    school: item.school,
    castingTime: item.castingTime,
    range: item.range,
    components: item.components,
    duration: item.duration,
    description: item.description,
    higherLevel: item.higherLevel,
    ritual: item.ritual,
    concentration: item.concentration,
    source: 'dnd5e',
    raw: item.raw,
    nameFr: item.nameFr,
    schoolFr: item.schoolFr,
    castingTimeFr: item.castingTimeFr,
    rangeFr: item.rangeFr,
    componentsFr: item.componentsFr,
    durationFr: item.durationFr,
    descriptionFr: item.descriptionFr,
    higherLevelFr: item.higherLevelFr,
  }
}

function mapCustomSpellToDetail(item: SpellCatalogItem): SpellDetail {
  return {
    id: item.id,
    index: item.index,
    name: item.name,
    level: item.level,
    school: item.school,
    castingTime: item.castingTime,
    range: item.range,
    components: item.components,
    duration: item.duration,
    description: item.description,
    higherLevel: item.higherLevel,
    ritual: item.ritual,
    concentration: item.concentration,
    source: item.source,
    raw: item.raw,
  }
}

const EMPTY_CREATE_SPELL_FORM = {
  name: '',
  level: '0',
  school: '',
  spellClasses: [] as string[],
  castingTime: '',
  range: '',
  components: '',
  duration: '',
  description: '',
  higherLevel: '',
  ritual: false,
  concentration: false,
}

export function ReferentielSpellsTab() {
  const { token, user } = useAuth()
  const { language } = useLanguage()
  const { showSnackbar } = useSnackbar()
  const canManageCatalog = user?.role === 'admin' || user?.role === 'gm'
  const canValidate = user?.role === 'admin'

  const [query, setQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')

  const [importedItems, setImportedItems] = useState<Dnd5eSpellListItem[]>([])
  const [importedLoading, setImportedLoading] = useState(false)
  const [importedPage, setImportedPage] = useState(1)
  const [importedTotalPages, setImportedTotalPages] = useState(1)

  const [customItems, setCustomItems] = useState<SpellCatalogItem[]>([])
  const [customLoading, setCustomLoading] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState<SpellDetail | null>(null)
  const [detailsImportedIndex, setDetailsImportedIndex] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const [validatingId, setValidatingId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_SPELL_FORM)

  async function loadImported(params: { q: string; level: string; school: string; page: number }) {
    setImportedLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '20')
      qs.set('page', String(params.page))
      if (params.q.trim()) qs.set('q', params.q.trim())
      if (params.level) qs.set('level', params.level)
      if (params.school.trim()) qs.set('school', params.school.trim())

      const res = await apiGet<{ items: Dnd5eSpellListItem[]; pagination: { page: number; totalPages: number } }>(
        `/api/dnd5e/spells?${qs.toString()}`,
        token,
      )
      setImportedItems(res.items)
      setImportedPage(res.pagination?.page ?? params.page)
      setImportedTotalPages(res.pagination?.totalPages ?? 1)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement catalogue sorts',
        severity: 'error',
      })
    } finally {
      setImportedLoading(false)
    }
  }

  async function loadCustom(params: { q: string; level: string; school: string }) {
    setCustomLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '100')
      if (params.q.trim()) qs.set('q', params.q.trim())
      if (params.level) qs.set('level', params.level)
      if (params.school.trim()) qs.set('school', params.school.trim())

      const res = await apiGet<{ items: SpellCatalogItem[] }>(`/api/spells?${qs.toString()}`, token)
      setCustomItems(res.items.filter((item) => item.source === 'custom'))
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement sorts personnalisés',
        severity: 'error',
      })
    } finally {
      setCustomLoading(false)
    }
  }

  useEffect(() => {
    void loadImported({ q: '', level: '', school: '', page: 1 })
    void loadCustom({ q: '', level: '', school: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    void loadImported({ q: query, level: levelFilter, school: schoolFilter, page: 1 })
    void loadCustom({ q: query, level: levelFilter, school: schoolFilter })
  }

  function handleResetFilters() {
    setQuery('')
    setLevelFilter('')
    setSchoolFilter('')
    void loadImported({ q: '', level: '', school: '', page: 1 })
    void loadCustom({ q: '', level: '', school: '' })
  }

  async function openImportedDetail(index: string) {
    setDetailsOpen(true)
    setDetailsLoading(true)
    setDetails(null)
    setDetailsImportedIndex(index)
    try {
      const res = await apiGet<{ item: DndImportSpellApiItem }>(`/api/dnd5e/spells/${encodeURIComponent(index)}`, token)
      setDetails(mapDndImportToSpellDetail(res.item))
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement sort',
        severity: 'error',
      })
      setDetailsOpen(false)
      setDetailsImportedIndex(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  function openCustomDetail(item: SpellCatalogItem) {
    setDetailsImportedIndex(null)
    setDetails(mapCustomSpellToDetail(item))
    setDetailsOpen(true)
  }

  async function handleConfirmDelete() {
    if (!detailsImportedIndex) return
    setDeleteSaving(true)
    try {
      await apiDelete(`/api/dnd5e/spells/${encodeURIComponent(detailsImportedIndex)}`, token)
      showSnackbar({ message: 'Sort retiré du catalogue importé.', severity: 'success' })
      setDeleteConfirmOpen(false)
      setDetailsOpen(false)
      setDetails(null)
      setDetailsImportedIndex(null)
      await loadImported({ q: query, level: levelFilter, school: schoolFilter, page: importedPage })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression sort importé',
        severity: 'error',
      })
    } finally {
      setDeleteSaving(false)
    }
  }

  async function handleValidate(item: SpellCatalogItem) {
    setValidatingId(item.id)
    try {
      await apiPost(`/api/spells/${item.id}/validate-catalog`, {}, token)
      showSnackbar({ message: 'Sort validé et ajouté au catalogue importé.', severity: 'success' })
      await Promise.all([
        loadCustom({ q: query, level: levelFilter, school: schoolFilter }),
        loadImported({ q: query, level: levelFilter, school: schoolFilter, page: importedPage }),
      ])
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur validation du sort',
        severity: 'error',
      })
    } finally {
      setValidatingId(null)
    }
  }

  async function handleCreateSpell(event: React.FormEvent) {
    event.preventDefault()
    const name = createForm.name.trim()
    const level = Number.parseInt(createForm.level, 10)
    if (!name) {
      showSnackbar({ message: 'Le nom est requis.', severity: 'error' })
      return
    }
    if (Number.isNaN(level) || level < 0 || level > 9) {
      showSnackbar({ message: 'Le niveau doit être entre 0 et 9.', severity: 'error' })
      return
    }

    setCreateSaving(true)
    try {
      const rawPayload = createForm.spellClasses.length > 0 ? mergeSpellClassesIntoRaw(null, createForm.spellClasses) : null

      await apiPost(
        '/api/spells',
        {
          name,
          level,
          school: createForm.school.trim() || undefined,
          castingTime: createForm.castingTime.trim() || undefined,
          range: createForm.range.trim() || undefined,
          components: createForm.components.trim() || undefined,
          duration: createForm.duration.trim() || undefined,
          description: createForm.description.trim() || undefined,
          higherLevel: createForm.higherLevel.trim() || undefined,
          ritual: Boolean(createForm.ritual),
          concentration: Boolean(createForm.concentration),
          raw: rawPayload,
        },
        token,
      )

      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE_SPELL_FORM)
      showSnackbar({ message: 'Sort créé.', severity: 'success' })
      await loadCustom({ q: query, level: levelFilter, school: schoolFilter })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création sort',
        severity: 'error',
      })
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="btn" type="button" onClick={() => setCreateOpen(true)}>
          Créer un sort
        </button>
      </div>

      <form className="login-form" onSubmit={handleSearchSubmit} style={{ marginTop: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 220, flex: '1 1 220px' }}>
            <span className="create-item-kind-label">Rechercher</span>
            <input
              id="referentiel-spell-search"
              type="search"
              placeholder="Nom, description…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div style={{ minWidth: 120 }}>
            <span className="create-item-kind-label">Niveau</span>
            <select id="referentiel-spell-level" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
              <option value="">Tous</option>
              {Array.from({ length: 10 }, (_, level) => level).map((level) => (
                <option key={level} value={level}>
                  {level === 0 ? 'Sort mineur' : `Niveau ${level}`}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 180 }}>
            <span className="create-item-kind-label">École</span>
            <input
              id="referentiel-spell-school"
              type="text"
              list="referentiel-spell-school-suggestions"
              value={schoolFilter}
              onChange={(event) => setSchoolFilter(event.target.value)}
            />
            <datalist id="referentiel-spell-school-suggestions">
              {SPELL_SCHOOL_SUGGESTIONS.map((school) => (
                <option key={school} value={school} />
              ))}
            </datalist>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" type="submit" disabled={importedLoading || customLoading}>
              Rechercher
            </button>
            <button className="btn btn-secondary" type="button" disabled={importedLoading || customLoading} onClick={handleResetFilters}>
              Réinitialiser
            </button>
          </div>
        </div>
      </form>

      <h4 style={{ marginTop: '1.25rem' }}>Sorts personnalisés {canValidate ? '(à valider)' : ''}</h4>
      {customLoading ? <p>Chargement…</p> : null}
      {!customLoading && customItems.length === 0 ? <p>Aucun sort personnalisé.</p> : null}
      {!customLoading && customItems.length > 0 ? (
        <div className="table-wrap">
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Niveau</th>
                <th>École</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customItems.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => openCustomDetail(item)}>
                  <td data-label="Nom">
                    {item.name}
                    <span className="badge-homebrew">Personnalisé</span>
                  </td>
                  <td data-label="Niveau">{item.level ?? '—'}</td>
                  <td data-label="École">{item.school ?? '—'}</td>
                  <td data-label="Actions" onClick={(event) => event.stopPropagation()}>
                    {canValidate ? (
                      <button
                        className="btn btn-secondary btn-small"
                        type="button"
                        disabled={validatingId === item.id}
                        onClick={() => void handleValidate(item)}
                      >
                        {validatingId === item.id ? 'Validation…' : 'Valider'}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h4 style={{ marginTop: '1.5rem' }}>Catalogue importé (D&amp;D 5e)</h4>
      {importedLoading ? <p>Chargement…</p> : null}
      {!importedLoading && importedItems.length === 0 ? <p>Aucun résultat.</p> : null}
      {!importedLoading && importedItems.length > 0 ? (
        <div className="table-wrap">
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Niveau</th>
                <th>École</th>
              </tr>
            </thead>
            <tbody>
              {importedItems.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => void openImportedDetail(item.index)}>
                  <td data-label="Nom">
                    {pickLang(language, item.nameFr, item.name)}
                    {item.index.startsWith('validated-spell-') && <span className="badge-homebrew">Maison</span>}
                  </td>
                  <td data-label="Niveau">{item.level ?? '—'}</td>
                  <td data-label="École">{pickLang(language, item.schoolFr, item.school) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {importedItems.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={importedLoading || importedPage <= 1}
            onClick={() => void loadImported({ q: query, level: levelFilter, school: schoolFilter, page: importedPage - 1 })}
          >
            Précédent
          </button>
          <span>
            Page {importedPage} / {importedTotalPages}
          </span>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={importedLoading || importedPage >= importedTotalPages}
            onClick={() => void loadImported({ q: query, level: levelFilter, school: schoolFilter, page: importedPage + 1 })}
          >
            Suivant
          </button>
        </div>
      ) : null}

      <SpellDetailsModal
        open={detailsOpen}
        loading={detailsLoading}
        spellDetails={details}
        onClose={() => (!detailsLoading ? setDetailsOpen(false) : null)}
        showDeleteFromImportedCatalog={canManageCatalog && Boolean(detailsImportedIndex)}
        onDeleteFromImportedCatalog={() => setDeleteConfirmOpen(true)}
      />

      <RemoveImportedCatalogSpellConfirmModal
        open={deleteConfirmOpen}
        removing={deleteSaving}
        onClose={() => (!deleteSaving ? setDeleteConfirmOpen(false) : null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {createOpen && (
        <div className="modal-backdrop" onClick={() => (!createSaving ? setCreateOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <label className="item-edit-title-field" htmlFor="referentiel-new-spell-name">
              <span>Créer un sort</span>
              <input
                id="referentiel-new-spell-name"
                type="text"
                required
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <form className="login-form item-edit-form" onSubmit={handleCreateSpell}>
              <div className="item-edit-form-inline-pair spell-edit-level-school-row">
                <label className="item-edit-form-row" htmlFor="referentiel-new-spell-level">
                  <span>Niveau</span>
                  <input
                    className="spell-edit-level-input"
                    id="referentiel-new-spell-level"
                    type="number"
                    min={0}
                    max={9}
                    value={createForm.level}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, level: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="referentiel-new-spell-school">
                  <span>École</span>
                  <input
                    className="spell-edit-school-input"
                    id="referentiel-new-spell-school"
                    type="text"
                    list="referentiel-new-spell-school-suggestions"
                    value={createForm.school}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, school: event.target.value }))}
                  />
                </label>
                <datalist id="referentiel-new-spell-school-suggestions">
                  {SPELL_SCHOOL_SUGGESTIONS.map((school) => (
                    <option key={school} value={school} />
                  ))}
                </datalist>
              </div>

              <SpellClassMultiSelect
                id="referentiel-new-spell-classes"
                value={createForm.spellClasses}
                onChange={(next) => setCreateForm((prev) => ({ ...prev, spellClasses: next }))}
                disabled={createSaving}
              />

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="referentiel-new-spell-casting">
                  <span>Casting time</span>
                  <input
                    id="referentiel-new-spell-casting"
                    type="text"
                    value={createForm.castingTime}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, castingTime: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="referentiel-new-spell-duration">
                  <span>Duration</span>
                  <input
                    id="referentiel-new-spell-duration"
                    type="text"
                    value={createForm.duration}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, duration: event.target.value }))}
                  />
                </label>
              </div>

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="referentiel-new-spell-range">
                  <span>Range</span>
                  <input
                    id="referentiel-new-spell-range"
                    type="text"
                    value={createForm.range}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, range: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="referentiel-new-spell-components">
                  <span>Components</span>
                  <input
                    id="referentiel-new-spell-components"
                    type="text"
                    value={createForm.components}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, components: event.target.value }))}
                  />
                </label>
              </div>

              <div className="item-edit-armor-checks">
                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    checked={createForm.ritual}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, ritual: event.target.checked }))}
                  />
                  Rituel
                </label>
                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    checked={createForm.concentration}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, concentration: event.target.checked }))}
                  />
                  Concentration
                </label>
              </div>

              <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="referentiel-new-spell-desc">
                <span>Description</span>
                <textarea
                  id="referentiel-new-spell-desc"
                  rows={4}
                  value={createForm.description}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>

              <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="referentiel-new-spell-higher">
                <span>Higher level</span>
                <textarea
                  id="referentiel-new-spell-higher"
                  rows={3}
                  value={createForm.higherLevel}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, higherLevel: event.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" type="submit" disabled={createSaving}>
                  {createSaving ? 'Création…' : 'Créer'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={createSaving} onClick={() => setCreateOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
