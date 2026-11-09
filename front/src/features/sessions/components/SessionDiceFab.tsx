import { useEffect, useRef, useState } from 'react'
import { Dices } from 'lucide-react'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet } from '../../../shared/api/client'
import { postSessionDiceRoll, type DiceFavorite } from '../sessionDice'
import type { SessionDiceRollEntry } from './SessionDiceTab'

const FAB_QUICK_SIDES = [4, 6, 8, 10, 12, 20, 100] as const

/** Bouton flottant de la session live : jets favoris + dés rapides, animés en 3D. */
export function SessionDiceFab(props: {
  sessionId: number
  token: string
  characterId: number | null
  favorites: DiceFavorite[]
  /** Remonte le bouton au-dessus du dock d’onglets fixe en bas. */
  raised: boolean
}) {
  const { sessionId, token, characterId, favorites, raised } = props
  const { showSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [recent, setRecent] = useState<SessionDiceRollEntry[]>([])
  /** Accordéon fermé par défaut ; l’état est gardé tant que la page est ouverte. */
  const [recentOpen, setRecentOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Rechargé à chaque ouverture de l’accordéon : pas de polling, ni de requête s’il reste fermé.
  useEffect(() => {
    if (!open || !recentOpen) return
    let cancelled = false
    apiGet<{ rolls: SessionDiceRollEntry[] }>(`/api/sessions/${sessionId}/dice-rolls?limit=15`, token)
      .then((res) => !cancelled && setRecent(Array.isArray(res.rolls) ? res.rolls : []))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, recentOpen, sessionId, token])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function roll(payload: Record<string, unknown>, name: string) {
    if (characterId == null) {
      showSnackbar({ message: 'Choisis un personnage pour lancer les dés.', severity: 'error' })
      return
    }
    setOpen(false)
    setRolling(true)
    try {
      const r = await postSessionDiceRoll(sessionId, token, characterId, payload)
      showSnackbar({ message: `${name} (${r.notation}) : ${r.total}`, severity: 'success' })
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur lancer de dés', severity: 'error' })
    } finally {
      setRolling(false)
    }
  }

  return (
    <div ref={rootRef} className={`dice-fab${raised ? ' dice-fab--raised' : ''}`}>
      {open ? (
        <div className="dice-fab-menu" role="menu" aria-label="Lancer des dés">
          <span className="session-dice-quick-label">Favoris</span>
          {favorites.length === 0 ? (
            <p className="session-dice-fav-empty">Ajoute des favoris depuis l’onglet Dés.</p>
          ) : (
            <div className="dice-fab-favs">
              {favorites.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="menuitem"
                  className="dice-fab-fav"
                  onClick={() => void roll({ notation: f.notation, ...(f.label ? { label: f.label } : {}) }, f.name)}
                >
                  <span>{f.name}</span>
                  <span className="dice-fab-fav-notation">{f.notation}</span>
                </button>
              ))}
            </div>
          )}
          <span className="session-dice-quick-label">Rapide</span>
          <div className="session-dice-quick-btns">
            {FAB_QUICK_SIDES.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitem"
                className="btn btn-secondary btn-small"
                onClick={() => void roll({ count: 1, sides: s, modifier: 0 }, `d${s}`)}
              >
                d{s}
              </button>
            ))}
          </div>
          <details
            className="dice-fab-recent-details"
            open={recentOpen}
            onToggle={(e) => {
              const el = e.currentTarget
              setRecentOpen(el.open)
              // Sur petit écran le menu défile : ramener la liste dépliée dans la vue.
              if (el.open) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }))
            }}
          >
            <summary className="session-dice-quick-label">Derniers jets</summary>
            {recent.length === 0 ? (
              <p className="session-dice-fav-empty">Aucun jet pour l’instant.</p>
            ) : (
              <ul className="dice-fab-recent" tabIndex={0} aria-label="Derniers jets de la session">
                {recent.map((r) => (
                  <li key={r.id}>
                    <span className="dice-fab-recent-who">
                      {r.character_name?.trim() || r.username?.trim() || `Joueur #${r.user_id}`}
                    </span>
                    <span className="dice-fab-recent-notation">
                      {r.notation}
                      {r.label ? ` · ${r.label}` : ''}
                    </span>
                    <strong className="dice-fab-recent-total">{r.total}</strong>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
      ) : null}
      <button
        type="button"
        className="dice-fab-btn"
        onClick={() => setOpen((v) => !v)}
        disabled={rolling}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Lancer des dés"
        title="Lancer des dés"
      >
        <Dices size={22} aria-hidden="true" />
      </button>
    </div>
  )
}
