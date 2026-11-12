import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { apiDelete, apiGet, apiPutFormData } from '../../../shared/api/client'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { MapCanvas, type MapCanvasTool, type MapToken } from '../../maps/components/MapCanvas'
import { EMPTY_SCENE, SIZE_PRESETS, clamp, fogStateOf, parseScene, tokensStateOf, type CampaignMap, type Scene } from '../../maps/scene'
import { FogToolbar } from '../../maps/components/FogToolbar'
import { useFogEditor } from '../../maps/useFogEditor'
import type { FogBitmap, FogShape } from '../../maps/fog'

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const TOOLS: [MapCanvasTool, string][] = [
  ['move', 'Déplacer'],
  ['tokens', 'Éditer'],
  ['fog_add', 'Fog'],
  ['fog_erase', 'Gomme'],
  ['wall', 'Mur'],
  ['door', 'Porte'],
  ['window', 'Fenêtre'],
  ['zone', 'Zone'],
  ['light', 'Lumière'],
]

const TOOL_HINTS: Partial<Record<MapCanvasTool, string>> = {
  wall: 'Glisser pour tracer un mur. Double-clic sur un mur pour le supprimer. Maj = sans aimant.',
  door: 'Glisser pour tracer une porte. Double-clic pour la supprimer ; hors de cet outil, cliquer sur sa pastille l’ouvre ou la ferme.',
  window: 'Glisser pour tracer une fenêtre : simple repère pour le MJ, elle ne bloque pas la vue. Double-clic pour la supprimer.',
  zone: 'Clic par sommet, double-clic ou clic sur le 1er sommet pour fermer, puis nommer la zone. Double-clic sur une zone pour la supprimer.',
  light: 'Cliquer pour poser une lumière, cliquer sur une lumière pour la retirer.',
}

