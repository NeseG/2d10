import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChartNoAxesCombined, RefreshCw } from 'lucide-react'
import { apiGet, apiPost } from '../../../shared/api/client'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { SessionDiceLabelDistributionChart } from './SessionDiceLabelDistributionChart'

export type SessionDiceRollEntry = {
  id: number
  user_id: number
  username: string | null
  character_id: number | null
  character_name: string | null
  notation: string
  rolls: number[]
  modifier: number
  total: number
  label: string | null
  created_at: string
  /** Jet enregistré sans tirage serveur (dés physiques, autre app). */
  is_manual?: boolean
}

const QUICK_SIDES = [4, 6, 8, 10, 12, 20, 100] as const

const DICE_NOTE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Initiative', label: 'Initiative' },
  { value: 'Dégâts', label: 'Dégâts' },
  { value: 'Attaque', label: 'Attaque' },
  { value: 'Compétence', label: 'Compétence' },
  { value: 'Sauvegarde', label: 'Sauvegarde' },
] as const

function normalizeRolls(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
}

export type SessionDiceCharacterOption = {
  character_id: number
  character_name?: string | null
  is_companion?: boolean
}

type DiceCharacterStats = {
  key: string
  displayName: string
  count: number
  min: number
  max: number
  avg: number
}

/** Valeur `label` envoyée quand on choisit « Dégâts » dans la liste. */
const DICE_LABEL_DEGATS = 'Dégâts'

type DiceDamageCharacterStats = DiceCharacterStats & { total: number }

