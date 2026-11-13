import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../app/hooks/useAuth'
import { apiGet, apiPostFormData } from '../../../shared/api/client'
import { ITEM_ICONS_CREDIT, parseItemIconPath, type ItemIcon } from '../../../shared/inventory/itemIcons'
import { shrinkImage } from '../../maps/tokenLibrary'

const MAX_SHOWN = 200

export function ItemIconPickerModal(props: { onPick: (url: string) => void; onClose: () => void; initialQuery?: string }) {
  const { onPick, onClose, initialQuery = '' } = props
  const { token } = useAuth()
  const [paths, setPaths] = useState<ItemIcon[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState('')

  useEffect(() => {
    apiGet<{ icons: ItemIcon[] }>('/api/items/icons', token).then(
      (r) => setPaths(r.icons),
      () => setError('Liste des icônes indisponible.'),
    )
  }, [token])

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const blob = await shrinkImage(file, 256)
      const fd = new FormData()
      fd.append('image', blob, blob.type === 'image/webp' ? 'item.webp' : 'item.png')
      const r = await apiPostFormData<{ url: string }>('/api/items/images', fd, token)
      onPick(r.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import impossible.')
    } finally {
      setUploading(false)
    }
  }

  const icons = useMemo(() => (paths ?? []).map((icon) => ({ ...icon, ...parseItemIconPath(icon.path) })), [paths])
  const categories = useMemo(() => Array.from(new Set(icons.map((i) => i.category.split(' · ')[0]))), [icons])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return icons.filter((i) => (!category || i.category.split(' · ')[0] === category) && (!q || i.path.toLowerCase().includes(q)))
  }, [icons, query, category])

  return (
    // stopPropagation : rendue dans la modale d'édition, le clic ne doit pas remonter jusqu'à son fond.
    <div className="modal-backdrop" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(900px, 100%)' }}>
        <h3>Choisir une image</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <input type="search" placeholder="Rechercher (en anglais : sword, potion…)" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: '1 1 12rem' }} autoFocus />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className={`btn btn-secondary btn-small${uploading ? ' disabled' : ''}`} style={{ alignSelf: 'center' }}>
            {uploading ? 'Import…' : 'Importer une image'}
            <input type="file" hidden accept="image/png,image/webp,image/jpeg" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
        </div>

        {error ? <p style={{ color: 'var(--danger, #ef4444)' }}>{error}</p> : null}
        {paths == null && !error ? <p>Chargement…</p> : null}
        {paths != null && shown.length === 0 ? <p style={{ color: 'var(--muted)' }}>Aucune icône.</p> : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
          {shown.slice(0, MAX_SHOWN).map((i) => (
            <button
              key={i.path}
              type="button"
              className="btn btn-secondary"
              onClick={() => onPick(i.url)}
              title={`${i.name} — ${i.category}`}
              style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: 4, padding: 6 }}
            >
              <img src={i.url} alt="" loading="lazy" style={{ width: 64, height: 64, objectFit: 'contain' }} />
              <span style={{ fontSize: 11, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{i.name}</span>
            </button>
          ))}
        </div>
        {shown.length > MAX_SHOWN ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {shown.length} résultats, {MAX_SHOWN} affichés : affine la recherche.
          </p>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
          <small style={{ color: 'var(--muted)' }}>{ITEM_ICONS_CREDIT}</small>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
