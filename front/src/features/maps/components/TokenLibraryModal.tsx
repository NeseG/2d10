import { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPostFormData, getApiBaseUrl } from '../../../shared/api/client'
import { parseTokenPath, shrinkImage, SIZE_CELLS, type LibraryToken } from '../tokenLibrary'

const MAX_SHOWN = 150
const IMPORT_WORKERS = 4

/** Choix d'un jeton dans la bibliothèque commune ; le MJ peut y importer un dossier entier (ex. Forgotten Adventures dézippé). */
export function TokenLibraryModal(props: { token: string; canImport: boolean; onPick: (t: LibraryToken) => void; onClose: () => void }) {
  const { token, canImport, onPick, onClose } = props
  const [items, setItems] = useState<LibraryToken[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiGet<{ tokens: LibraryToken[] }>('/api/token-library', token)
      .then((r) => !cancelled && setItems(r.tokens))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Chargement impossible'))
    return () => {
      cancelled = true
    }
  }, [token, reload])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !progress && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, progress])

  const categories = useMemo(() => [...new Set((items ?? []).map((t) => t.category).filter((c): c is string => Boolean(c)))].sort(), [items])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter((t) => (!category || t.category === category) && (!q || t.name.toLowerCase().includes(q)))
  }, [items, query, category])

  async function importFiles(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => /\.(png|webp|jpe?g)$/i.test(f.name))
    if (!files.length) return
    // Reprise possible : un fichier de dossier déjà importé (même chemin) est sauté.
    const known = new Set((items ?? []).map((t) => t.source_path))
    const todo = files.filter((f) => !f.webkitRelativePath || !known.has(f.webkitRelativePath))
    const state = { done: files.length - todo.length, total: files.length, failed: 0 }
    setProgress({ ...state })
    let next = 0
    const worker = async () => {
      while (next < todo.length) {
        const f = todo[next++]
        const path = f.webkitRelativePath || f.name
        const p = parseTokenPath(path)
        try {
          // L'image couvre emprise × scale : la résolution suit, plafonnée
          const blob = await shrinkImage(f, Math.min(1024, (SIZE_CELLS[p.size] > 1 ? 512 : 256) * Math.max(1, p.scale)))
          const fd = new FormData()
          fd.append('image', blob, blob.type === 'image/webp' ? 'token.webp' : 'token.png')
          fd.append('name', p.name)
          if (p.category) fd.append('category', p.category)
          fd.append('size', p.size)
          fd.append('scale', String(p.scale))
          if (f.webkitRelativePath) fd.append('source_path', path)
          await apiPostFormData('/api/token-library', fd, token)
        } catch {
          state.failed++
        }
        state.done++
        setProgress({ ...state })
      }
    }
    await Promise.all(Array.from({ length: IMPORT_WORKERS }, worker))
    setReload((n) => n + 1)
    setTimeout(() => setProgress(null), 4000)
  }

  async function remove(t: LibraryToken) {
    if (!window.confirm(`Retirer « ${t.name} » de la bibliothèque ? Les jetons déjà posés perdront leur image.`)) return
    try {
      await apiDelete(`/api/token-library/${t.id}`, token)
      setItems((prev) => (prev ?? []).filter((x) => x.id !== t.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    }
  }

  const importing = progress != null && progress.done < progress.total
  return (
    <div className="modal-backdrop" onClick={() => !importing && onClose()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(900px, 100%)' }}>
        <h3>Bibliothèque de jetons</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <input type="search" placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: '1 1 12rem' }} autoFocus />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {canImport ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem', fontSize: 13 }}>
            <label className={`btn btn-secondary btn-small${importing ? ' disabled' : ''}`} title="Dossier dézippé : les sous-dossiers deviennent des catégories">
              Importer un dossier
              {/* webkitdirectory : attribut non typé par React, d'où le spread */}
              <input type="file" hidden multiple disabled={importing} {...{ webkitdirectory: '' }} onChange={(e) => void importFiles(e.target.files)} />
            </label>
            <label className={`btn btn-secondary btn-small${importing ? ' disabled' : ''}`}>
              Importer des images
              <input type="file" hidden multiple accept="image/png,image/webp,image/jpeg" disabled={importing} onChange={(e) => void importFiles(e.target.files)} />
            </label>
            {progress ? (
              <span>
                Import : {progress.done} / {progress.total}
                {progress.failed ? ` (${progress.failed} échec${progress.failed > 1 ? 's' : ''})` : ''}
              </span>
            ) : (
              <span style={{ color: 'var(--muted)' }}>Les images sont réduites avant l’envoi.</span>
            )}
          </div>
        ) : null}

        {error ? <p style={{ color: 'var(--danger, #ef4444)' }}>{error}</p> : null}
        {items == null && !error ? <p>Chargement…</p> : null}
        {items?.length === 0 ? <p style={{ color: 'var(--muted)' }}>Bibliothèque vide{canImport ? ' : importe un dossier de jetons.' : '.'}</p> : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
          {shown.slice(0, MAX_SHOWN).map((t) => (
            <div key={t.id} style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onPick(t)}
                title={[t.name, t.category, t.size].filter(Boolean).join(' — ')}
                style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: 4, padding: 6 }}
              >
                <img src={`${getApiBaseUrl()}${t.url}`} alt="" loading="lazy" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                <span style={{ fontSize: 11, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{t.name}</span>
              </button>
              {canImport ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => void remove(t)}
                  aria-label={`Retirer ${t.name}`}
                  title="Retirer de la bibliothèque"
                  style={{ position: 'absolute', top: 2, right: 2, padding: '0 6px', lineHeight: 1.4 }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {shown.length > MAX_SHOWN ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {shown.length} résultats, {MAX_SHOWN} affichés : affine la recherche.
          </p>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={importing}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
