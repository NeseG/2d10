import { Card } from '../../../shared/components/Card'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiDelete, apiGet, apiPost } from '../../../shared/api/client'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import type { Campaign } from '../../../shared/types'

type CampaignListItem = {
  id: number
  name: string
  description?: string | null
  status: 'active' | 'paused' | 'done'
}

type CampaignDetail = {
  id: number
  name: string
  description?: string | null
  status: 'active' | 'paused' | 'done'
  gm_id?: number | null
  gm_username?: string | null
  gm_email?: string | null
  characters?: CampaignCharacterLink[]
}

type CampaignCharacterLink = {
  id: number
  campaign_id: number
  character_id: number
  character_name?: string | null
  class?: string | null
  level?: number | null
  race?: string | null
  player_username?: string | null
}

type CampaignRow = Campaign & {
  description?: string | null
  characterCount: number
}

export function CampaignsPage() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
  })
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleteCampaignSaving, setDeleteCampaignSaving] = useState(false)

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true)
      try {
        const response = await apiGet<{
          success: boolean
          campaigns: CampaignListItem[]
        }>('/api/campaigns', token)

        const base = response.campaigns.map<CampaignRow>((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          players: 0,
          description: c.description ?? null,
          characterCount: 0,
        }))

        const details = await Promise.allSettled(
          base.map((c) => apiGet<{ success: boolean; campaign: CampaignDetail }>(`/api/campaigns/${c.id}`, token)),
        )

        setCampaigns(
          base.map((c, idx) => {
            const r = details[idx]
            if (r?.status !== 'fulfilled') return c
            const campaign = r.value.campaign
            const characters = Array.isArray(campaign?.characters) ? campaign.characters : []
            return {
              ...c,
              description: campaign.description ?? c.description ?? null,
              characterCount: characters.length,
            }
          }),
        )
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    void loadCampaigns()
  }, [token, showSnackbar])

  const canManageCampaigns = user?.role === 'admin' || user?.role === 'gm'

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter((c) => {
      const haystack = [
        c.name,
        c.description ?? '',
        c.status,
        String(c.characterCount),
        String(c.id),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [campaigns, search])

  async function handleCreateCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateSaving(true)
    try {
      await apiPost(
        '/api/campaigns',
        {
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
        },
        token,
      )
      setIsCreateModalOpen(false)
      setCreateForm({ name: '', description: '' })
      showSnackbar({ message: 'Campagne créée.', severity: 'success' })

      const response = await apiGet<{ success: boolean; campaigns: CampaignListItem[] }>('/api/campaigns', token)
      const base = response.campaigns.map<CampaignRow>((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        players: 0,
        description: c.description ?? null,
        characterCount: 0,
      }))
      setCampaigns(base)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création campagne',
        severity: 'error',
      })
    } finally {
      setCreateSaving(false)
    }
  }

  async function handleDeleteCampaign() {
    if (!deleteCampaignTarget) return
    setDeleteCampaignSaving(true)
    try {
      await apiDelete(`/api/campaigns/${deleteCampaignTarget.id}`, token)
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== deleteCampaignTarget.id))
      showSnackbar({ message: 'Campagne supprimée.', severity: 'success' })
      setDeleteCampaignTarget(null)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression campagne',
        severity: 'error',
      })
    } finally {
      setDeleteCampaignSaving(false)
    }
  }

  return (
    <Card title="Gestion des campagnes">
      {canManageCampaigns ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button className="btn" type="button" onClick={() => setIsCreateModalOpen(true)}>
            Créer une campagne
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
        <div className="login-form" style={{ marginTop: 0, minWidth: 260, flex: '1 1 260px' }}>
          <span className="create-item-kind-label">Rechercher</span>
          <input
            id="campaigns-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom, description, statut…"
          />
        </div>
      </div>

      {loading ? <p>Chargement…</p> : null}

      <div className="table-wrap">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Description</th>
              <th>Statut</th>
              <th>Personnages</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="clickable-row"
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                title="Ouvrir la campagne"
              >
                <td data-label="Nom">{campaign.name}</td>
                <td data-label="Description">{campaign.description?.trim() ? campaign.description : '—'}</td>
                <td data-label="Statut">{campaign.status}</td>
                <td data-label="Personnages">{campaign.characterCount}</td>
                <td data-label="Actions" onClick={(event) => event.stopPropagation()}>
                  {canManageCampaigns ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-small" type="button" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                        Ouvrir
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
                        type="button"
                        disabled={deleteCampaignSaving && deleteCampaignTarget?.id === campaign.id}
                        onClick={() => setDeleteCampaignTarget({ id: campaign.id, name: campaign.name })}
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!createSaving) setIsCreateModalOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Créer une campagne</h3>
            <form className="login-form" onSubmit={handleCreateCampaign}>
              <label htmlFor="create-campaign-name">Nom</label>
              <input
                id="create-campaign-name"
                type="text"
                required
                disabled={createSaving}
                value={createForm.name}
                onChange={(event) => setCreateForm((p) => ({ ...p, name: event.target.value }))}
              />

              <label htmlFor="create-campaign-desc">Description</label>
              <textarea
                id="create-campaign-desc"
                rows={4}
                disabled={createSaving}
                value={createForm.description}
                onChange={(event) => setCreateForm((p) => ({ ...p, description: event.target.value }))}
              />

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn" type="submit" disabled={createSaving}>
                  {createSaving ? 'Création…' : 'Créer'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={createSaving} onClick={() => setIsCreateModalOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteCampaignTarget ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deleteCampaignSaving) setDeleteCampaignTarget(null)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Supprimer la campagne</h3>
            <p>
              Confirmer la suppression de <strong>{deleteCampaignTarget.name || `Campagne #${deleteCampaignTarget.id}`}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn" type="button" disabled={deleteCampaignSaving} onClick={() => void handleDeleteCampaign()}>
                {deleteCampaignSaving ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={deleteCampaignSaving}
                onClick={() => setDeleteCampaignTarget(null)}
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
