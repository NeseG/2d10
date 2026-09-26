import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/hooks/useAuth'
import { useLanguage } from '../../../app/hooks/useLanguage'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiDelete, apiGet } from '../../../shared/api/client'
import { pickLang } from '../../../shared/utils/pickLang'
import {
  MagicItemDetailsModal,
  RemoveImportedCatalogMagicItemConfirmModal,
  type MagicItemDetail,
} from './MagicItemDetailsModal'

const MAGIC_ITEM_RARITY_OPTIONS = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies']

const MAGIC_ITEM_RARITY_FR: Record<string, string> = {
  Common: 'Commun',
  Uncommon: 'Peu commun',
  Rare: 'Rare',
  'Very Rare': 'Très rare',
  Legendary: 'Légendaire',
  Artifact: 'Artefact',
  Varies: 'Variable',
}

const MAGIC_ITEM_CATEGORY_OPTIONS = [
  { index: 'armor', name: 'Armor', nameFr: 'Armure' },
  { index: 'ammunition', name: 'Ammunition', nameFr: 'Munition' },
  { index: 'wondrous-items', name: 'Wondrous Items', nameFr: 'Objets merveilleux' },
  { index: 'potion', name: 'Potion', nameFr: 'Potion' },
  { index: 'weapon', name: 'Weapon', nameFr: 'Arme' },
  { index: 'ring', name: 'Ring', nameFr: 'Anneau' },
  { index: 'rod', name: 'Rod', nameFr: 'Sceptre' },
  { index: 'scroll', name: 'Scroll', nameFr: 'Parchemin' },
  { index: 'staff', name: 'Staff', nameFr: 'Bâton' },
  { index: 'wand', name: 'Wand', nameFr: 'Baguette' },
]

type DndMagicItemListItem = {
  id: number
  index: string
  name: string
  nameFr: string | null
  categoryIndex: string | null
  categoryName: string | null
  categoryNameFr: string | null
  rarity: string | null
  rarityFr: string | null
}