function formatDiceAvg(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function rollStatsBucket(r: SessionDiceRollEntry, groupByPlayer: boolean): { key: string; displayName: string } {
  if (groupByPlayer) {
    const uid = r.user_id
    const dn = (r.username ?? `Joueur #${uid}`).trim() || `Joueur #${uid}`
    return { key: `u:${uid}`, displayName: dn }
  }
  if (r.character_id != null && Number.isFinite(r.character_id)) {
    const dn = (r.character_name?.trim() || `Personnage #${r.character_id}`).trim()
    return { key: `c:${r.character_id}`, displayName: dn || `Personnage #${r.character_id}` }
  }
  const uid = r.user_id
  const dn = (r.username ?? `Joueur #${uid}`).trim() || `Joueur #${uid}`
  return { key: `u:${uid}`, displayName: dn }
}

function computeDiceStats(rolls: SessionDiceRollEntry[], groupByPlayer: boolean) {
  const allTotals = rolls.map((r) => r.total)
  const global = {
    count: allTotals.length,
    min: allTotals.length ? Math.min(...allTotals) : 0,
    max: allTotals.length ? Math.max(...allTotals) : 0,
    avg: allTotals.length ? allTotals.reduce((a, b) => a + b, 0) / allTotals.length : 0,
  }

  const byCharacterDamage = new Map<string, { displayName: string; totals: number[] }>()
  for (const r of rolls) {
    if ((r.label?.trim() ?? '') !== DICE_LABEL_DEGATS) continue
    const { key, displayName } = rollStatsBucket(r, groupByPlayer)
    const bucket = byCharacterDamage.get(key) ?? { displayName, totals: [] }
    bucket.displayName = displayName
    bucket.totals.push(r.total)
    byCharacterDamage.set(key, bucket)
  }

  const damageCharacters: DiceDamageCharacterStats[] = [...byCharacterDamage.entries()]
    .map(([key, { displayName, totals }]) => {
      const sum = totals.reduce((a, b) => a + b, 0)
      return {
        key,
        displayName,
        count: totals.length,
        min: Math.min(...totals),
        max: Math.max(...totals),
        avg: totals.length ? sum / totals.length : 0,
        total: sum,
      }
    })
    .sort((a, b) => b.total - a.total)

  return { global, damageCharacters }
}

export function SessionDiceTab(props: {
  sessionId: number
  token: string
  currentUserId: number
  /** Propriétaire (MJ) : affichage des dés par joueur, pas de sélecteur ; jets enregistrés avec le 1er personnage de la session. */
  isSessionOwner: boolean
  rollingCharacterId: number | null
  diceCharacters: SessionDiceCharacterOption[]
  onRollingCharacterIdChange?: (characterId: number) => void
}) {
  const {
    sessionId,
    token,
    currentUserId,
    isSessionOwner,
    rollingCharacterId,
    diceCharacters,
    onRollingCharacterIdChange,
  } = props
  const { showSnackbar } = useSnackbar()

  const effectiveCharacterId = useMemo(() => {
    if (isSessionOwner) {
      const first = diceCharacters[0]?.character_id
      return typeof first === 'number' && Number.isFinite(first) ? first : null
    }
    return rollingCharacterId
  }, [isSessionOwner, diceCharacters, rollingCharacterId])

  const canRoll = effectiveCharacterId != null && Number.isFinite(effectiveCharacterId)
  const showCharacterPicker = !isSessionOwner && diceCharacters.length > 1

  const [rolls, setRolls] = useState<SessionDiceRollEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rolling, setRolling] = useState(false)

  const [notationDraft, setNotationDraft] = useState('1d20')
  const [notationNoteKind, setNotationNoteKind] = useState('')
  const [manualJetDraft, setManualJetDraft] = useState('')
  const [manualTotalDraft, setManualTotalDraft] = useState('')
  const [manualNoteKind, setManualNoteKind] = useState('')
  const [statsModalOpen, setStatsModalOpen] = useState(false)

  const diceStats = useMemo(() => computeDiceStats(rolls, isSessionOwner), [rolls, isSessionOwner])

  const loadRolls = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; rolls: SessionDiceRollEntry[] }>(
        `/api/sessions/${sessionId}/dice-rolls?limit=120`,
        token,
      )
      const list = Array.isArray(res.rolls) ? res.rolls : []
      setRolls(
        list.map((r) => {
          const rollsNorm = normalizeRolls(r.rolls)
          const cid = r.character_id
          return {
            ...r,
            character_id: typeof cid === 'number' && Number.isFinite(cid) ? cid : null,
            character_name: typeof r.character_name === 'string' ? r.character_name : null,
            rolls: rollsNorm,
            is_manual: Boolean(r.is_manual ?? rollsNorm.length === 0),
          }
        }),
      )
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement des dés',
        severity: 'error',
      })
    }
  }, [sessionId, token, showSnackbar])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      await loadRolls()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadRolls])

  useEffect(() => {
    const t = window.setInterval(() => {
      void loadRolls()
    }, 12000)
    return () => window.clearInterval(t)
  }, [loadRolls])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await loadRolls()
    } finally {
      setRefreshing(false)
    }
  }

  async function submitRoll(payload: Record<string, unknown>) {
    if (!canRoll || effectiveCharacterId == null) {
      showSnackbar({
        message: isSessionOwner
          ? 'Aucun personnage associé à la session : impossible d’enregistrer un jet.'
          : 'Choisis un personnage pour enregistrer le jet.',
        severity: 'error',
      })
      return
    }
    setRolling(true)
    try {
      await apiPost(
        `/api/sessions/${sessionId}/dice-rolls`,
        { ...payload, character_id: effectiveCharacterId },
        token,
      )
      await loadRolls()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lancer de dés',
        severity: 'error',
      })
    } finally {
      setRolling(false)
    }
  }

  async function quickRoll(sides: number) {
    await submitRoll({
      count: 1,
      sides,
      modifier: 0,
      ...(notationNoteKind ? { label: notationNoteKind } : {}),
    })
  }

  async function rollNotation(event: React.FormEvent) {
    event.preventDefault()
    const notation = notationDraft.trim()
    if (!notation) return
    await submitRoll({
      notation,
      ...(notationNoteKind ? { label: notationNoteKind } : {}),
    })
  }

  async function submitManualRoll(event: React.FormEvent) {
    event.preventDefault()
    const jet = manualJetDraft.trim()
    if (!jet) {
      showSnackbar({ message: 'Indique le jet réalisé.', severity: 'error' })
      return
    }
    const total = Number.parseInt(String(manualTotalDraft).trim(), 10)
    if (!Number.isFinite(total)) {
      showSnackbar({ message: 'Indique un résultat numérique.', severity: 'error' })
      return
    }
    await submitRoll({
      manual: true,
      jet,
      total,
      ...(manualNoteKind ? { label: manualNoteKind } : {}),
    })
    setManualTotalDraft('')
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="session-dice-tab">
      {showCharacterPicker ? (
        <div className="session-dice-character-row login-form">
          <label htmlFor="session-dice-character-select">Personnage pour les jets</label>
          <select
            id="session-dice-character-select"
            value={effectiveCharacterId != null ? String(effectiveCharacterId) : ''}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10)
              if (Number.isFinite(v)) onRollingCharacterIdChange?.(v)
            }}
            disabled={rolling}
            aria-label="Personnage pour les jets de dés"
          >
            {diceCharacters.map((c) => (
              <option key={c.character_id} value={c.character_id}>
                {c.is_companion ? '· ' : ''}
                {c.character_name?.trim() || `Personnage #${c.character_id}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="session-dice-toolbar">
        <div className="session-dice-quick">
          <span className="session-dice-quick-label">Rapide</span>
          <div className="session-dice-quick-btns">
            {QUICK_SIDES.map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-secondary btn-small"
                disabled={rolling || !canRoll}
                onClick={() => void quickRoll(s)}
              >
                d{s}
              </button>
            ))}
          </div>
        </div>

        <form className="session-dice-form" onSubmit={rollNotation}>
          <label className="session-dice-field">
            <span>Notation</span>
            <input
              type="text"
              value={notationDraft}
              onChange={(e) => setNotationDraft(e.target.value)}
              placeholder="ex. 2d6+3, 4d6"
              disabled={rolling || !canRoll}
              autoComplete="off"
            />
          </label>
          <label className="session-dice-field session-dice-field-note">
            <span>Note (optionnel)</span>
            <select
              value={notationNoteKind}
              onChange={(e) => setNotationNoteKind(e.target.value)}
              disabled={rolling || !canRoll}
              aria-label="Type de jet (optionnel)"
            >
              {DICE_NOTE_OPTIONS.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-small" type="submit" disabled={rolling || !canRoll}>
            Lancer
          </button>
        </form>

        <form className="session-dice-form session-dice-form-manual" onSubmit={(e) => void submitManualRoll(e)}>
          <h4 className="session-dice-manual-title">Enregistrer un jet réalisé</h4>
          <div className="session-dice-manual-fields">
            <label className="session-dice-field session-dice-field-grow">
              <span>Jet réalisé</span>
              <input
                type="text"
                value={manualJetDraft}
                onChange={(e) => setManualJetDraft(e.target.value)}
                placeholder="ex. 1d20+3, 2d6 feu, avantage…"
                disabled={rolling || !canRoll}
                maxLength={64}
                autoComplete="off"
              />
            </label>
            <label className="session-dice-field session-dice-field-tight">
              <span>Résultat</span>
              <input
                type="number"
                value={manualTotalDraft}
                onChange={(e) => setManualTotalDraft(e.target.value)}
                placeholder="Total"
                disabled={rolling || !canRoll}
              />
            </label>
            <label className="session-dice-field session-dice-field-note">
              <span>Note (optionnel)</span>
              <select
                value={manualNoteKind}
                onChange={(e) => setManualNoteKind(e.target.value)}
                disabled={rolling || !canRoll}
                aria-label="Type de jet (optionnel)"
              >
                {DICE_NOTE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none-manual'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn btn-secondary btn-small session-dice-manual-submit"
              type="submit"
              disabled={rolling || !canRoll}
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>

      <div className="session-dice-history-head">
        <div className="session-dice-history-title-block">
          <h4 className="session-dice-history-title">Historique de la session</h4>
          <button
            type="button"
            className="btn btn-secondary btn-small session-dice-stats-btn"
            onClick={() => setStatsModalOpen(true)}
            disabled={loading}
            title="Statistiques des jets"
            aria-label="Statistiques des jets"
          >
            <ChartNoAxesCombined size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-small session-dice-refresh"
          onClick={() => void handleRefresh()}
          disabled={refreshing || loading}
          title="Actualiser"
          aria-label="Actualiser l’historique"
        >
          <RefreshCw size={16} aria-hidden="true" className={refreshing ? 'session-dice-refresh-spin' : ''} />
        </button>
      </div>

      {statsModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setStatsModalOpen(false)
          }}
        >
          <div className="modal-card session-dice-stats-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Statistiques des jets</h3>
            <p className="session-dice-stats-hint">
              Données basées sur les jets chargés dans cet onglet (jusqu’à 120). Utilise « Actualiser » pour
              mettre à jour.
            </p>

            {diceStats.global.count === 0 ? (
              <p className="session-dice-stats-empty">Aucun jet à analyser.</p>
            ) : (
              <>
                <section className="session-dice-stats-section">
                  <h4 className="session-dice-stats-section-title">Vue d’ensemble</h4>
                  <ul className="session-dice-stats-summary">
                    <li>
                      <strong>{diceStats.global.count}</strong> jet{diceStats.global.count > 1 ? 's' : ''}
                    </li>
                    <li>
                      Moyenne des totaux : <strong>{formatDiceAvg(diceStats.global.avg)}</strong>
                    </li>
                    <li>
                      Min. / max. : <strong>{diceStats.global.min}</strong> /{' '}
                      <strong>{diceStats.global.max}</strong>
                    </li>
                  </ul>
                </section>

                <section className="session-dice-stats-section session-dice-stats-section-charts">
                  <h4 className="session-dice-stats-section-title">Répartition des totaux (courbes)</h4>
                  <p className="session-dice-chart-section-intro">
                    {isSessionOwner
                      ? 'Une courbe par joueur (nom de compte) : fréquence de chaque total pour les jets '
                      : 'Une courbe par personnage : fréquence de chaque total pour les jets '}
                    étiquetés <strong>Compétence</strong> ou <strong>Attaque</strong>.
                  </p>
                  <SessionDiceLabelDistributionChart
                    title="Jets « Compétence »"
                    rolls={rolls}
                    labelExact="Compétence"
                    emptyMessage="Aucun jet Compétence dans cet historique."
                    groupByPlayer={isSessionOwner}
                  />
                  <SessionDiceLabelDistributionChart
                    title="Jets « Attaque »"
                    rolls={rolls}
                    labelExact="Attaque"
                    emptyMessage="Aucun jet Attaque dans cet historique."
                    groupByPlayer={isSessionOwner}
                  />
                </section>

                <section className="session-dice-stats-section session-dice-stats-section-damage">
                  <h4 className="session-dice-stats-section-title">Jets étiquetés « Dégâts »</h4>
                  <p className="session-dice-stats-damage-intro">
                    Totaux des résultats uniquement pour les jets dont la note est <strong>Dégâts</strong>.
                  </p>
                  {diceStats.damageCharacters.length === 0 ? (
                    <p className="session-dice-stats-empty session-dice-stats-empty-inline">
                      Aucun jet Dégâts dans cet historique.
                    </p>
                  ) : (
                    <div className="table-wrap">
                      <table className="table session-dice-stats-table">
                        <thead>
                          <tr>
                            <th>{isSessionOwner ? 'Joueur' : 'Personnage'}</th>
                            <th>Jets</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th>Moyenne</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diceStats.damageCharacters.map((p) => (
                            <tr key={p.key}>
                              <td>{p.displayName}</td>
                              <td>{p.count}</td>
                              <td>{p.min}</td>
                              <td>{p.max}</td>
                              <td>{formatDiceAvg(p.avg)}</td>
                              <td>{p.total.toLocaleString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}

            <div className="session-dice-stats-modal-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setStatsModalOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? <p className="session-dice-loading">Chargement…</p> : null}

      {!loading && rolls.length === 0 ? (
        <p className="session-dice-empty">Aucun lancer enregistré pour l’instant.</p>
      ) : null}

      {!loading && rolls.length > 0 ? (
        <ul className="session-dice-list">
          {rolls.map((r) => {
            const mine = isSessionOwner
              ? r.user_id === currentUserId
              : r.character_id != null && rollingCharacterId != null
                ? r.character_id === rollingCharacterId
                : r.character_id == null && r.user_id === currentUserId
            const manual = Boolean(r.is_manual)
            const diceStr = r.rolls.length ? r.rolls.join(', ') : '—'
            const modStr =
              r.modifier === 0 ? '' : r.modifier > 0 ? ` + ${r.modifier}` : ` − ${Math.abs(r.modifier)}`
            const whoLabel = isSessionOwner
              ? (r.username ?? `Joueur #${r.user_id}`).trim() || `Joueur #${r.user_id}`
              : r.character_id != null
                ? (r.character_name?.trim() || `Personnage #${r.character_id}`).trim() ||
                  `Personnage #${r.character_id}`
                : (r.username ?? `Joueur #${r.user_id}`).trim() || `Joueur #${r.user_id}`
            return (
              <li key={r.id} className={`session-dice-row${mine ? ' session-dice-row-mine' : ''}`}>
                <span className="session-dice-row-time">{formatTime(r.created_at)}</span>
                <span className="session-dice-row-user">{whoLabel}</span>
                <span className="session-dice-row-formula">
                  <strong>{r.notation}</strong>
                  {r.label ? <span className="session-dice-row-label"> — {r.label}</span> : null}
                </span>
                <span className="session-dice-row-detail">
                  {manual ? (
                    <span className="session-dice-row-manual">Saisi manuellement</span>
                  ) : (
                    <>
                      [{diceStr}]{modStr}
                    </>
                  )}
                </span>
                <span className="session-dice-row-total">= {r.total}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
