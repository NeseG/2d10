import { Card } from '../../../shared/components/Card'
import { useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/api/client'
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

type CharacterListItem = {
  id: number
  name: string
  class?: string | null
  level?: number | null
  race?: string | null
  user?: { username?: string | null } | null
}

type CampaignRow = Campaign & {
  description?: string | null
  characterCount: number
}

export function CampaignsPage() {
  const { token, user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(false)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
  })

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editCampaignId, setEditCampaignId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'paused' | 'done',
  })
  const [editCampaignCharacters, setEditCampaignCharacters] = useState<CampaignCharacterLink[]>([])
  const [removeCharacterSavingId, setRemoveCharacterSavingId] = useState<number | null>(null)
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [allCharacters, setAllCharacters] = useState<CharacterListItem[]>([])
  const [characterSearch, setCharacterSearch] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | ''>('')
  const [addCharacterSaving, setAddCharacterSaving] = useState(false)

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

  async function openEditModal(campaignId: number) {
    setIsEditModalOpen(true)
    setEditLoading(true)
    setEditSaving(false)
    setEditCampaignId(campaignId)
    setCharacterSearch('')
    setSelectedCharacterId('')
    setAllCharacters([])
    setEditCampaignCharacters([])
    try {
      const response = await apiGet<{ success: boolean; campaign: CampaignDetail }>(`/api/campaigns/${campaignId}`, token)
      const c = response.campaign
      setEditForm({
        name: c.name ?? '',
        description: c.description ?? '',
        status: c.status ?? 'active',
      })
      setEditCampaignCharacters(Array.isArray(c.characters) ? c.characters : [])

      setCharactersLoading(true)
      const charactersRes = await apiGet<{ success: boolean; characters: CharacterListItem[] }>(`/api/characters`, token)
      setAllCharacters(charactersRes.characters ?? [])
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement campagne',
        severity: 'error',
      })
    } finally {
      setEditLoading(false)
      setCharactersLoading(false)
    }
  }

  const filteredCharacters = allCharacters.filter((c) => {
    const q = characterSearch.trim().toLowerCase()
    if (!q) return true
    return (
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.user?.username ?? '').toLowerCase().includes(q) ||
      (c.class ?? '').toLowerCase().includes(q) ||
      (c.race ?? '').toLowerCase().includes(q)
    )
  })

  async function handleAddCharacterToCampaign() {
    if (editCampaignId == null) return
    if (selectedCharacterId === '') {
      showSnackbar({ message: 'Sélectionne un personnage.', severity: 'error' })
      return
    }
    setAddCharacterSaving(true)
    try {
      await apiPost(
        `/api/campaigns/${editCampaignId}/characters`,
        { character_id: selectedCharacterId },
        token,
      )
      showSnackbar({ message: 'Personnage ajouté à la campagne.', severity: 'success' })
      setSelectedCharacterId('')

      // refresh attached characters
      const cRes = await apiGet<{ success: boolean; campaign: CampaignDetail }>(`/api/campaigns/${editCampaignId}`, token)
      setEditCampaignCharacters(Array.isArray(cRes.campaign?.characters) ? cRes.campaign.characters : [])

      // refresh campaign list counts
      const response = await apiGet<{ success: boolean; campaigns: CampaignListItem[] }>('/api/campaigns', token)
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
        message: err instanceof Error ? err.message : 'Erreur ajout personnage',
        severity: 'error',
      })
    } finally {
      setAddCharacterSaving(false)
    }
  }

  async function handleRemoveCharacterFromCampaign(characterId: number) {
    if (editCampaignId == null) return
    setRemoveCharacterSavingId(characterId)
    try {
      await apiDelete(`/api/campaigns/${editCampaignId}/characters/${characterId}`, token)
      showSnackbar({ message: 'Personnage retiré de la campagne.', severity: 'success' })

      const cRes = await apiGet<{ success: boolean; campaign: CampaignDetail }>(`/api/campaigns/${editCampaignId}`, token)
      setEditCampaignCharacters(Array.isArray(cRes.campaign?.characters) ? cRes.campaign.characters : [])

      // refresh campaign list counts
      const response = await apiGet<{ success: boolean; campaigns: CampaignListItem[] }>('/api/campaigns', token)
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
        message: err instanceof Error ? err.message : 'Erreur suppression personnage',
        severity: 'error',
      })
    } finally {
      setRemoveCharacterSavingId(null)
    }
  }

  async function handleSaveCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editCampaignId == null) return
    setEditSaving(true)
    try {
      await apiPut(
        `/api/campaigns/${editCampaignId}`,
        {
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          status: editForm.status,
        },
        token,
      )
      setIsEditModalOpen(false)
      setEditCampaignId(null)
      showSnackbar({ message: 'Campagne mise à jour.', severity: 'success' })

      // refresh list + counts
      const response = await apiGet<{ success: boolean; campaigns: CampaignListItem[] }>('/api/campaigns', token)
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
        message: err instanceof Error ? err.message : 'Erreur sauvegarde campagne',
        severity: 'error',
      })
    } finally {
      setEditSaving(false)
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
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td data-label="Nom">{campaign.name}</td>
                <td data-label="Description">{campaign.description?.trim() ? campaign.description : '—'}</td>
                <td data-label="Statut">{campaign.status}</td>
                <td data-label="Personnages">{campaign.characterCount}</td>
                <td data-label="Actions">
                  {canManageCampaigns ? (
                    <button className="btn btn-small" type="button" onClick={() => void openEditModal(campaign.id)}>
                      Éditer
                    </button>
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

      {isEditModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!editSaving) setIsEditModalOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Éditer la campagne</h3>
            {editLoading ? <p>Chargement…</p> : null}
            <form className="login-form" onSubmit={handleSaveCampaign}>
              <label htmlFor="edit-campaign-name">Nom</label>
              <input
                id="edit-campaign-name"
                type="text"
                required
                disabled={editLoading || editSaving}
                value={editForm.name}
                onChange={(event) => setEditForm((p) => ({ ...p, name: event.target.value }))}
              />

              <label htmlFor="edit-campaign-desc">Description</label>
              <textarea
                id="edit-campaign-desc"
                rows={4}
                disabled={editLoading || editSaving}
                value={editForm.description}
                onChange={(event) => setEditForm((p) => ({ ...p, description: event.target.value }))}
              />

              <label htmlFor="edit-campaign-status">Statut</label>
              <select
                id="edit-campaign-status"
                disabled={editLoading || editSaving}
                value={editForm.status}
                onChange={(event) =>
                  setEditForm((p) => ({
                    ...p,
                    status: event.target.value as 'active' | 'paused' | 'done',
                  }))
                }
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="done">done</option>
              </select>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn" type="submit" disabled={editLoading || editSaving}>
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={editLoading || editSaving} onClick={() => setIsEditModalOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>

            <h4 style={{ marginTop: '1rem' }}>Personnages de la campagne</h4>
            {editCampaignCharacters.length === 0 ? (
              <p>Aucun personnage attaché.</p>
            ) : (
              <div className="table-wrap">
                <table className="table inventory-items-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Joueur</th>
                      <th>Classe</th>
                      <th>Niveau</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editCampaignCharacters.map((link) => (
                      <tr key={link.id}>
                        <td data-label="Nom">{link.character_name ?? '—'}</td>
                        <td data-label="Joueur">{link.player_username ?? '—'}</td>
                        <td data-label="Classe">{link.class ?? '—'}</td>
                        <td data-label="Niveau">{link.level ?? '—'}</td>
                        <td data-label="Actions">
                          <button
                            className="btn btn-secondary btn-small"
                            type="button"
                            disabled={removeCharacterSavingId === link.character_id}
                            aria-label="Retirer le personnage"
                            onClick={() => void handleRemoveCharacterFromCampaign(link.character_id)}
                            title="Retirer de la campagne"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 style={{ marginTop: '1rem' }}>Ajouter un personnage</h4>
            {charactersLoading ? <p>Chargement des personnages…</p> : null}

            {!charactersLoading ? (
              <div className="login-form" style={{ marginTop: '0.25rem' }}>
                <label htmlFor="campaign-character-search">Recherche</label>
                <input
                  id="campaign-character-search"
                  type="text"
                  placeholder="Nom, joueur, classe, race…"
                  value={characterSearch}
                  onChange={(event) => setCharacterSearch(event.target.value)}
                  disabled={addCharacterSaving}
                />

                <label htmlFor="campaign-character-select">Personnage</label>
                <select
                  id="campaign-character-select"
                  value={selectedCharacterId}
                  onChange={(event) => {
                    const raw = event.target.value
                    setSelectedCharacterId(raw === '' ? '' : Number.parseInt(raw, 10))
                  }}
                  disabled={addCharacterSaving}
                >
                  <option value="">— Sélectionner —</option>
                  {filteredCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.level != null ? ` (lvl ${c.level})` : ''}
                      {c.class ? ` - ${c.class}` : ''}
                      {c.user?.username ? ` - ${c.user.username}` : ''}
                    </option>
                  ))}
                </select>

                <button className="btn" type="button" disabled={addCharacterSaving} onClick={() => void handleAddCharacterToCampaign()}>
                  {addCharacterSaving ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" type="button" disabled={editSaving} onClick={() => setIsEditModalOpen(false)}>
                Retour
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
