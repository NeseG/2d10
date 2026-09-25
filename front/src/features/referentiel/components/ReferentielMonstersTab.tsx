import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/hooks/useAuth'
import { useLanguage } from '../../../app/hooks/useLanguage'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiDelete, apiGet, apiPost } from '../../../shared/api/client'
import { pickLang } from '../../../shared/utils/pickLang'
import { MonsterDetailsModal, RemoveImportedCatalogMonsterConfirmModal, type MonsterDetail } from './MonsterDetailsModal'

const MONSTER_SIZE_OPTIONS = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

const MONSTER_TYPE_SUGGESTIONS = [
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'undead',
]

const MONSTER_CR_OPTIONS = ['0', '1/8', '1/4', '1/2', ...Array.from({ length: 30 }, (_, i) => String(i + 1))]

type DndMonsterListItem = {
  id: number
  slug: string
  name: string
  nameFr: string | null
  size: string | null
  type: string | null
  typeFr: string | null
  challengeRating: string | null
  xp: number | null
}

type DndImportMonsterApiItem = MonsterDetail & { slug: string }

type MonsterCatalogItem = MonsterDetail & { slug: string; source: string | null }

const EMPTY_CREATE_MONSTER_FORM = {
  name: '',
  size: '',
  type: '',
  subtype: '',
  alignment: '',
  armorClass: '',
  hitPoints: '',
  hitDice: '',
  speed: '',
  strength: '',
  dexterity: '',
  constitution: '',
  intelligence: '',
  wisdom: '',
  charisma: '',
  challengeRating: '',
  xp: '',
  description: '',
}

