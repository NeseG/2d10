import { useEffect, useState } from 'react'
import { useLanguage } from '../../../app/hooks/useLanguage'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet } from '../../../shared/api/client'
import { pickLang } from '../../../shared/utils/pickLang'

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

type ImportedMonsterItem = {
  id: number
  slug: string
  name: string
  nameFr: string | null
  type: string | null
  typeFr: string | null
  challengeRating: string | null
  xp: number | null
}

type CustomMonsterItem = {
  id: number
  name: string
  type: string | null
  challengeRating: string | null
  armorClass: number | null
  hitPoints: number | null
}

export type MonsterRef = { source: 'dnd5e'; slug: string } | { source: 'custom'; id: number }

export type AddMonsterSelection = {
  name: string
  ac: number | null
  hp: number | null
  maxHp: number | null
  monsterRef: MonsterRef
}

function buildSelections(
  baseName: string,
  quantity: number,
  ac: number | null,
  hp: number | null,
  monsterRef: MonsterRef,
): AddMonsterSelection[] {
  const qty = Math.min(20, Math.max(1, quantity))
  return Array.from({ length: qty }, (_, i) => ({
    name: qty > 1 ? `${baseName} ${i + 1}` : baseName,
    ac: ac ?? null,
    hp: hp ?? null,
    maxHp: hp ?? null,
    monsterRef,
  }))
}

export function AddMonsterModal(props: {
  open: boolean
  token: string
  onClose: () => void
  onAdd: (selections: AddMonsterSelection[]) => void
}) {
  const { open, token, onClose, onAdd } = props
  const { language } = useLanguage()
  const { showSnackbar } = useSnackbar()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [crFilter, setCrFilter] = useState('')

  const [importedItems, setImportedItems] = useState<ImportedMonsterItem[]>([])
  const [importedLoading, setImportedLoading] = useState(false)
  const [importedPage, setImportedPage] = useState(1)
  const [importedTotalPages, setImportedTotalPages] = useState(1)

  const [customItems, setCustomItems] = useState<CustomMonsterItem[]>([])
  const [customLoading, setCustomLoading] = useState(false)

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [addingKey, setAddingKey] = useState<string | null>(null)

  async function loadImported(params: { q: string; type: string; cr: string; page: number }) {
    setImportedLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '20')
      qs.set('page', String(params.page))
      if (params.q.trim()) qs.set('q', params.q.trim())
      if (params.type) qs.set('type', params.type)
      if (params.cr) qs.set('challenge_rating', params.cr)

      const res = await apiGet<{ items: ImportedMonsterItem[]; pagination: { page: number; totalPages: number } }>(
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

      const res = await apiGet<{ items: CustomMonsterItem[] }>(`/api/monsters?${qs.toString()}`, token)
      setCustomItems(res.items)
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
    if (!open) return
    setQuery('')
    setTypeFilter('')
    setCrFilter('')
    void loadImported({ q: '', type: '', cr: '', page: 1 })
    void loadCustom({ q: '', type: '', cr: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token])

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

  function quantityFor(key: string): number {
    return quantities[key] ?? 1
  }

  function setQuantity(key: string, value: string) {
    const n = Number.parseInt(value, 10)
    setQuantities((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 1 }))
  }

  async function handleAddImported(item: ImportedMonsterItem) {
    const key = `i:${item.slug}`
    setAddingKey(key)
    try {
      const res = await apiGet<{ item: { name: string; nameFr?: string | null; armorClass?: number | null; hitPoints?: number | null } }>(
        `/api/dnd5e/monsters/${encodeURIComponent(item.slug)}`,
        token,
      )
      const detail = res.item
      const baseName = pickLang(language, detail.nameFr, detail.name) ?? detail.name
      onAdd(
        buildSelections(baseName, quantityFor(key), detail.armorClass ?? null, detail.hitPoints ?? null, {
          source: 'dnd5e',
          slug: item.slug,
        }),
      )
      showSnackbar({ message: `${baseName} ajouté à l'initiative.`, severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur ajout du monstre',
        severity: 'error',
      })
    } finally {
      setAddingKey(null)
    }
  }

  function handleAddCustom(item: CustomMonsterItem) {
    const key = `c:${item.id}`
    onAdd(
      buildSelections(item.name, quantityFor(key), item.armorClass ?? null, item.hitPoints ?? null, {
        source: 'custom',
        id: item.id,
      }),
    )
    showSnackbar({ message: `${item.name} ajouté à l'initiative.`, severity: 'success' })
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(event) => event.stopPropagation()}>
        <div className="item-details-header">
          <span className="item-details-header-name">Ajouter un monstre à l'initiative</span>
          <button className="btn btn-secondary btn-small" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <form className="login-form" onSubmit={handleSearchSubmit} style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 220, flex: '1 1 220px' }}>
              <span className="create-item-kind-label">Rechercher</span>
              <input
                type="search"
                placeholder="Nom du monstre…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div style={{ minWidth: 160 }}>
              <span className="create-item-kind-label">Type</span>
              <input
                type="text"
                list="add-monster-type-suggestions"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              />
              <datalist id="add-monster-type-suggestions">
                {MONSTER_TYPE_SUGGESTIONS.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div style={{ minWidth: 120 }}>
              <span className="create-item-kind-label">Challenge Rating</span>
              <select value={crFilter} onChange={(event) => setCrFilter(event.target.value)}>
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

        {customItems.length > 0 || customLoading ? (
          <>
            <h4 style={{ marginTop: '1.25rem' }}>Monstres personnalisés</h4>
            {customLoading ? <p>Chargement…</p> : null}
            {!customLoading && customItems.length > 0 ? (
              <div className="table-wrap">
                <table className="table responsive-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Type</th>
                      <th>CR</th>
                      <th>Qté</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customItems.map((item) => {
                      const key = `c:${item.id}`
                      return (
                        <tr key={item.id}>
                          <td data-label="Nom">{item.name}</td>
                          <td data-label="Type">{item.type ?? '—'}</td>
                          <td data-label="CR">{item.challengeRating ?? '—'}</td>
                          <td data-label="Qté">
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={quantityFor(key)}
                              onChange={(event) => setQuantity(key, event.target.value)}
                              style={{ width: '3.5rem' }}
                            />
                          </td>
                          <td data-label="Actions">
                            <button className="btn btn-small" type="button" onClick={() => handleAddCustom(item)}>
                              Ajouter
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
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
                  <th>Qté</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {importedItems.map((item) => {
                  const key = `i:${item.slug}`
                  return (
                    <tr key={item.id}>
                      <td data-label="Nom">{pickLang(language, item.nameFr, item.name)}</td>
                      <td data-label="Type">{pickLang(language, item.typeFr, item.type) ?? '—'}</td>
                      <td data-label="CR">{item.challengeRating ?? '—'}</td>
                      <td data-label="XP">{item.xp ?? '—'}</td>
                      <td data-label="Qté">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={quantityFor(key)}
                          onChange={(event) => setQuantity(key, event.target.value)}
                          style={{ width: '3.5rem' }}
                        />
                      </td>
                      <td data-label="Actions">
                        <button
                          className="btn btn-small"
                          type="button"
                          disabled={addingKey === key}
                          onClick={() => void handleAddImported(item)}
                        >
                          {addingKey === key ? 'Ajout…' : 'Ajouter'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
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
      </div>
    </div>
  )
}