export function ReferentielMagicItemsTab() {
  const { token, user } = useAuth()
  const { language } = useLanguage()
  const { showSnackbar } = useSnackbar()
  const canManageCatalog = user?.role === 'admin' || user?.role === 'gm'

  const [query, setQuery] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [importedItems, setImportedItems] = useState<DndMagicItemListItem[]>([])
  const [importedLoading, setImportedLoading] = useState(false)
  const [importedPage, setImportedPage] = useState(1)
  const [importedTotalPages, setImportedTotalPages] = useState(1)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState<MagicItemDetail | null>(null)
  const [detailsIndex, setDetailsIndex] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)

  async function loadImported(params: { q: string; rarity: string; category: string; page: number }) {
    setImportedLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '20')
      qs.set('page', String(params.page))
      if (params.q.trim()) qs.set('q', params.q.trim())
      if (params.rarity) qs.set('rarity', params.rarity)
      if (params.category) qs.set('category', params.category)

      const res = await apiGet<{ items: DndMagicItemListItem[]; pagination: { page: number; totalPages: number } }>(
        `/api/dnd5e/magic-items?${qs.toString()}`,
        token,
      )
      setImportedItems(res.items)
      setImportedPage(res.pagination?.page ?? params.page)
      setImportedTotalPages(res.pagination?.totalPages ?? 1)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement catalogue objets magiques',
        severity: 'error',
      })
    } finally {
      setImportedLoading(false)
    }
  }

  useEffect(() => {
    void loadImported({ q: '', rarity: '', category: '', page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    void loadImported({ q: query, rarity: rarityFilter, category: categoryFilter, page: 1 })
  }

  function handleResetFilters() {
    setQuery('')
    setRarityFilter('')
    setCategoryFilter('')
    void loadImported({ q: '', rarity: '', category: '', page: 1 })
  }

  async function openImportedDetail(index: string) {
    setDetailsOpen(true)
    setDetailsLoading(true)
    setDetails(null)
    setDetailsIndex(index)
    try {
      const res = await apiGet<{ magic_item: MagicItemDetail }>(`/api/dnd5e/magic-items/${encodeURIComponent(index)}`, token)
      setDetails(res.magic_item)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement objet magique',
        severity: 'error',
      })
      setDetailsOpen(false)
      setDetailsIndex(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  async function handleConfirmDelete() {
    if (!detailsIndex) return
    setDeleteSaving(true)
    try {
      await apiDelete(`/api/dnd5e/magic-items/${encodeURIComponent(detailsIndex)}`, token)
      showSnackbar({ message: 'Objet magique retiré du catalogue importé.', severity: 'success' })
      setDeleteConfirmOpen(false)
      setDetailsOpen(false)
      setDetails(null)
      setDetailsIndex(null)
      await loadImported({ q: query, rarity: rarityFilter, category: categoryFilter, page: importedPage })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression objet magique importé',
        severity: 'error',
      })
    } finally {
      setDeleteSaving(false)
    }
  }

  return (
    <div>
      <form className="login-form" onSubmit={handleSearchSubmit} style={{ marginTop: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 220, flex: '1 1 220px' }}>
            <span className="create-item-kind-label">Rechercher</span>
            <input
              id="referentiel-magic-item-search"
              type="search"
              placeholder="Nom, description…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <span className="create-item-kind-label">Rareté</span>
            <select
              id="referentiel-magic-item-rarity"
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value)}
            >
              <option value="">Toutes</option>
              {MAGIC_ITEM_RARITY_OPTIONS.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {language === 'fr' ? MAGIC_ITEM_RARITY_FR[rarity] ?? rarity : rarity}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <span className="create-item-kind-label">Catégorie</span>
            <select
              id="referentiel-magic-item-category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Toutes</option>
              {MAGIC_ITEM_CATEGORY_OPTIONS.map((category) => (
                <option key={category.index} value={category.index}>
                  {language === 'fr' ? category.nameFr : category.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" type="submit" disabled={importedLoading}>
              Rechercher
            </button>
            <button className="btn btn-secondary" type="button" disabled={importedLoading} onClick={handleResetFilters}>
              Réinitialiser
            </button>
          </div>
        </div>
      </form>

      <h4 style={{ marginTop: '1.5rem' }}>Catalogue importé (D&amp;D 5e)</h4>
      {importedLoading ? <p>Chargement…</p> : null}
      {!importedLoading && importedItems.length === 0 ? <p>Aucun résultat.</p> : null}
      {!importedLoading && importedItems.length > 0 ? (
        <div className="table-wrap">
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Rareté</th>
              </tr>
            </thead>
            <tbody>
              {importedItems.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => void openImportedDetail(item.index)}>
                  <td data-label="Nom">{pickLang(language, item.nameFr, item.name)}</td>
                  <td data-label="Catégorie">{pickLang(language, item.categoryNameFr, item.categoryName) ?? '—'}</td>
                  <td data-label="Rareté">{pickLang(language, item.rarityFr, item.rarity) ?? '—'}</td>
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
            onClick={() =>
              void loadImported({ q: query, rarity: rarityFilter, category: categoryFilter, page: importedPage - 1 })
            }
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
            onClick={() =>
              void loadImported({ q: query, rarity: rarityFilter, category: categoryFilter, page: importedPage + 1 })
            }
          >
            Suivant
          </button>
        </div>
      ) : null}

      <MagicItemDetailsModal
        open={detailsOpen}
        loading={detailsLoading}
        magicItemDetails={details}
        onClose={() => (!detailsLoading ? setDetailsOpen(false) : null)}
        showDeleteFromImportedCatalog={canManageCatalog && Boolean(detailsIndex)}
        onDeleteFromImportedCatalog={() => setDeleteConfirmOpen(true)}
      />

      <RemoveImportedCatalogMagicItemConfirmModal
        open={deleteConfirmOpen}
        removing={deleteSaving}
        onClose={() => (!deleteSaving ? setDeleteConfirmOpen(false) : null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}
