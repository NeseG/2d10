import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPut, apiPutFormData, getWsApiBaseUrl } from '../../../shared/api/client'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { MapCanvas, type MapCanvasTool, type MapFogRect, type MapToken, type MapViewState } from '../../maps/components/MapCanvas'

type CampaignMap = {
  id: number
  campaign_id: number
  name: string
  image_url: string
  fog_state?: unknown
  tokens_state?: unknown
}

type MapWsPayload = {
  type?: string
  active_map_id?: number | null
  map?: CampaignMap | null
}

function uid(prefix: string) {
  try {
    return `${prefix}-${crypto.randomUUID()}`
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function SessionMapTab(props: { sessionId: number; token: string; isOwner: boolean; campaignId: number | null }) {
  const { sessionId, token, isOwner, campaignId } = props
  const { showSnackbar } = useSnackbar()

  const canEdit = isOwner

  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [activeMapId, setActiveMapId] = useState<number | null>(null)
  const [activeMap, setActiveMap] = useState<CampaignMap | null>(null)

  const [allMaps, setAllMaps] = useState<CampaignMap[]>([])
  const [mapsLoading, setMapsLoading] = useState(false)

  const [tool, setTool] = useState<MapCanvasTool>('tokens')
  const [tokens, setTokens] = useState<MapToken[]>([])
  const [fogRects, setFogRects] = useState<MapFogRect[]>([])
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [viewState, setViewState] = useState<MapViewState>({ scale: 1, tx: 0, ty: 0 })

  const wsRef = useRef<WebSocket | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSentRef = useRef<string>('')

  const applyIncoming = useCallback((payload: MapWsPayload) => {
    setActiveMapId(typeof payload.active_map_id === 'number' ? payload.active_map_id : null)
    setActiveMap(payload.map ?? null)

    const nextTokens = Array.isArray((payload.map?.tokens_state as any)?.tokens)
      ? ((payload.map?.tokens_state as any).tokens as MapToken[])
      : []
    const nextFog = Array.isArray((payload.map?.fog_state as any)?.rects)
      ? ((payload.map?.fog_state as any).rects as MapFogRect[])
      : []

    setTokens(
      nextTokens
        .filter((x) => x && typeof x.id === 'string' && Number.isFinite(x.x) && Number.isFinite(x.y))
        .map((x) => ({ ...x, x: Number(x.x), y: Number(x.y) }))
        .map((x) => ({
          ...x,
          x: x.x > 1 ? x.x / 1100 : x.x,
          y: x.y > 1 ? x.y / 650 : x.y,
        }))
        .map((x) => ({ ...x, x: clamp(x.x, 0, 1), y: clamp(x.y, 0, 1) })),
    )
    setFogRects(
      nextFog
        .filter((r) => r && typeof r.id === 'string' && Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h))
        .map((r) => ({ ...r, x: Number(r.x), y: Number(r.y), w: Number(r.w), h: Number(r.h) }))
        .map((r) => ({
          ...r,
          x: r.x > 1 ? r.x / 1100 : r.x,
          y: r.y > 1 ? r.y / 650 : r.y,
          w: r.w > 1 ? r.w / 1100 : r.w,
          h: r.h > 1 ? r.h / 650 : r.h,
        }))
        .map((r) => ({
          ...r,
          x: clamp(r.x, 0, 1),
          y: clamp(r.y, 0, 1),
          w: clamp(r.w, 0, 1),
          h: clamp(r.h, 0, 1),
        })),
    )

    setSelectedTokenId(null)
    const vs = (payload as any)?.view_state
    if (vs && typeof vs === 'object') {
      const scale = typeof vs.scale === 'number' && Number.isFinite(vs.scale) ? vs.scale : 1
      const tx = typeof vs.tx === 'number' && Number.isFinite(vs.tx) ? vs.tx : 0
      const ty = typeof vs.ty === 'number' && Number.isFinite(vs.ty) ? vs.ty : 0
      setViewState({ scale, tx, ty })
    }
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
    async function loadInitial() {
      setLoading(true)
      setSyncError(null)
      try {
        const res = await apiGet<MapWsPayload & { success: boolean }>(`/api/sessions/${sessionId}/map`, token)
        applyIncoming(res)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Erreur chargement map')
      } finally {
        setLoading(false)
      }
    }
    void loadInitial()
  }, [applyIncoming, sessionId, token])

  function buildWsUrl(): string {
    const wsBase = getWsApiBaseUrl()
    const params = new URLSearchParams({ sessionId: String(sessionId), token })
    return `${wsBase}/api/ws/session-map?${params.toString()}`
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
            const data = JSON.parse(event.data as string) as MapWsPayload
            if (data.type === 'map_state') {
              applyIncoming(data)
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
  }, [applyIncoming, sessionId, token])

  useEffect(() => {
    async function loadMaps() {
      if (!canEdit) return
      if (!campaignId) return
      setMapsLoading(true)
      try {
        const res = await apiGet<{ success: boolean; maps: CampaignMap[] }>(`/api/campaigns/${campaignId}/maps`, token)
        setAllMaps(Array.isArray(res.maps) ? res.maps : [])
      } catch (err) {
        setAllMaps([])
        showSnackbar({ message: err instanceof Error ? err.message : 'Erreur chargement cartes', severity: 'error' })
      } finally {
        setMapsLoading(false)
      }
    }
    void loadMaps()
  }, [canEdit, campaignId, token, showSnackbar])

  const imageUrl = activeMap?.image_url ?? ''

  async function setActiveMapRemote(nextId: number | null) {
    if (!canEdit) return
    try {
      await apiPut(`/api/sessions/${sessionId}/map/active`, { map_id: nextId }, token)
      setSyncError(null)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur sélection map active')
    }
  }

  async function saveStates() {
    if (!canEdit) return
    if (!activeMap) return
    try {
      const fd = new FormData()
      fd.append('name', activeMap.name)
      fd.append('tokens_state', JSON.stringify({ tokens }))
      fd.append('fog_state', JSON.stringify({ rects: fogRects }))
      await apiPutFormData(`/api/campaigns/${activeMap.campaign_id}/maps/${activeMap.id}`, fd, token)
      setSyncError(null)
      showSnackbar({ message: 'Map sauvegardée.', severity: 'success' })
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur sauvegarde map')
    }
  }

  const persistLive = useCallback(
    async (nextTokens: MapToken[], nextFog: MapFogRect[], nextView: MapViewState) => {
      if (!canEdit) return
      const serialized = JSON.stringify({ tokens: nextTokens, rects: nextFog, view: nextView })
      if (serialized === lastSentRef.current) return
      lastSentRef.current = serialized
      try {
        await apiPut(
          `/api/sessions/${sessionId}/map/state`,
          { tokens_state: { tokens: nextTokens }, fog_state: { rects: nextFog }, view_state: nextView },
          token,
        )
        setSyncError(null)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Erreur synchronisation map')
      }
    },
    [canEdit, sessionId, token],
  )

  const schedulePersistLive = useCallback(
    (nextTokens: MapToken[], nextFog: MapFogRect[], nextView: MapViewState) => {
      if (!canEdit) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        void persistLive(nextTokens, nextFog, nextView)
      }, 120)
    },
    [canEdit, persistLive],
  )

  const commitPersistLive = useCallback(() => {
    if (!canEdit) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    void persistLive(tokens, fogRects, viewState)
  }, [canEdit, fogRects, persistLive, tokens, viewState])

  function addToken() {
    if (!canEdit) return
    const id = uid('tok')
    setTokens((prev) => [
      ...prev,
      {
        id,
        label: 'Token',
        x: clamp(0.1 + prev.length * 0.01, 0, 1),
        y: clamp(0.1 + prev.length * 0.01, 0, 1),
        color: '#7c3aed',
        size: 36 / 1100,
      },
    ])
    setSelectedTokenId(id)
  }

  function deleteToken(id: string) {
    if (!canEdit) return
    setTokens((prev) => prev.filter((t) => t.id !== id))
    setSelectedTokenId((prev) => (prev === id ? null : prev))
  }

  const canShowMap = Boolean(activeMap)

  const ownerControls = useMemo(() => {
    if (!canEdit) return null
    return (
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ opacity: 0.8 }}>Map active</span>
          <select
            value={activeMapId ?? ''}
            disabled={mapsLoading}
            onChange={(e) => {
              const raw = e.target.value
              const next = raw === '' ? null : Number.parseInt(raw, 10)
              void setActiveMapRemote(Number.isFinite(next as number) ? (next as number) : null)
            }}
          >
            <option value="">— Aucune —</option>
            {allMaps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <button className={`btn${tool === 'move' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('move')} disabled={!canShowMap}>
          Déplacer
        </button>
        <button className={`btn${tool === 'tokens' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('tokens')} disabled={!canShowMap}>
          Éditer
        </button>
        <button className={`btn${tool === 'fog_add' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('fog_add')} disabled={!canShowMap}>
          Fog
        </button>
        <button className={`btn${tool === 'fog_erase' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('fog_erase')} disabled={!canShowMap}>
          Gomme
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setTool('tokens')
            addToken()
          }}
          disabled={!canShowMap}
        >
          + Token
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => setFogRects([])} disabled={!canShowMap || (tool !== 'fog_add' && tool !== 'fog_erase')}>
          Effacer fog
        </button>
        <button className="btn" type="button" onClick={() => void saveStates()} disabled={!canShowMap}>
          Sauvegarder
        </button>
      </div>
    )
  }, [activeMapId, allMaps, canEdit, canShowMap, mapsLoading, saveStates, tool])

  return (
    <div>
      {loading ? <p>Chargement…</p> : null}
      {syncError ? <p style={{ margin: 0, color: 'var(--muted)' }}>Sync: {syncError}</p> : null}
      {ownerControls ? <div style={{ marginBottom: '0.75rem' }}>{ownerControls}</div> : null}

      {canEdit && canShowMap && tool === 'tokens' ? (
        <div className="login-form" style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
          <label>Édition token</label>
          {selectedTokenId ? (
            <>
              <label htmlFor="session-map-token-label">Label</label>
              <input
                id="session-map-token-label"
                type="text"
                value={tokens.find((t) => t.id === selectedTokenId)?.label ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, label: v } : t)))
                }}
              />

              <label htmlFor="session-map-token-color">Couleur</label>
              <input
                id="session-map-token-color"
                type="color"
                value={tokens.find((t) => t.id === selectedTokenId)?.color ?? '#7c3aed'}
                onChange={(e) => {
                  const v = e.target.value
                  setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, color: v } : t)))
                }}
              />

              <label htmlFor="session-map-token-size">Taille</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.85 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, size: 0.015 } : t)))}
                >
                  Minuscule
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, size: 0.03 } : t)))}
                >
                  Petit
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, size: 0.05 } : t)))}
                >
                  Moyen
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, size: 0.08 } : t)))}
                >
                  Grand
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, size: 0.11 } : t)))}
                >
                  Très grand
                </button>
              </div>
              <input
                id="session-map-token-size"
                type="range"
                min={0.01}
                max={0.12}
                step={0.002}
                value={tokens.find((t) => t.id === selectedTokenId)?.size ?? 36 / 1100}
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value)
                  setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, size: v } : t)))
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedTokenId(null)}>
                  Désélectionner
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => deleteToken(selectedTokenId)}>
                  Supprimer
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>Clique sur un token pour l’éditer.</p>
          )}
        </div>
      ) : null}

      {!loading && !canShowMap ? <p>Aucune map active.</p> : null}

      {!loading && canShowMap ? (
        <MapCanvas
          token={token}
          imageUrl={imageUrl}
          canEdit={canEdit}
          tokens={tokens}
          fogRects={fogRects}
          onTokensChange={(next) => {
            setTokens(next)
            schedulePersistLive(next, fogRects, viewState)
          }}
          onFogRectsChange={(next) => {
            setFogRects(next)
            schedulePersistLive(tokens, next, viewState)
          }}
          tool={tool}
          onToolChange={setTool}
          selectedTokenId={selectedTokenId}
          onSelectedTokenIdChange={setSelectedTokenId}
          viewState={viewState}
          onViewStateChange={(next) => {
            setViewState(next)
            schedulePersistLive(tokens, fogRects, next)
          }}
          onCommit={commitPersistLive}
        />
      ) : null}
    </div>
  )
}

