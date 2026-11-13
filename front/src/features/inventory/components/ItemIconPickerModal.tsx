import { useEffect, useMemo, useState } from 'react'
import { ITEM_ICONS_CREDIT, itemIconUrl, loadItemIconPaths, parseItemIconPath } from '../../../shared/inventory/itemIcons'

const MAX_SHOWN = 200

export function ItemIconPickerModal(props: { onPick: (url: string) => void; onClose: () => void; initialQuery?: string }) {
  const { onPick, onClose, initialQuery = '' } = props
  const [paths, setPaths] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState('')

  useEffect(() => {
    loadItemIconPaths().then(setPaths, () => setError('Liste des icônes indisponible.'))
  }, [])

  const icons = useMemo(() => (paths ?? []).map((path) => ({ path, ...parseItemIconPath(path) })), [paths])
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
              onClick={() => onPick(itemIconUrl(i.path))}
              title={`${i.name} — ${i.category}`}
              style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: 4, padding: 6 }}
            >
              <img src={itemIconUrl(i.path)} alt="" loading="lazy" style={{ width: 64, height: 64, objectFit: 'contain' }} />
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
