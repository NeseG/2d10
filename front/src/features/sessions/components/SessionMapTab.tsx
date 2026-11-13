import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut, getApiBaseUrl } from '../../../shared/api/client'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import {
  MapCanvas,
  type MapCanvasTool,
  type MapPing,
  type MapTemplateShape,
  type MapToken,
  type MapTokenStatus,
  type MapViewState,
} from '../../maps/components/MapCanvas'
import {
  EMPTY_SCENE,
  SIZE_PRESETS,
  clamp,
  fogStateOf,
  normName,
  num,
  parseScene,
  tokensStateOf,
  type CampaignMap,
  type Scene,
} from '../../maps/scene'
import { FogToolbar } from '../../maps/components/FogToolbar'
import { TokenLibraryModal } from '../../maps/components/TokenLibraryModal'
import { SIZE_CELLS, type LibraryToken } from '../../maps/tokenLibrary'
import { useFogEditor, useFogMask } from '../../maps/useFogEditor'
import type { FogBitmap, FogShape } from '../../maps/fog'
import { useSessionSocket } from '../useSessionSocket'

type MapWsPayload = {
  type?: string
  active_map_id?: number | null
  map?: CampaignMap | null
  view_state?: unknown
}

type SessionCharacter = { character_id: number; character_name?: string | null; character_user_id?: number | null; avatar_url?: string | null }

/** Sous-ensemble de l'état du tracker d'initiative utile à la carte. */
type Combatant = { id: string; name: string; hp?: number | null; maxHp?: number | null; conditions?: string | null; isPc?: boolean; hidden?: boolean }
type InitiativeState = { activeId?: string | null; combatants?: Combatant[] } | null

const TOOL_HINTS: Partial<Record<MapCanvasTool, string>> = {
  move: 'Glisser un jeton pour le déplacer. Double-clic sur la carte = ping.',
  ruler: 'Glisser pour mesurer une distance.',
  ping: 'Cliquer sur la carte pour attirer l’attention de la table.',
  template: 'Glisser depuis l’origine du sort. Double-clic sur un gabarit pour le supprimer.',
}

