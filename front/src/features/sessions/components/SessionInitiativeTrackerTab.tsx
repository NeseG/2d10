import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { apiGet, apiPut, getWsApiBaseUrl } from '../../../shared/api/client'

type Combatant = {
  id: string
  name: string
  initiative: number
  ac?: number | null
  hp?: number | null
  maxHp?: number | null
  isPc: boolean
  notes?: string | null
  conditions?: string | null
  hidden: boolean
}

type StoredState = {
  version: 1
  round: number
  activeId: string | null
  combatants: Combatant[]
}

function safeParseInt(v: string): number {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}

function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function makeId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

function normalizeState(raw: unknown): StoredState {
  const s = (raw && typeof raw === 'object' ? (raw as Partial<StoredState>) : {}) as Partial<StoredState>
  const combatants = Array.isArray(s.combatants) ? s.combatants : []
  return {
    version: 1,
    round: typeof s.round === 'number' && Number.isFinite(s.round) ? s.round : 1,
    activeId: typeof s.activeId === 'string' ? s.activeId : null,
    combatants: combatants
      .map((c) => ({
        id: typeof c?.id === 'string' ? c.id : makeId(),
        name: typeof c?.name === 'string' ? c.name : '',
        initiative: typeof c?.initiative === 'number' && Number.isFinite(c.initiative) ? c.initiative : 0,
        ac: typeof c?.ac === 'number' && Number.isFinite(c.ac) ? c.ac : null,
        hp: typeof c?.hp === 'number' && Number.isFinite(c.hp) ? c.hp : null,
        maxHp: typeof c?.maxHp === 'number' && Number.isFinite(c.maxHp) ? c.maxHp : null,
        isPc: Boolean(c?.isPc),
        notes: typeof c?.notes === 'string' ? c.notes : null,
        conditions: typeof c?.conditions === 'string' ? c.conditions : null,
        hidden: Boolean(c?.hidden),
      }))
      .filter((c) => c.name.trim()),
  }
}

