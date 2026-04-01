import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { apiDelete, apiGet, apiPutFormData } from '../../../shared/api/client'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { MapCanvas, type MapCanvasTool, type MapFogRect, type MapToken } from '../../maps/components/MapCanvas'

type CampaignMap = {
  id: number
  campaign_id: number
  name: string
  image_url: string
  fog_state?: unknown
  tokens_state?: unknown
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
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

  const [tokens, setTokens] = useState<MapToken[]>([])
  const [fogRects, setFogRects] = useState<MapFogRect[]>([])
  const [tool, setTool] = useState<MapCanvasTool>('tokens')
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)

  const imageUrl = map?.image_url ?? ''

  const normalizedTokensState = useMemo(() => {
    if (!map) return null
    return map.tokens_state
  }, [map])

  const normalizedFogState = useMemo(() => {
    if (!map) return null
    return map.fog_state
  }, [map])

  useEffect(() => {
    async function load() {
      if (Number.isNaN(campaignId) || Number.isNaN(mapId)) return
      setLoading(true)
      try {
        const res = await apiGet<{ success: boolean; map: CampaignMap }>(`/api/campaigns/${campaignId}/maps/${mapId}`, token)
        setMap(res.map)

        const t = Array.isArray((res.map.tokens_state as any)?.tokens) ? ((res.map.tokens_state as any).tokens as MapToken[]) : []
        const f = Array.isArray((res.map.fog_state as any)?.rects) ? ((res.map.fog_state as any).rects as MapFogRect[]) : []
        // Best-effort legacy compat:
        // - if coords are >1, treat them as pixels in the previous implementation and normalize against the surface size.
        setTokens(
          t
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
          f
            .filter(
              (r) =>
                r &&
                typeof r.id === 'string' &&
                Number.isFinite(r.x) &&
                Number.isFinite(r.y) &&
                Number.isFinite(r.w) &&
                Number.isFinite(r.h),
            )
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
      fd.append('tokens_state', JSON.stringify({ tokens }))
      fd.append('fog_state', JSON.stringify({ rects: fogRects }))
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
      navigate('/campaigns')
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
    setTokens((prev) => prev.filter((t) => t.id !== id))
    setSelectedTokenId((prev) => (prev === id ? null : prev))
  }

  return (
    <Card title="Édition de carte">
      {Number.isNaN(campaignId) || Number.isNaN(mapId) ? <p>Paramètres invalides.</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="btn btn-secondary" type="button" onClick={() => navigate('/campaigns')}>
          Retour campagnes
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <button className={`btn${tool === 'move' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('move')}>
              Déplacer
            </button>
            <button className={`btn${tool === 'tokens' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('tokens')}>
              Éditer
            </button>
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
            <button className={`btn${tool === 'fog_add' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('fog_add')}>
              Fog
            </button>
            <button className={`btn${tool === 'fog_erase' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTool('fog_erase')}>
              Gomme
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setFogRects([])} disabled={tool !== 'fog_add' && tool !== 'fog_erase'}>
              Effacer fog
            </button>
          </div>

          {tool === 'tokens' ? (
            <div className="login-form" style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
              <label>Édition token</label>
              {selectedTokenId ? (
                <>
                  <label htmlFor="map-token-label">Label</label>
                  <input
                    id="map-token-label"
                    type="text"
                    value={tokens.find((t) => t.id === selectedTokenId)?.label ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, label: v } : t)))
                    }}
                  />

                  <label htmlFor="map-token-color">Couleur</label>
                  <input
                    id="map-token-color"
                    type="color"
                    value={tokens.find((t) => t.id === selectedTokenId)?.color ?? '#7c3aed'}
                    onChange={(e) => {
                      const v = e.target.value
                      setTokens((prev) => prev.map((t) => (t.id === selectedTokenId ? { ...t, color: v } : t)))
                    }}
                  />

                  <label htmlFor="map-token-size">Taille</label>
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
                    id="map-token-size"
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
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => setSelectedTokenId(null)}
                    >
                      Désélectionner
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => deleteToken(selectedTokenId)}
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
            imageUrl={imageUrl}
            canEdit
            tokens={tokens}
            fogRects={fogRects}
            onTokensChange={(next) => setTokens(next)}
            onFogRectsChange={(next) => setFogRects(next)}
            tool={tool}
            onToolChange={setTool}
            selectedTokenId={selectedTokenId}
            onSelectedTokenIdChange={setSelectedTokenId}
          />

          <details style={{ marginTop: '0.75rem' }}>
            <summary>Debug état</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(
                {
                  tokens_state: normalizedTokensState,
                  fog_state: normalizedFogState,
                },
                null,
                2,
              )}
            </pre>
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