function toIntOrUndefined(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function ReferentielMonstersTab() {
  const { token, user } = useAuth()
  const { language } = useLanguage()
  const { showSnackbar } = useSnackbar()
  const canManageCatalog = user?.role === 'admin' || user?.role === 'gm'
  const canValidate = user?.role === 'admin'

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [crFilter, setCrFilter] = useState('')

  const [importedItems, setImportedItems] = useState<DndMonsterListItem[]>([])
  const [importedLoading, setImportedLoading] = useState(false)
  const [importedPage, setImportedPage] = useState(1)
  const [importedTotalPages, setImportedTotalPages] = useState(1)

  const [customItems, setCustomItems] = useState<MonsterCatalogItem[]>([])
  const [customLoading, setCustomLoading] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState<MonsterDetail | null>(null)
  const [detailsImportedSlug, setDetailsImportedSlug] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const [validatingId, setValidatingId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_MONSTER_FORM)

  async function loadImported(params: { q: string; type: string; cr: string; page: number }) {
    setImportedLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '20')
      qs.set('page', String(params.page))
      if (params.q.trim()) qs.set('q', params.q.trim())
      if (params.type) qs.set('type', params.type)
      if (params.cr) qs.set('challenge_rating', params.cr)

      const res = await apiGet<{ items: DndMonsterListItem[]; pagination: { page: number; totalPages: number } }>(
        `/api/dnd5e/monsters?${qs.toString()}`,
        token,
      )
      setImportedItems(res.items)
      setImportedPage(res.pagination?.page ?? params.page)
      setImportedTotalPages(res.pagination?.totalPages ?? 1)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement catalogue monstres',
        severity: 'error',
      })
    } finally {
      setImportedLoading(false)
    }
  }

  async function loadCustom(params: { q: string; type: string; cr: string }) {
    setCustomLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '100')
      if (params.q.trim()) qs.set('q', params.q.trim())
      if (params.type) qs.set('type', params.type)
      if (params.cr) qs.set('challenge_rating', params.cr)

      const res = await apiGet<{ items: MonsterCatalogItem[] }>(`/api/monsters?${qs.toString()}`, token)
      setCustomItems(res.items.filter((item) => item.source === 'custom'))
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement monstres personnalisés',
        severity: 'error',
      })
    } finally {
      setCustomLoading(false)
    }
  }

  useEffect(() => {
    void loadImported({ q: '', type: '', cr: '', page: 1 })
    void loadCustom({ q: '', type: '', cr: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    void loadImported({ q: query, type: typeFilter, cr: crFilter, page: 1 })
    void loadCustom({ q: query, type: typeFilter, cr: crFilter })
  }

  function handleResetFilters() {
    setQuery('')
    setTypeFilter('')
    setCrFilter('')
    void loadImported({ q: '', type: '', cr: '', page: 1 })
    void loadCustom({ q: '', type: '', cr: '' })
  }

  async function openImportedDetail(slug: string) {
    setDetailsOpen(true)
    setDetailsLoading(true)
    setDetails(null)
    setDetailsImportedSlug(slug)
    try {
      const res = await apiGet<{ item: DndImportMonsterApiItem }>(`/api/dnd5e/monsters/${encodeURIComponent(slug)}`, token)
      setDetails(res.item)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement monstre',
        severity: 'error',
      })
      setDetailsOpen(false)
      setDetailsImportedSlug(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  function openCustomDetail(item: MonsterCatalogItem) {
    setDetailsImportedSlug(null)
    setDetails(item)
    setDetailsOpen(true)
  }

  async function handleConfirmDelete() {
    if (!detailsImportedSlug) return
    setDeleteSaving(true)
    try {
      await apiDelete(`/api/dnd5e/monsters/${encodeURIComponent(detailsImportedSlug)}`, token)
      showSnackbar({ message: 'Monstre retiré du catalogue importé.', severity: 'success' })
      setDeleteConfirmOpen(false)
      setDetailsOpen(false)
      setDetails(null)
      setDetailsImportedSlug(null)
      await loadImported({ q: query, type: typeFilter, cr: crFilter, page: importedPage })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression monstre importé',
        severity: 'error',
      })
    } finally {
      setDeleteSaving(false)
    }
  }

  async function handleValidate(item: MonsterCatalogItem) {
    setValidatingId(item.id)
    try {
      await apiPost(`/api/monsters/${item.id}/validate-catalog`, {}, token)
      showSnackbar({ message: 'Monstre validé et ajouté au catalogue importé.', severity: 'success' })
      await Promise.all([
        loadCustom({ q: query, type: typeFilter, cr: crFilter }),
        loadImported({ q: query, type: typeFilter, cr: crFilter, page: importedPage }),
      ])
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur validation du monstre',
        severity: 'error',
      })
    } finally {
      setValidatingId(null)
    }
  }

  async function handleCreateMonster(event: React.FormEvent) {
    event.preventDefault()
    const name = createForm.name.trim()
    if (!name) {
      showSnackbar({ message: 'Le nom est requis.', severity: 'error' })
      return
    }

    setCreateSaving(true)
    try {
      await apiPost(
        '/api/monsters',
        {
          name,
          size: createForm.size.trim() || undefined,
          type: createForm.type.trim() || undefined,
          subtype: createForm.subtype.trim() || undefined,
          alignment: createForm.alignment.trim() || undefined,
          armorClass: toIntOrUndefined(createForm.armorClass),
          hitPoints: toIntOrUndefined(createForm.hitPoints),
          hitDice: createForm.hitDice.trim() || undefined,
          speed: createForm.speed.trim() || undefined,
          strength: toIntOrUndefined(createForm.strength),
          dexterity: toIntOrUndefined(createForm.dexterity),
          constitution: toIntOrUndefined(createForm.constitution),
          intelligence: toIntOrUndefined(createForm.intelligence),
          wisdom: toIntOrUndefined(createForm.wisdom),
          charisma: toIntOrUndefined(createForm.charisma),
          challengeRating: createForm.challengeRating.trim() || undefined,
          xp: toIntOrUndefined(createForm.xp),
          description: createForm.description.trim() || undefined,
        },
        token,
      )

      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE_MONSTER_FORM)
      showSnackbar({ message: 'Monstre créé.', severity: 'success' })
      await loadCustom({ q: query, type: typeFilter, cr: crFilter })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création monstre',
        severity: 'error',
      })
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <div>
      {canManageCatalog ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button className="btn" type="button" onClick={() => setCreateOpen(true)}>
            Créer un monstre
          </button>
        </div>
      ) : null}

      <form className="login-form" onSubmit={handleSearchSubmit} style={{ marginTop: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 220, flex: '1 1 220px' }}>
            <span className="create-item-kind-label">Rechercher</span>
            <input
              id="referentiel-monster-search"
              type="search"
              placeholder="Nom, description…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <span className="create-item-kind-label">Type</span>
            <input
              id="referentiel-monster-type"
              type="text"
              list="referentiel-monster-type-suggestions"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            />
            <datalist id="referentiel-monster-type-suggestions">
              {MONSTER_TYPE_SUGGESTIONS.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>
          <div style={{ minWidth: 120 }}>
            <span className="create-item-kind-label">Challenge Rating</span>
            <select id="referentiel-monster-cr" value={crFilter} onChange={(event) => setCrFilter(event.target.value)}>
              <option value="">Tous</option>
              {MONSTER_CR_OPTIONS.map((cr) => (
                <option key={cr} value={cr}>
                  {cr}
                </option>
              ))}
            </select>
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

      <h4 style={{ marginTop: '1.25rem' }}>Monstres personnalisés {canValidate ? '(à valider)' : ''}</h4>
      {customLoading ? <p>Chargement…</p> : null}
      {!customLoading && customItems.length === 0 ? <p>Aucun monstre personnalisé.</p> : null}
      {!customLoading && customItems.length > 0 ? (
        <div className="table-wrap">
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>CR</th>
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
                  <td data-label="Type">{item.type ?? '—'}</td>
                  <td data-label="CR">{item.challengeRating ?? '—'}</td>
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
                <th>Type</th>
                <th>CR</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {importedItems.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => void openImportedDetail(item.slug)}>
                  <td data-label="Nom">
                    {pickLang(language, item.nameFr, item.name)}
                    {item.slug.startsWith('validated-monster-') && <span className="badge-homebrew">Maison</span>}
                  </td>
                  <td data-label="Type">{pickLang(language, item.typeFr, item.type) ?? '—'}</td>
                  <td data-label="CR">{item.challengeRating ?? '—'}</td>
                  <td data-label="XP">{item.xp ?? '—'}</td>
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
            onClick={() => void loadImported({ q: query, type: typeFilter, cr: crFilter, page: importedPage - 1 })}
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
            onClick={() => void loadImported({ q: query, type: typeFilter, cr: crFilter, page: importedPage + 1 })}
          >
            Suivant
          </button>
        </div>
      ) : null}

      <MonsterDetailsModal
        open={detailsOpen}
        loading={detailsLoading}
        monsterDetails={details}
        onClose={() => (!detailsLoading ? setDetailsOpen(false) : null)}
        showDeleteFromImportedCatalog={canManageCatalog && Boolean(detailsImportedSlug)}
        onDeleteFromImportedCatalog={() => setDeleteConfirmOpen(true)}
      />

      <RemoveImportedCatalogMonsterConfirmModal
        open={deleteConfirmOpen}
        removing={deleteSaving}
        onClose={() => (!deleteSaving ? setDeleteConfirmOpen(false) : null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {createOpen && (
        <div className="modal-backdrop" onClick={() => (!createSaving ? setCreateOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <label className="item-edit-title-field" htmlFor="referentiel-new-monster-name">
              <span>Créer un monstre</span>
              <input
                id="referentiel-new-monster-name"
                type="text"
                required
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <form className="login-form item-edit-form" onSubmit={handleCreateMonster}>
              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-size">
                  <span>Taille</span>
                  <select
                    id="referentiel-new-monster-size"
                    value={createForm.size}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, size: event.target.value }))}
                  >
                    <option value="">—</option>
                    {MONSTER_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-type">
                  <span>Type</span>
                  <input
                    id="referentiel-new-monster-type"
                    type="text"
                    list="referentiel-new-monster-type-suggestions"
                    value={createForm.type}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value }))}
                  />
                  <datalist id="referentiel-new-monster-type-suggestions">
                    {MONSTER_TYPE_SUGGESTIONS.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </label>
              </div>

              <label className="item-edit-form-row" htmlFor="referentiel-new-monster-subtype">
                <span>Sous-type</span>
                <input
                  id="referentiel-new-monster-subtype"
                  type="text"
                  value={createForm.subtype}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, subtype: event.target.value }))}
                />
              </label>

              <label className="item-edit-form-row" htmlFor="referentiel-new-monster-alignment">
                <span>Alignement</span>
                <input
                  id="referentiel-new-monster-alignment"
                  type="text"
                  value={createForm.alignment}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, alignment: event.target.value }))}
                />
              </label>

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-ac">
                  <span>CA</span>
                  <input
                    id="referentiel-new-monster-ac"
                    type="number"
                    value={createForm.armorClass}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, armorClass: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-hp">
                  <span>PV</span>
                  <input
                    id="referentiel-new-monster-hp"
                    type="number"
                    value={createForm.hitPoints}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, hitPoints: event.target.value }))}
                  />
                </label>
              </div>

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-hitdice">
                  <span>Dé de vie</span>
                  <input
                    id="referentiel-new-monster-hitdice"
                    type="text"
                    placeholder="ex. 8d10+16"
                    value={createForm.hitDice}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, hitDice: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-speed">
                  <span>Vitesse</span>
                  <input
                    id="referentiel-new-monster-speed"
                    type="text"
                    placeholder="ex. 30 ft., fly 60 ft."
                    value={createForm.speed}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, speed: event.target.value }))}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                  gap: '0.5rem',
                  margin: '0.5rem 0',
                }}
              >
                {(
                  [
                    ['strength', 'FOR'],
                    ['dexterity', 'DEX'],
                    ['constitution', 'CON'],
                    ['intelligence', 'INT'],
                    ['wisdom', 'SAG'],
                    ['charisma', 'CHA'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="item-edit-form-row" style={{ gridTemplateColumns: '1fr', textAlign: 'center' }} htmlFor={`referentiel-new-monster-${key}`}>
                    <span>{label}</span>
                    <input
                      id={`referentiel-new-monster-${key}`}
                      type="number"
                      value={createForm[key]}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    />
                  </label>
                ))}
              </div>

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-cr">
                  <span>CR</span>
                  <select
                    id="referentiel-new-monster-cr"
                    value={createForm.challengeRating}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, challengeRating: event.target.value }))}
                  >
                    <option value="">—</option>
                    {MONSTER_CR_OPTIONS.map((cr) => (
                      <option key={cr} value={cr}>
                        {cr}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="item-edit-form-row" htmlFor="referentiel-new-monster-xp">
                  <span>XP</span>
                  <input
                    id="referentiel-new-monster-xp"
                    type="number"
                    value={createForm.xp}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, xp: event.target.value }))}
                  />
                </label>
              </div>

              <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="referentiel-new-monster-desc">
                <span>Description</span>
                <textarea
                  id="referentiel-new-monster-desc"
                  rows={4}
                  value={createForm.description}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
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