export function SessionInitiativeTrackerTab(props: {
  sessionId: number
  token: string
  isOwner: boolean
  quickAddCharacters?: { character_id: number; character_name?: string | null }[]
}) {
  const { sessionId, token, isOwner, quickAddCharacters } = props

  const canEdit = isOwner
  const canSeeHidden = isOwner

  const [round, setRound] = useState(1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [combatants, setCombatants] = useState<Combatant[]>([])
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSentRef = useRef<string>('')

  const [draftName, setDraftName] = useState('')
  const [draftInit, setDraftInit] = useState('10')
  const [draftHp, setDraftHp] = useState('')
  const [draftMaxHp, setDraftMaxHp] = useState('')
  const [draftIsPc, setDraftIsPc] = useState(false)

  const applyIncomingState = useCallback((state: unknown) => {
    if (!state) {
      setRound(1)
      setActiveId(null)
      setCombatants([])
      return
    }
    const normalized = normalizeState(state)
    setRound(normalized.round)
    setActiveId(normalized.activeId)
    setCombatants(normalized.combatants)
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          /* ignore */
        }
        wsRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setSyncError(null)
      try {
        const res = await apiGet<{ success: boolean; state: unknown }>(
          `/api/sessions/${sessionId}/initiative`,
          token,
        )
        applyIncomingState(res.state)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Erreur chargement initiative')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [applyIncomingState, sessionId, token])

  function buildWsUrl(): string {
    const wsBase = getWsApiBaseUrl()
    const params = new URLSearchParams({ sessionId: String(sessionId), token })
    return `${wsBase}/api/ws/session-initiative?${params.toString()}`
  }

  useEffect(() => {
    let stopped = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (stopped) return
      try {
        const ws = new WebSocket(buildWsUrl())
        wsRef.current = ws

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as { type?: string; state?: unknown }
            if (data.type === 'initiative_state') {
              applyIncomingState(data.state)
              setSyncError(null)
            }
          } catch {
            /* ignore */
          }
        }

        ws.onclose = () => {
          wsRef.current = null
          if (stopped) return
          reconnectTimer = setTimeout(connect, 2500)
        }

        ws.onerror = () => {
          try {
            ws.close()
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!stopped) reconnectTimer = setTimeout(connect, 2500)
      }
    }

    connect()
    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          /* ignore */
        }
        wsRef.current = null
      }
    }
  }, [applyIncomingState, sessionId, token])

  const persistRemote = useCallback(
    async (next: StoredState) => {
      if (!canEdit) return
      const serialized = JSON.stringify(next)
      if (serialized === lastSentRef.current) return
      lastSentRef.current = serialized
      try {
        await apiPut(`/api/sessions/${sessionId}/initiative`, { state: next }, token)
        setSyncError(null)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Erreur synchronisation initiative')
      }
    },
    [canEdit, sessionId, token],
  )

  const schedulePersist = useCallback(
    (next: StoredState) => {
      if (!canEdit) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        void persistRemote(next)
      }, 180)
    },
    [canEdit, persistRemote],
  )

  const ordered = useMemo(() => {
    const withIndex = combatants.map((c, idx) => ({ c, idx }))
    withIndex.sort((a, b) => {
      if (a.c.hidden !== b.c.hidden) return a.c.hidden ? 1 : -1
      if (b.c.initiative !== a.c.initiative) return b.c.initiative - a.c.initiative
      return a.idx - b.idx
    })
    return withIndex.map((x) => x.c)
  }, [combatants])

  const orderedVisible = useMemo(
    () => ordered.filter((c) => (canSeeHidden ? true : !c.hidden)),
    [ordered, canSeeHidden],
  )

  const activeIndex = useMemo(() => {
    if (!activeId) return -1
    return orderedVisible.findIndex((c) => c.id === activeId)
  }, [orderedVisible, activeId])

  const visibleIds = useMemo(() => orderedVisible.map((c) => c.id), [orderedVisible])

  function addCombatant() {
    if (!canEdit) return
    const name = draftName.trim()
    if (!name) return
    const id = makeId()
    const initiative = clampNumber(safeParseInt(draftInit), -50, 50)
    const hp = draftHp.trim() ? clampNumber(safeParseInt(draftHp), -999, 9999) : null
    const maxHp = draftMaxHp.trim() ? clampNumber(safeParseInt(draftMaxHp), 0, 9999) : null

    const nextCombatants: Combatant[] = [
      ...combatants,
      { id, name, initiative, ac: null, hp, maxHp, isPc: draftIsPc, notes: null, conditions: null, hidden: true },
    ]
    setCombatants(nextCombatants)
    schedulePersist({ version: 1, round, activeId, combatants: nextCombatants })
    setDraftName('')
    setDraftHp('')
    setDraftMaxHp('')
  }

  function removeCombatant(id: string) {
    if (!canEdit) return
    const nextCombatants = combatants.filter((c) => c.id !== id)
    const nextActive = activeId === id ? null : activeId
    setCombatants(nextCombatants)
    setActiveId(nextActive)
    schedulePersist({ version: 1, round, activeId: nextActive, combatants: nextCombatants })
  }

  function patchCombatant(id: string, patch: Partial<Combatant>) {
    if (!canEdit) return
    const nextCombatants = combatants.map((c) => (c.id === id ? { ...c, ...patch } : c))
    setCombatants(nextCombatants)
    schedulePersist({ version: 1, round, activeId, combatants: nextCombatants })
  }

  function startCombat() {
    if (!canEdit) return
    const first = visibleIds[0] ?? null
    setRound(1)
    setActiveId(first)
    schedulePersist({ version: 1, round: 1, activeId: first, combatants })
  }

  function clearCombat() {
    if (!canEdit) return
    setRound(1)
    setActiveId(null)
    schedulePersist({ version: 1, round: 1, activeId: null, combatants })
  }

  function nextTurn() {
    if (!canEdit) return
    if (visibleIds.length === 0) return
    if (!activeId) {
      const nextActive = visibleIds[0]
      setActiveId(nextActive)
      schedulePersist({ version: 1, round, activeId: nextActive, combatants })
      return
    }
    const idx = visibleIds.findIndex((id) => id === activeId)
    if (idx === -1) {
      const nextActive = visibleIds[0]
      setActiveId(nextActive)
      schedulePersist({ version: 1, round, activeId: nextActive, combatants })
      return
    }
    const nextIdx = (idx + 1) % visibleIds.length
    const nextActive = visibleIds[nextIdx]
    const nextRound = nextIdx === 0 ? round + 1 : round
    setRound(nextRound)
    setActiveId(nextActive)
    schedulePersist({ version: 1, round: nextRound, activeId: nextActive, combatants })
  }

  function prevTurn() {
    if (!canEdit) return
    if (visibleIds.length === 0) return
    if (!activeId) {
      const nextActive = visibleIds[0]
      setActiveId(nextActive)
      schedulePersist({ version: 1, round, activeId: nextActive, combatants })
      return
    }
    const idx = visibleIds.findIndex((id) => id === activeId)
    if (idx === -1) {
      const nextActive = visibleIds[0]
      setActiveId(nextActive)
      schedulePersist({ version: 1, round, activeId: nextActive, combatants })
      return
    }
    const prevIdx = (idx - 1 + visibleIds.length) % visibleIds.length
    const nextActive = visibleIds[prevIdx]
    const nextRound = idx === 0 ? Math.max(1, round - 1) : round
    setRound(nextRound)
    setActiveId(nextActive)
    schedulePersist({ version: 1, round: nextRound, activeId: nextActive, combatants })
  }

  function addAllPcs() {
    if (!canEdit) return
    const list = Array.isArray(quickAddCharacters) ? quickAddCharacters : []
    if (list.length === 0) return
    const existing = new Set(combatants.map((c) => c.name.trim().toLowerCase()))
    const toAdd: Combatant[] = []
    for (const e of list) {
      const name = (e.character_name ?? `Personnage #${e.character_id}`).trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (existing.has(key)) continue
      existing.add(key)
      toAdd.push({
        id: makeId(),
        name,
        initiative: 10,
        ac: null,
        hp: null,
        maxHp: null,
        isPc: true,
        notes: null,
        conditions: null,
        hidden: true,
      })
    }
    if (toAdd.length === 0) return
    const nextCombatants = [...combatants, ...toAdd]
    setCombatants(nextCombatants)
    schedulePersist({ version: 1, round, activeId, combatants: nextCombatants })
  }

  const hasActive = Boolean(activeId)
  const activeName = activeIndex >= 0 ? orderedVisible[activeIndex]?.name : null

  return (
    <div className={`initiative-tracker${isOwner ? ' initiative-tracker--owner' : ''}`}>
      {loading ? <p>Chargement…</p> : null}
      {syncError ? <p style={{ margin: 0, color: 'var(--muted)' }}>Sync: {syncError}</p> : null}

      <div className="initiative-tracker-header">
        <div className="initiative-tracker-header-left">
          <div className="initiative-tracker-round">
            <strong>Round</strong> <span className="initiative-tracker-round-value">{round}</span>
          </div>
          <div className="initiative-tracker-active">
            <strong>Tour</strong>{' '}
            <span className="initiative-tracker-active-value">{hasActive ? activeName ?? '—' : '—'}</span>
          </div>
        </div>
        {canEdit ? (
          <div className="initiative-tracker-header-actions">
            <button
              className="btn btn-secondary btn-small"
              type="button"
              onClick={prevTurn}
              disabled={!canEdit || visibleIds.length === 0}
            >
              Précédent
            </button>
            <button className="btn btn-small" type="button" onClick={nextTurn} disabled={!canEdit || visibleIds.length === 0}>
              Suivant
            </button>
            <button
              className="btn btn-secondary btn-small"
              type="button"
              onClick={startCombat}
              disabled={!canEdit || visibleIds.length === 0}
            >
              Démarrer
            </button>
            <button className="btn btn-secondary btn-small" type="button" onClick={clearCombat} disabled={!canEdit}>
              Reset tour
            </button>
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="initiative-tracker-add">
          <div className="initiative-tracker-add-row">
            <input
              type="text"
              placeholder="Nom (ex: Gobelin)"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={!canEdit}
            />
            <input
              type="number"
              placeholder="Init"
              value={draftInit}
              onChange={(e) => setDraftInit(e.target.value)}
              disabled={!canEdit}
            />
            <input
              type="number"
              placeholder="PV"
              value={draftHp}
              onChange={(e) => setDraftHp(e.target.value)}
              disabled={!canEdit}
            />
            <input
              type="number"
              placeholder="PV max"
              value={draftMaxHp}
              onChange={(e) => setDraftMaxHp(e.target.value)}
              disabled={!canEdit}
            />
            <label className="checkbox-row initiative-tracker-add-pc">
              <input
                type="checkbox"
                checked={draftIsPc}
                onChange={(e) => setDraftIsPc(e.target.checked)}
                disabled={!canEdit}
              />
              PJ
            </label>
            <button
              className="btn btn-small"
              type="button"
              onClick={addCombatant}
              disabled={!canEdit || !draftName.trim()}
            >
              Ajouter
            </button>
          </div>

          <div className="initiative-tracker-add-actions">
            <button
              className="btn btn-secondary btn-small"
              type="button"
              onClick={addAllPcs}
              disabled={!canEdit || !quickAddCharacters?.length}
            >
              Ajouter les PJ de la session
            </button>
            <button
              className="btn btn-secondary btn-small"
              type="button"
              onClick={() => {
                if (!canEdit) return
                setCombatants([])
                setActiveId(null)
                setRound(1)
                schedulePersist({ version: 1, round: 1, activeId: null, combatants: [] })
              }}
              disabled={!canEdit || combatants.length === 0}
            >
              Vider la liste
            </button>
          </div>
        </div>
      ) : null}

      {orderedVisible.length === 0 ? (
        <p style={{ color: 'var(--muted)', marginTop: '0.75rem' }}>
          {canEdit
            ? 'Ajoute des créatures/PJ, puis utilise “Démarrer” ou “Suivant” pour faire défiler les tours.'
            : 'L’initiative tracker est vide, ou des entrées sont masquées par le MJ.'}
        </p>
      ) : (
        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
          <table className="table initiative-table">
            <thead>
              <tr>
                <th className="initiative-col-active">Actif</th>
                <th className="initiative-col-name">Nom</th>
                <th className="initiative-col-init">Init</th>
                {canEdit ? <th className="initiative-col-hp">PV</th> : null}
                <th className="initiative-col-conditions">États</th>
                <th className="initiative-col-notes">Notes</th>
                {canEdit ? <th className="initiative-col-actions">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {orderedVisible.map((c) => {
                const isActive = c.id === activeId
                return (
                  <tr key={c.id} className={`${isActive ? 'initiative-row-active' : ''}${c.hidden ? ' initiative-row-hidden' : ''}`}>
                    <td className="initiative-col-active" data-label="Actif">
                      <button
                        type="button"
                        className={`tab-btn ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          if (!canEdit) return
                          const next = activeId === c.id ? null : c.id
                          setActiveId(next)
                          schedulePersist({ version: 1, round, activeId: next, combatants })
                        }}
                        aria-label={isActive ? 'Désactiver' : 'Activer'}
                        disabled={!canEdit}
                      >
                        {isActive ? '▶' : '—'}
                      </button>
                    </td>
                    <td className="initiative-col-name" data-label="Nom">
                      <div className="initiative-name-cell">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => patchCombatant(c.id, { name: e.target.value })}
                          className="initiative-cell-input"
                          disabled={!canEdit}
                        />
                        <span className={`initiative-badge ${c.isPc ? 'initiative-badge-pc' : 'initiative-badge-npc'}`}>
                          {c.isPc ? 'PJ' : 'PNJ'}
                        </span>
                      </div>
                    </td>
                    <td className="initiative-col-init" data-label="Init">
                      <input
                        type="number"
                        value={c.initiative}
                        onChange={(e) =>
                          patchCombatant(c.id, { initiative: clampNumber(safeParseInt(e.target.value), -50, 50) })
                        }
                        className="initiative-cell-input initiative-cell-number"
                        disabled={!canEdit}
                      />
                    </td>
                    {canEdit ? (
                      <td className="initiative-col-hp" data-label="PV">
                        <div className="initiative-hp-cell">
                          <input
                            type="number"
                            value={c.hp ?? ''}
                            onChange={(e) =>
                              patchCombatant(c.id, {
                                hp: e.target.value.trim()
                                  ? clampNumber(safeParseInt(e.target.value), -999, 9999)
                                  : null,
                              })
                            }
                            className="initiative-cell-input initiative-cell-number"
                            disabled={!canEdit}
                          />
                          <span className="initiative-hp-sep">/</span>
                          <input
                            type="number"
                            value={c.maxHp ?? ''}
                            onChange={(e) =>
                              patchCombatant(c.id, {
                                maxHp: e.target.value.trim()
                                  ? clampNumber(safeParseInt(e.target.value), 0, 9999)
                                  : null,
                              })
                            }
                            className="initiative-cell-input initiative-cell-number"
                            disabled={!canEdit}
                          />
                        </div>
                      </td>
                    ) : null}
                    <td className="initiative-col-conditions" data-label="États">
                      <input
                        type="text"
                        value={c.conditions ?? ''}
                        placeholder="Ex: empoisonné"
                        onChange={(e) => patchCombatant(c.id, { conditions: e.target.value })}
                        className="initiative-cell-input"
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="initiative-col-notes" data-label="Notes">
                      <input
                        type="text"
                        value={c.notes ?? ''}
                        placeholder="Ex: focus mage"
                        onChange={(e) => patchCombatant(c.id, { notes: e.target.value })}
                        className="initiative-cell-input"
                        disabled={!canEdit}
                      />
                    </td>
                    {canEdit ? (
                      <td className="initiative-col-actions" data-label="Actions">
                        <div className="initiative-actions">
                          <button className="btn btn-secondary btn-small" type="button" onClick={() => patchCombatant(c.id, { isPc: !c.isPc })} disabled={!canEdit}>
                            {c.isPc ? '→ PNJ' : '→ PJ'}
                          </button>
                          <button
                            className="btn btn-secondary btn-small initiative-visibility-toggle"
                            type="button"
                            onClick={() => patchCombatant(c.id, { hidden: !c.hidden })}
                            disabled={!canEdit}
                            title={c.hidden ? 'Afficher pour les joueurs' : 'Masquer pour les joueurs'}
                            aria-label={c.hidden ? 'Afficher pour les joueurs' : 'Masquer pour les joueurs'}
                            aria-pressed={c.hidden}
                          >
                            {c.hidden ? <EyeOff size={18} strokeWidth={2} aria-hidden="true" /> : <Eye size={18} strokeWidth={2} aria-hidden="true" />}
                          </button>
                          <button className="btn btn-secondary btn-small" type="button" onClick={() => removeCombatant(c.id)} disabled={!canEdit}>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