function uid(prefix: string) {
  try {
    return `${prefix}-${crypto.randomUUID()}`
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

export function SessionMapTab(props: {
  sessionId: number
  token: string
  isOwner: boolean
  campaignId: number | null
  currentUserId?: number | null
  characters?: SessionCharacter[]
}) {
  const { sessionId, token, isOwner, campaignId, currentUserId, characters = [] } = props
  const { showSnackbar } = useSnackbar()

  const canEdit = isOwner

  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [activeMapId, setActiveMapId] = useState<number | null>(null)
  const [activeMap, setActiveMap] = useState<CampaignMap | null>(null)

  const [allMaps, setAllMaps] = useState<CampaignMap[]>([])
  const [mapsLoading, setMapsLoading] = useState(false)

  const [tool, setTool] = useState<MapCanvasTool>(canEdit ? 'tokens' : 'move')
  const [scene, setScene] = useState<Scene>(EMPTY_SCENE)
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [viewState, setViewState] = useState<MapViewState>({ scale: 1, tx: 0, ty: 0 })
  // Coché par le MJ : les joueurs suivent son cadrage ; sinon chacun déplace et zoome sa carte librement.
  const [followView, setFollowView] = useState(false)
  const [templateShape, setTemplateShape] = useState<MapTemplateShape>('circle')
  const [pings, setPings] = useState<MapPing[]>([])
  const [initiative, setInitiative] = useState<InitiativeState>(null)
  const [fogShape, setFogShape] = useState<FogShape>('rect')
  const [fogBrush, setFogBrush] = useState(2)
  const [aspect, setAspect] = useState<number | null>(null)
  // Vue joueur (MJ) : la carte telle qu'un joueur la voit ; `null` = vue de groupe, sinon le personnage choisi.
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [playerView, setPlayerView] = useState<{ characterId: number | null } | null>(null)

  // Vrai seulement après une modification locale du MJ : évite de renvoyer au serveur ce qu'il vient de nous pousser.
  const dirtyRef = useRef(false)
  const lastSentRef = useRef<string>('')

  const edit = useCallback((patch: Partial<Scene> | ((prev: Scene) => Partial<Scene>)) => {
    dirtyRef.current = true
    setScene((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])
  const editToken = (id: string, patch: Partial<MapToken>) =>
    edit((prev) => ({ tokens: prev.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  const applyIncoming = useCallback((payload: MapWsPayload) => {
    setActiveMapId(typeof payload.active_map_id === 'number' ? payload.active_map_id : null)
    setActiveMap(payload.map ?? null)
    const next = parseScene(payload.map)
    setScene(next)
    setSelectedTokenId((prev) => (prev && next.tokens.some((t) => t.id === prev) ? prev : null))
    const vs = payload.view_state as (Partial<MapViewState> & { unit?: string; follow?: boolean }) | null | undefined
    const follow = vs?.follow === true
    setFollowView(follow)
    // Ancien cadrage en pixels d'écran (sans `unit`) : on ne garde que le zoom.
    const rel = vs?.unit === 'w'
    // Joueur en vue libre : son cadrage reste le sien.
    if (vs && typeof vs === 'object' && (canEdit || follow))
      setViewState({ scale: num(vs.scale, 1), tx: rel ? num(vs.tx, 0) : 0, ty: rel ? num(vs.ty, 0) : 0 })
  }, [canEdit])

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
      try {
        const res = await apiGet<{ state: InitiativeState }>(`/api/sessions/${sessionId}/initiative`, token)
        setInitiative(res.state ?? null)
      } catch {
        /* pas de combat en cours : la carte marche sans */
      }
    }
    void loadInitial()
  }, [applyIncoming, sessionId, token])

  const sendMapWs = useSessionSocket(
    '/api/ws/session-map',
    sessionId,
    token,
    useCallback(
      (raw: unknown) => {
        const data = raw as MapWsPayload & { x?: number; y?: number }
        if (data.type === 'map_state') {
          applyIncoming(data)
          setSyncError(null)
        } else if (data.type === 'map_ping' && typeof data.x === 'number' && typeof data.y === 'number') {
          const ping = { id: uid('ping'), x: data.x, y: data.y }
          setPings((prev) => [...prev, ping])
          setTimeout(() => setPings((prev) => prev.filter((p) => p.id !== ping.id)), 2700)
        }
      },
      [applyIncoming],
    ),
  )

  useSessionSocket(
    '/api/ws/session-initiative',
    sessionId,
    token,
    useCallback((raw: unknown) => {
      const data = raw as { type?: string; state?: InitiativeState }
      if (data.type === 'initiative_state') setInitiative(data.state ?? null)
    }, []),
  )

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

  // Synchro live du MJ : toute modification locale part au serveur (regroupée sur 120 ms), qui la rediffuse.
  useEffect(() => {
    if (!canEdit || !dirtyRef.current) return
    const timer = setTimeout(async () => {
      dirtyRef.current = false
      const body = { tokens_state: tokensStateOf(scene), fog_state: fogStateOf(scene), view_state: { ...viewState, unit: 'w', follow: followView } }
      const serialized = JSON.stringify(body)
      if (serialized === lastSentRef.current) return
      lastSentRef.current = serialized
      try {
        await apiPut(`/api/sessions/${sessionId}/map/state`, body, token)
        setSyncError(null)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Erreur synchronisation map')
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [canEdit, scene, viewState, followView, sessionId, token])

  async function setActiveMapRemote(nextId: number | null) {
    if (!canEdit) return
    try {
      await apiPut(`/api/sessions/${sessionId}/map/active`, { map_id: nextId }, token)
      setSyncError(null)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur sélection map active')
    }
  }

  async function resetToTemplate() {
    if (!canEdit || !activeMap) return
    if (!window.confirm('Remettre la carte comme dans l’éditeur ? Jetons, brouillard et portes de la partie seront perdus.')) return
    try {
      await apiPut(`/api/sessions/${sessionId}/map/reset`, {}, token)
      setSyncError(null)
      showSnackbar({ message: 'Carte remise à l’état du modèle.', severity: 'success' })
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur réinitialisation map')
    }
  }

  async function forgetExploration() {
    if (!window.confirm('Effacer tout ce que le groupe a déjà exploré sur cette carte ?')) return
    try {
      await apiDelete(`/api/sessions/${sessionId}/map/explored`, token)
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur', severity: 'error' })
    }
  }

  async function revealTokenView(tokenId: string) {
    try {
      await apiPost(`/api/sessions/${sessionId}/map/reveal`, { token_id: tokenId }, token)
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Révélation impossible', severity: 'error' })
    }
  }

  async function movePlayerToken(id: string, x: number, y: number) {
    try {
      await apiPut(`/api/sessions/${sessionId}/map/tokens/${encodeURIComponent(id)}/position`, { x, y }, token)
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Déplacement refusé', severity: 'error' })
    }
  }

  const { tokens, grid } = scene
  const fog = useFogEditor({
    fog: scene.fog,
    legacyRects: scene.fogRects,
    gridSize: grid.size,
    aspect,
    resetKey: activeMapId,
    onChange: useCallback((next: FogBitmap) => edit({ fog: next }), [edit]),
  })
  const myCharacterIds = useMemo(
    () => (currentUserId == null ? [] : characters.filter((c) => c.character_user_id === currentUserId).map((c) => c.character_id)),
    [characters, currentUserId],
  )
  const characterImages = useMemo(
    () => Object.fromEntries(characters.filter((c) => c.avatar_url).map((c) => [c.character_id, `${getApiBaseUrl()}${c.avatar_url}`])),
    [characters],
  )

  // Lien jeton ↔ tracker d'initiative : par nom (le tracker n'a pas d'autre identifiant commun avec la carte).
  const tokenStatus = useMemo(() => {
    const byName = new Map((initiative?.combatants ?? []).map((c) => [normName(c.name), c]))
    const out: Record<string, MapTokenStatus> = {}
    for (const t of tokens) {
      const c = byName.get(normName(t.label))
      if (c) out[t.id] = { hp: c.hp, maxHp: c.maxHp, conditions: c.conditions, active: c.id === initiative?.activeId }
    }
    return out
  }, [initiative, tokens])

  const missingCombatants = (initiative?.combatants ?? []).filter(
    (c) => c.name.trim() && !tokens.some((t) => normName(t.label) === normName(c.name)),
  )

  function newTokenPosition(index: number) {
    return { x: clamp(0.1 + index * grid.size, 0, 0.9), y: 0.1 }
  }

  function addToken() {
    const id = uid('tok')
    edit((prev) => ({
      tokens: [...prev.tokens, { id, label: 'Token', ...newTokenPosition(prev.tokens.length), color: '#7c3aed', size: prev.grid.size }],
    }))
    setSelectedTokenId(id)
  }

  function addLibraryToken(t: LibraryToken) {
    const id = uid('tok')
    edit((prev) => ({
      tokens: [
        ...prev.tokens,
        { id, label: t.name, ...newTokenPosition(prev.tokens.length), color: '#7c3aed', size: SIZE_CELLS[t.size] * prev.grid.size, image: t.url, imageScale: t.scale },
      ],
    }))
    setTool('tokens')
    setSelectedTokenId(id)
    setLibraryOpen(false)
  }

  function addTokensFromInitiative() {
    edit((prev) => ({
      tokens: [
        ...prev.tokens,
        ...missingCombatants.map((c, i) => ({
          id: uid('tok'),
          label: c.name,
          ...newTokenPosition(prev.tokens.length + i),
          color: c.isPc ? '#2563eb' : '#b91c1c',
          size: prev.grid.size,
          hidden: Boolean(c.hidden),
          characterId: characters.find((ch) => normName(ch.character_name) === normName(c.name))?.character_id ?? null,
        })),
      ],
    }))
  }

  const canShowMap = Boolean(activeMap)
  // En vue joueur, le MJ voit et agit comme un joueur : outils d'édition masqués, carte en lecture.
  const editing = canEdit && !playerView
  const exploredMask = useFogMask(scene.explored)
  const pcTokens = tokens.filter((t) => t.characterId != null && !t.hidden)
  const selected = tokens.find((t) => t.id === selectedTokenId) ?? null
  const pcTokenCount = tokens.filter((t) => t.characterId != null && !t.hidden).length

  const toolButton = (t: MapCanvasTool, label: string) => (
    <button key={t} className={`btn${tool === t ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool(t)} disabled={!canShowMap} aria-pressed={tool === t}>
      {label}
    </button>
  )
  const rowStyle = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' } as const
  const numberInput = (label: string, value: number, onChange: (v: number) => void, opts: { min?: number; max?: number; step?: number } = {}) => (
    <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <input
        type="number"
        style={{ width: 80 }}
        value={value}
        {...opts}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value)
          if (Number.isFinite(v)) onChange(v)
        }}
      />
    </label>
  )
  const checkbox = (label: string, checked: boolean, onChange: (v: boolean) => void, disabled = false) => (
    <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )

  return (
    <div>
      {loading ? <p>Chargement…</p> : null}
      {syncError ? <p style={{ margin: 0, color: 'var(--muted)' }}>Sync: {syncError}</p> : null}

      {canEdit ? (
        <div style={{ ...rowStyle, marginBottom: '0.5rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ opacity: 0.8 }}>Map active</span>
            <select
              value={activeMapId ?? ''}
              disabled={mapsLoading}
              onChange={(e) => {
                const next = e.target.value === '' ? null : Number.parseInt(e.target.value, 10)
                void setActiveMapRemote(Number.isFinite(next as number) ? next : null)
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
          <button className="btn btn-secondary" type="button" onClick={() => setLibraryOpen(true)} disabled={!canShowMap}>
            + Depuis la bibliothèque
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={addTokensFromInitiative}
            disabled={!canShowMap || missingCombatants.length === 0}
            title="Crée un jeton par combattant du tracker d’initiative qui n’en a pas encore"
          >
            + Depuis l’initiative{missingCombatants.length ? ` (${missingCombatants.length})` : ''}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => void resetToTemplate()}
            disabled={!canShowMap || !activeMap?.has_play_state}
            title="La partie est enregistrée automatiquement, à part de la carte préparée dans l’éditeur"
          >
            Réinitialiser depuis le modèle
          </button>
          <button
            className={`btn${playerView ? '' : ' btn-secondary'}`}
            type="button"
            aria-pressed={Boolean(playerView)}
            onClick={() => {
              if (!playerView && tool !== 'move' && tool !== 'ruler' && tool !== 'ping') setTool('move')
              setPlayerView(playerView ? null : { characterId: null })
            }}
            disabled={!canShowMap}
            title="Voir la carte comme la voient les joueurs"
          >
            Vue joueur
          </button>
          {playerView ? (
            <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>À travers</span>
              <select
                value={playerView.characterId ?? ''}
                onChange={(e) => setPlayerView({ characterId: e.target.value === '' ? null : Number.parseInt(e.target.value, 10) })}
              >
                <option value="">Tout le groupe</option>
                {pcTokens.map((t) => (
                  <option key={t.id} value={t.characterId ?? ''}>
                    {t.label || `Personnage #${t.characterId}`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {playerView ? (
        <p role="status" style={{ margin: '0 0 0.5rem', padding: '0.4rem 0.6rem', borderRadius: 8, background: 'rgba(250,204,21,0.12)', fontSize: 13 }}>
          Vue joueur : brouillard et obscurité opaques, jetons cachés ou hors de vue masqués. Les outils d’édition reviennent en quittant ce mode.
        </p>
      ) : null}

      <div style={{ ...rowStyle, marginBottom: '0.5rem' }} role="toolbar" aria-label="Outils de carte">
        {toolButton('move', 'Déplacer')}
        {editing ? toolButton('tokens', 'Éditer') : null}
        {toolButton('ruler', 'Règle')}
        {toolButton('ping', 'Ping')}
        {editing
          ? [
              toolButton('template', 'Gabarit'),
              toolButton('fog_add', 'Fog'),
              toolButton('fog_erase', 'Gomme'),
            ]
          : null}
      </div>

      {canShowMap && TOOL_HINTS[tool] ? <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: 13 }}>{TOOL_HINTS[tool]}</p> : null}

      {editing && canShowMap ? (
        <div style={{ ...rowStyle, marginBottom: '0.75rem' }}>
          {tool === 'template' ? (
            <>
              <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ opacity: 0.8 }}>Forme</span>
                <select value={templateShape} onChange={(e) => setTemplateShape(e.target.value as MapTemplateShape)}>
                  <option value="circle">Sphère / cercle</option>
                  <option value="cone">Cône</option>
                  <option value="line">Ligne</option>
                  <option value="cube">Cube</option>
                </select>
              </label>
              <button className="btn btn-secondary" type="button" onClick={() => edit({ templates: [] })} disabled={scene.templates.length === 0}>
                Effacer les gabarits
              </button>
            </>
          ) : null}
          {tool === 'fog_add' || tool === 'fog_erase' ? (
            <FogToolbar fog={fog} shape={fogShape} onShapeChange={setFogShape} brush={fogBrush} onBrushChange={setFogBrush} zones={scene.zones} />
          ) : null}
          <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }} title="Coché : les joueurs voient la carte cadrée comme toi. Décoché : chacun déplace et zoome sa carte librement.">
            <input
              type="checkbox"
              checked={followView}
              onChange={(e) => {
                dirtyRef.current = true
                setFollowView(e.target.checked)
              }}
            />
            <span>Forcer les joueurs sur ma vue</span>
          </label>
          {scene.vision.dynamic ? (
            <>
              <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }} title="Coché : chaque joueur voit ce que voit tout le groupe. Décoché : seulement ce que voient ses propres personnages.">
                <input type="checkbox" checked={scene.sharedVision} onChange={(e) => edit({ sharedVision: e.target.checked })} />
                <span>Vision partagée</span>
              </label>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => void forgetExploration()} disabled={!scene.explored}>
                Oublier l’exploration
              </button>
            </>
          ) : null}
          {scene.vision.dynamic && pcTokenCount === 0 ? (
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              Vision dynamique active mais aucun jeton lié à un personnage : les joueurs ne voient rien. Lie un jeton à un personnage dans « Éditer ».
            </span>
          ) : null}
        </div>
      ) : null}

      {editing && canShowMap && tool === 'tokens' ? (
        <div className="login-form" style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
          <label>Édition token</label>
          {selected ? (
            <>
              <label htmlFor="session-map-token-label">Nom (identique à celui du tracker d’initiative pour afficher PV et tour)</label>
              <input id="session-map-token-label" type="text" value={selected.label ?? ''} onChange={(e) => editToken(selected.id, { label: e.target.value })} />

              <label htmlFor="session-map-token-character">Personnage lié (son joueur peut déplacer le jeton et voit à travers lui)</label>
              <select
                id="session-map-token-character"
                value={selected.characterId ?? ''}
                onChange={(e) => {
                  const id = e.target.value === '' ? null : Number.parseInt(e.target.value, 10)
                  const name = characters.find((c) => c.character_id === id)?.character_name
                  editToken(selected.id, { characterId: id, ...(name && (!selected.label || selected.label === 'Token') ? { label: name } : {}) })
                }}
              >
                <option value="">— Aucun (PNJ / monstre) —</option>
                {characters.map((c) => (
                  <option key={c.character_id} value={c.character_id}>
                    {(c.character_name ?? '').trim() || `Personnage #${c.character_id}`}
                  </option>
                ))}
              </select>

              <label htmlFor="session-map-token-color">Couleur</label>
              <input id="session-map-token-color" type="color" value={selected.color ?? '#7c3aed'} onChange={(e) => editToken(selected.id, { color: e.target.value })} />

              <label htmlFor="session-map-token-size">Taille</label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {SIZE_PRESETS.map(([label, cells]) => (
                  <button key={label} type="button" className="btn btn-secondary btn-small" onClick={() => editToken(selected.id, { size: cells * grid.size })}>
                    {label}
                  </button>
                ))}
              </div>
              <input
                id="session-map-token-size"
                type="range"
                min={0.01}
                max={0.4}
                step={0.002}
                value={selected.size ?? 36 / 1100}
                onChange={(e) => editToken(selected.id, { size: Number.parseFloat(e.target.value) })}
              />

              <div style={rowStyle}>
                {checkbox('Caché aux joueurs', Boolean(selected.hidden), (v) => editToken(selected.id, { hidden: v }))}
                {numberInput('Vision dans le noir (cases)', selected.darkvision ?? 0, (v) => editToken(selected.id, { darkvision: clamp(v, 0, 100) }), { min: 0 })}
                {numberInput('Lumière portée (cases)', selected.light ?? 0, (v) => editToken(selected.id, { light: clamp(v, 0, 100) }), { min: 0 })}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => void revealTokenView(selected.id)}
                  title="Retire le brouillard partout où ce jeton a une ligne de vue (murs et portes fermées bloquent), et l’ajoute à l’exploration"
                >
                  Révéler sa vue
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedTokenId(null)}>
                  Désélectionner
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    edit((prev) => ({ tokens: prev.tokens.filter((t) => t.id !== selected.id) }))
                    setSelectedTokenId(null)
                  }}
                >
                  Supprimer
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>Clique sur un token pour l’éditer.</p>
          )}
        </div>
      ) : null}

      {libraryOpen ? <TokenLibraryModal token={token} canImport onPick={addLibraryToken} onClose={() => setLibraryOpen(false)} /> : null}

      {!loading && !canShowMap ? <p>Aucune map active.</p> : null}

      {!loading && canShowMap ? (
        <MapCanvas
          token={token}
          imageUrl={activeMap?.image_url ?? ''}
          canEdit={editing}
          tokens={playerView ? tokens.filter((t) => !t.hidden) : tokens}
          // Joueur : mise à jour locale pendant le glisser, la position finale part par onPlayerTokenMove.
          onTokensChange={(next) => (canEdit ? edit({ tokens: next }) : setScene((prev) => ({ ...prev, tokens: next })))}
          fogMask={fog.mask}
          onFogOp={fog.apply}
          fogShape={fogShape}
          fogBrush={fogBrush}
          onImageSize={(w, h) => {
            setAspect(h / w)
            if (canEdit && Math.abs((scene.aspect ?? 0) - h / w) > 1e-4) edit({ aspect: h / w })
          }}
          zones={scene.zones}
          exploredMask={exploredMask}
          sharedVision={scene.sharedVision}
          tool={tool}
          selectedTokenId={selectedTokenId}
          onSelectedTokenIdChange={setSelectedTokenId}
          viewState={viewState}
          onViewStateChange={
            canEdit
              ? (next) => {
                  dirtyRef.current = true
                  setViewState(next)
                }
              : followView
                ? undefined
                : setViewState
          }
          grid={grid}
          walls={scene.walls}
          // Murs et portes se préparent dans l'éditeur de campagne ; ici le MJ ne fait qu'ouvrir/fermer les portes.
          onWallsChange={(next) => edit({ walls: next })}
          lights={scene.lights}
          templates={scene.templates}
          onTemplatesChange={(next) => edit({ templates: next })}
          templateShape={templateShape}
          vision={scene.vision}
          // Vue de groupe : aucun personnage « à soi », la vision vient de tous les PJ (comme pour un spectateur).
          myCharacterIds={playerView ? (playerView.characterId == null ? [] : [playerView.characterId]) : myCharacterIds}
          onPlayerTokenMove={(id, x, y) => void movePlayerToken(id, x, y)}
          tokenStatus={tokenStatus}
          characterImages={characterImages}
          pings={pings}
          onPing={(x, y) => sendMapWs({ type: 'ping', x, y })}
        />
      ) : null}
    </div>
  )
}