export function CampaignMapEditorPage() {
  const { token } = useAuth()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const params = useParams()
  const campaignId = Number.parseInt(params.campaignId ?? '', 10)
  const mapId = Number.parseInt(params.mapId ?? '', 10)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [map, setMap] = useState<CampaignMap | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const [scene, setScene] = useState<Scene>(EMPTY_SCENE)
  const [tool, setTool] = useState<MapCanvasTool>('tokens')
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [lightRadius, setLightRadius] = useState(8)
  const [fogShape, setFogShape] = useState<FogShape>('rect')
  const [fogBrush, setFogBrush] = useState(2)
  const [aspect, setAspect] = useState<number | null>(null)

  const edit = (patch: Partial<Scene>) => setScene((prev) => ({ ...prev, ...patch }))
  const editGrid = (patch: Partial<Scene['grid']>) => setScene((prev) => ({ ...prev, grid: { ...prev.grid, ...patch } }))
  const editToken = (id: string, patch: Partial<MapToken>) =>
    setScene((prev) => ({ ...prev, tokens: prev.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  useEffect(() => {
    async function load() {
      if (Number.isNaN(campaignId) || Number.isNaN(mapId)) return
      setLoading(true)
      try {
        const res = await apiGet<{ success: boolean; map: CampaignMap }>(`/api/campaigns/${campaignId}/maps/${mapId}`, token)
        setMap(res.map)
        setScene(parseScene(res.map))
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur chargement carte',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [campaignId, mapId, token, showSnackbar])

  async function saveStates() {
    if (Number.isNaN(campaignId) || Number.isNaN(mapId)) return
    if (!map) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', map.name)
      fd.append('tokens_state', JSON.stringify(tokensStateOf(scene)))
      fd.append('fog_state', JSON.stringify(fogStateOf(scene)))
      await apiPutFormData(`/api/campaigns/${campaignId}/maps/${mapId}`, fd, token)
      showSnackbar({ message: 'Carte sauvegardée.', severity: 'success' })
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Sauvegarde impossible', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMap() {
    if (Number.isNaN(campaignId) || Number.isNaN(mapId)) return
    setDeleting(true)
    try {
      await apiDelete(`/api/campaigns/${campaignId}/maps/${mapId}`, token)
      showSnackbar({ message: 'Carte supprimée.', severity: 'success' })
      navigate(`/campaigns/${campaignId}`)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Suppression impossible',
        severity: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }

  function addToken() {
    const id = uid('tok')
    setScene((prev) => ({
      ...prev,
      tokens: [
        ...prev.tokens,
        { id, label: 'Token', x: clamp(0.1 + prev.tokens.length * prev.grid.size, 0, 0.9), y: 0.1, color: '#7c3aed', size: prev.grid.size },
      ],
    }))
    setSelectedTokenId(id)
  }

  const { grid } = scene
  const fog = useFogEditor({
    fog: scene.fog,
    legacyRects: scene.fogRects,
    gridSize: grid.size,
    aspect,
    resetKey: mapId,
    onChange: useCallback((next: FogBitmap) => setScene((prev) => ({ ...prev, fog: next })), []),
  })
  const selected = scene.tokens.find((t) => t.id === selectedTokenId) ?? null
  const rowStyle = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' } as const
  const fieldStyle = { display: 'flex', gap: '0.35rem', alignItems: 'center' } as const
  const numberField = (label: string, value: number, onChange: (v: number) => void, opts: { min?: number; max?: number; step?: number } = {}) => (
    <label style={fieldStyle}>
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
    <label style={{ ...fieldStyle, opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )

  return (
    <Card title="Édition de carte">
      {Number.isNaN(campaignId) || Number.isNaN(mapId) ? <p>Paramètres invalides.</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="btn btn-secondary" type="button" onClick={() => navigate(`/campaigns/${campaignId}`)}>
          Retour campagne
        </button>
        <button className="btn" type="button" onClick={() => void saveStates()} disabled={saving || loading || !map}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={loading || saving || deleting || !map}
          onClick={() => setDeleteConfirmOpen(true)}
        >
          {deleting ? 'Suppression…' : 'Supprimer'}
        </button>
        <span style={{ marginLeft: 'auto', opacity: 0.8 }}>
          {map ? map.name : '—'}
        </span>
      </div>

      {loading ? <p>Chargement…</p> : null}
      {!loading && map ? (
        <>
          <div style={rowStyle} role="toolbar" aria-label="Outils de carte">
            {TOOLS.map(([t, label]) => (
              <button key={t} className={`btn${tool === t ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool(t)} aria-pressed={tool === t}>
                {label}
              </button>
            ))}
            <button
              className="btn"
              type="button"
              onClick={() => {
                setTool('tokens')
                addToken()
              }}
            >
              + Token
            </button>
          </div>

          {TOOL_HINTS[tool] ? <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: 13 }}>{TOOL_HINTS[tool]}</p> : null}

          {tool === 'fog_add' || tool === 'fog_erase' ? (
            <div style={rowStyle}>
              <FogToolbar fog={fog} shape={fogShape} onShapeChange={setFogShape} brush={fogBrush} onBrushChange={setFogBrush} />
            </div>
          ) : null}
          {tool === 'wall' || tool === 'door' || tool === 'window' ? (
            <div style={rowStyle}>
              <button className="btn btn-secondary" type="button" onClick={() => edit({ walls: [] })} disabled={scene.walls.length === 0}>
                Effacer murs, portes et fenêtres
              </button>
            </div>
          ) : null}
          {tool === 'light' ? (
            <div style={rowStyle}>
              {numberField('Rayon (cases)', lightRadius, (v) => setLightRadius(clamp(v, 1, 60)), { min: 1, max: 60 })}
              <button className="btn btn-secondary" type="button" onClick={() => edit({ lights: [] })} disabled={scene.lights.length === 0}>
                Effacer les lumières
              </button>
            </div>
          ) : null}

          <div style={rowStyle}>
            <strong>Grille</strong>
            {checkbox('Afficher', grid.show, (v) => editGrid({ show: v }))}
            {checkbox('Aimanter', grid.snap, (v) => editGrid({ snap: v }))}
            {numberField('Cases en largeur', +(1 / grid.size).toFixed(2), (v) => editGrid({ size: 1 / clamp(v, 2, 200) }), { min: 2, max: 200, step: 0.5 })}
            {numberField('Mètres par case', grid.unit, (v) => editGrid({ unit: clamp(v, 0.1, 1000) }), { min: 0.1, step: 0.5 })}
            {(['ox', 'oy'] as const).map((k) => (
              <label key={k} style={fieldStyle}>
                <span style={{ opacity: 0.8 }}>Décalage {k === 'ox' ? 'X' : 'Y'}</span>
                <input type="range" min={0} max={1} step={0.01} value={grid[k]} onChange={(e) => editGrid({ [k]: Number.parseFloat(e.target.value) })} />
              </label>
            ))}
          </div>

          <div style={rowStyle}>
            <strong>Vision en session</strong>
            {checkbox('Vision dynamique (les murs bloquent la vue des joueurs)', scene.vision.dynamic, (v) => edit({ vision: { ...scene.vision, dynamic: v } }))}
            {checkbox('Obscurité (seules les lumières éclairent)', scene.vision.dark, (v) => edit({ vision: { ...scene.vision, dark: v } }), !scene.vision.dynamic)}
          </div>

          {tool === 'tokens' ? (
            <div className="login-form" style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
              <label>Édition token</label>
              {selected ? (
                <>
                  <label htmlFor="map-token-label">Label</label>
                  <input id="map-token-label" type="text" value={selected.label ?? ''} onChange={(e) => editToken(selected.id, { label: e.target.value })} />

                  <label htmlFor="map-token-color">Couleur</label>
                  <input id="map-token-color" type="color" value={selected.color ?? '#7c3aed'} onChange={(e) => editToken(selected.id, { color: e.target.value })} />

                  <label htmlFor="map-token-size">Taille</label>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {SIZE_PRESETS.map(([label, cells]) => (
                      <button key={label} type="button" className="btn btn-secondary btn-small" onClick={() => editToken(selected.id, { size: cells * grid.size })}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    id="map-token-size"
                    type="range"
                    min={0.01}
                    max={0.4}
                    step={0.002}
                    value={selected.size ?? 36 / 1100}
                    onChange={(e) => editToken(selected.id, { size: Number.parseFloat(e.target.value) })}
                  />

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" type="button" onClick={() => setSelectedTokenId(null)}>
                      Désélectionner
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => {
                        edit({ tokens: scene.tokens.filter((t) => t.id !== selected.id) })
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

          <MapCanvas
            token={token}
            imageUrl={map.image_url}
            canEdit
            tokens={scene.tokens}
            onTokensChange={(next) => edit({ tokens: next })}
            fogMask={fog.mask}
            onFogOp={fog.apply}
            fogShape={fogShape}
            fogBrush={fogBrush}
            onImageSize={(w, h) => {
              setAspect(h / w)
              if (Math.abs((scene.aspect ?? 0) - h / w) > 1e-4) edit({ aspect: h / w })
            }}
            zones={scene.zones}
            onZonesChange={(next) => edit({ zones: next })}
            tool={tool}
            selectedTokenId={selectedTokenId}
            onSelectedTokenIdChange={setSelectedTokenId}
            grid={grid}
            walls={scene.walls}
            onWallsChange={(next) => edit({ walls: next })}
            lights={scene.lights}
            onLightsChange={(next) => edit({ lights: next })}
            lightRadius={lightRadius}
            templates={scene.templates}
            // Pas d'aperçu de l'obscurité ici : elle dépend des jetons de PJ, placés en session.
          />

          <details style={{ marginTop: '0.75rem' }}>
            <summary>Debug état</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ tokens_state: tokensStateOf(scene), fog_state: fogStateOf(scene) }, null, 2)}</pre>
          </details>
        </>
      ) : null}

      {deleteConfirmOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deleting) setDeleteConfirmOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Supprimer la carte</h3>
            <p>
              Confirmer la suppression de <strong>{map?.name ?? 'cette carte'}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn" type="button" disabled={deleting} onClick={() => void handleDeleteMap()}>
                {deleting ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

