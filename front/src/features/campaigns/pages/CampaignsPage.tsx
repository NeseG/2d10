import { Card } from '../../../shared/components/Card'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiDelete, apiGet, apiPost, apiPostFormData, apiPut, apiPutFormData } from '../../../shared/api/client'
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

type CampaignMap = {
  id: number
  campaign_id: number
  name: string
  image_url: string
  fog_state?: unknown
  tokens_state?: unknown
  created_at?: string | null
  updated_at?: string | null
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
  const navigate = useNavigate()
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

  const [mapsLoading, setMapsLoading] = useState(false)
  const [editCampaignMaps, setEditCampaignMaps] = useState<CampaignMap[]>([])
  const [createMapSaving, setCreateMapSaving] = useState(false)
  const [createMapForm, setCreateMapForm] = useState({ name: '', image_file: null as File | null })
  const [editMapId, setEditMapId] = useState<number | null>(null)
  const [editMapSaving, setEditMapSaving] = useState(false)
  const [editMapForm, setEditMapForm] = useState({ name: '', image_file: null as File | null })
  const [deleteMapSavingId, setDeleteMapSavingId] = useState<number | null>(null)
  const [deleteMapTarget, setDeleteMapTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleteCampaignSaving, setDeleteCampaignSaving] = useState(false)
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState<CampaignDetail | null>(null)
  const [campaignDetailLoading, setCampaignDetailLoading] = useState(false)
  const editSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersistedEditRef = useRef('')

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

  useEffect(() => {
    return () => {
      if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current)
    }
  }, [])

  const canManageCampaigns = user?.role === 'admin' || user?.role === 'gm'

  async function loadCampaignMaps(campaignId: number) {
    setMapsLoading(true)
    try {
      const res = await apiGet<{ success: boolean; maps: CampaignMap[] }>(`/api/campaigns/${campaignId}/maps`, token)
      setEditCampaignMaps(Array.isArray(res.maps) ? res.maps : [])
    } catch (err) {
      setEditCampaignMaps([])
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement cartes',
        severity: 'error',
      })
    } finally {
      setMapsLoading(false)
    }
  }

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
    setEditCampaignMaps([])
    setCreateMapForm({ name: '', image_file: null })
    setEditMapId(null)
    setEditMapForm({ name: '', image_file: null })
    try {
      const response = await apiGet<{ success: boolean; campaign: CampaignDetail }>(`/api/campaigns/${campaignId}`, token)
      const c = response.campaign
      setEditForm({
        name: c.name ?? '',
        description: c.description ?? '',
        status: c.status ?? 'active',
      })
      lastPersistedEditRef.current = JSON.stringify({
        name: c.name ?? '',
        description: c.description ?? '',
        status: c.status ?? 'active',
      })
      setEditCampaignCharacters(Array.isArray(c.characters) ? c.characters : [])

      setCharactersLoading(true)
      const charactersRes = await apiGet<{ success: boolean; characters: CharacterListItem[] }>(`/api/characters`, token)
      setAllCharacters(charactersRes.characters ?? [])

      void loadCampaignMaps(campaignId)
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

  async function persistCampaignEdit(nextForm: typeof editForm) {
    if (editCampaignId == null) return
    setEditSaving(true)
    try {
      await apiPut(
        `/api/campaigns/${editCampaignId}`,
        {
          name: nextForm.name.trim(),
          description: nextForm.description.trim() || null,
          status: nextForm.status,
        },
        token,
      )
      lastPersistedEditRef.current = JSON.stringify({
        name: nextForm.name,
        description: nextForm.description,
        status: nextForm.status,
      })

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

  useEffect(() => {
    if (!isEditModalOpen || editLoading || editCampaignId == null) return
    const nextSnapshot = JSON.stringify({
      name: editForm.name,
      description: editForm.description,
      status: editForm.status,
    })
    if (nextSnapshot === lastPersistedEditRef.current) return

    if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current)
    editSaveTimerRef.current = setTimeout(() => {
      editSaveTimerRef.current = null
      void persistCampaignEdit(editForm)
    }, 500)

    return () => {
      if (editSaveTimerRef.current) {
        clearTimeout(editSaveTimerRef.current)
        editSaveTimerRef.current = null
      }
    }
  }, [editCampaignId, editForm, editLoading, isEditModalOpen])

  async function handleCreateMap() {
    if (editCampaignId == null) return
    const name = createMapForm.name.trim()
    if (!name) {
      showSnackbar({ message: 'Nom de carte requis.', severity: 'error' })
      return
    }
    if (!createMapForm.image_file) {
      showSnackbar({ message: 'Image requise.', severity: 'error' })
      return
    }

    setCreateMapSaving(true)
    try {
      const f = createMapForm.image_file
      if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.type)) {
        showSnackbar({ message: 'Formats acceptés : JPEG, PNG, GIF, WebP (max 10 Mo)', severity: 'error' })
        return
      }
      if (f.size > 10 * 1024 * 1024) {
        showSnackbar({ message: 'Image trop volumineuse (10 Mo max)', severity: 'error' })
        return
      }

      const fd = new FormData()
      fd.append('name', name)
      fd.append('image', f)

      await apiPostFormData(`/api/campaigns/${editCampaignId}/maps`, fd, token)
      showSnackbar({ message: 'Carte créée.', severity: 'success' })
      setCreateMapForm({ name: '', image_file: null })
      await loadCampaignMaps(editCampaignId)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création carte',
        severity: 'error',
      })
    } finally {
      setCreateMapSaving(false)
    }
  }

  async function handleSaveMap() {
    if (editCampaignId == null || editMapId == null) return
    const name = editMapForm.name.trim()
    if (!name) {
      showSnackbar({ message: 'Nom de carte requis.', severity: 'error' })
      return
    }

    setEditMapSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', name)
      if (editMapForm.image_file) {
        const f = editMapForm.image_file
        if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.type)) {
          showSnackbar({ message: 'Formats acceptés : JPEG, PNG, GIF, WebP (max 10 Mo)', severity: 'error' })
          return
        }
        if (f.size > 10 * 1024 * 1024) {
          showSnackbar({ message: 'Image trop volumineuse (10 Mo max)', severity: 'error' })
          return
        }
        fd.append('image', f)
      }

      await apiPutFormData(`/api/campaigns/${editCampaignId}/maps/${editMapId}`, fd, token)
      showSnackbar({ message: 'Carte mise à jour.', severity: 'success' })
      setEditMapId(null)
      setEditMapForm({ name: '', image_file: null })
      await loadCampaignMaps(editCampaignId)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur mise à jour carte',
        severity: 'error',
      })
    } finally {
      setEditMapSaving(false)
    }
  }

  async function handleDeleteMap() {
    if (editCampaignId == null) return
    if (!deleteMapTarget) return
    setDeleteMapSavingId(deleteMapTarget.id)
    try {
      await apiDelete(`/api/campaigns/${editCampaignId}/maps/${deleteMapTarget.id}`, token)
      showSnackbar({ message: 'Carte supprimée.', severity: 'success' })
      setDeleteMapTarget(null)
      await loadCampaignMaps(editCampaignId)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression carte',
        severity: 'error',
      })
    } finally {
      setDeleteMapSavingId(null)
    }
  }

  async function handleDeleteCampaign() {
    if (!deleteCampaignTarget) return
    setDeleteCampaignSaving(true)
    try {
      await apiDelete(`/api/campaigns/${deleteCampaignTarget.id}`, token)
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== deleteCampaignTarget.id))
      if (editCampaignId === deleteCampaignTarget.id) {
        setIsEditModalOpen(false)
        setEditCampaignId(null)
      }
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

  async function openCampaignDetail(campaignId: number) {
    setCampaignDetailLoading(true)
    setSelectedCampaignDetail(null)
    try {
      const response = await apiGet<{ success: boolean; campaign: CampaignDetail }>(`/api/campaigns/${campaignId}`, token)
      setSelectedCampaignDetail(response.campaign ?? null)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement campagne',
        severity: 'error',
      })
    } finally {
      setCampaignDetailLoading(false)
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
              <tr
                key={campaign.id}
                className="clickable-row"
                onClick={() => void openCampaignDetail(campaign.id)}
                title="Voir le détail de la campagne"
              >
                <td data-label="Nom">{campaign.name}</td>
                <td data-label="Description">{campaign.description?.trim() ? campaign.description : '—'}</td>
                <td data-label="Statut">{campaign.status}</td>
                <td data-label="Personnages">{campaign.characterCount}</td>
                <td data-label="Actions" onClick={(event) => event.stopPropagation()}>
                  {canManageCampaigns ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-small" type="button" onClick={() => void openEditModal(campaign.id)}>
                        Éditer
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

      {isEditModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!editSaving) setIsEditModalOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <label className="item-edit-title-field" htmlFor="edit-campaign-name">
              <span>Éditer la campagne</span>
              <input
                id="edit-campaign-name"
                type="text"
                required
                disabled={editLoading || editSaving}
                value={editForm.name}
                onChange={(event) => setEditForm((p) => ({ ...p, name: event.target.value }))}
              />
            </label>
            {editLoading ? <p>Chargement…</p> : null}
            <div className="item-details-header-submeta" style={{ marginBottom: '0.85rem' }}>
              Campaign settings
            </div>
            <form className="login-form item-edit-form" onSubmit={(event) => event.preventDefault()}>
              <label className="item-edit-form-row" htmlFor="edit-campaign-status">
                <span>Statut</span>
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
              </label>

              <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="edit-campaign-desc">
                <span>Description</span>
                <textarea
                  id="edit-campaign-desc"
                  rows={4}
                  disabled={editLoading || editSaving}
                  value={editForm.description}
                  onChange={(event) => setEditForm((p) => ({ ...p, description: event.target.value }))}
                />
              </label>

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
                            aria-label="Supprimer le personnage"
                            onClick={() => void handleRemoveCharacterFromCampaign(link.character_id)}
                            title="Supprimer"
                          >
                            Supprimer
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
                  {addCharacterSaving ? 'Ajout…' : 'Ajouter le joueur'}
                </button>
              </div>
            ) : null}

            <h4 style={{ marginTop: '1rem' }}>Cartes</h4>
            {mapsLoading ? <p>Chargement des cartes…</p> : null}

            {!mapsLoading && editCampaignMaps.length === 0 ? <p>Aucune carte.</p> : null}

            {!mapsLoading && editCampaignMaps.length > 0 ? (
              <div className="table-wrap">
                <table className="table inventory-items-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Image</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editCampaignMaps.map((m) => (
                      <tr key={m.id}>
                        <td data-label="Nom">{m.name}</td>
                        <td data-label="Image">—</td>
                        <td data-label="Actions">
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-small"
                              type="button"
                              disabled={editMapSaving || createMapSaving || deleteMapSavingId === m.id}
                              onClick={() => navigate(`/campaigns/${editCampaignId ?? m.campaign_id}/maps/${m.id}/edit`)}
                            >
                              Éditer
                            </button>
                            <button
                              className="btn btn-secondary btn-small"
                              type="button"
                              disabled={deleteMapSavingId === m.id}
                              aria-label="Supprimer la carte"
                              onClick={() => setDeleteMapTarget({ id: m.id, name: m.name })}
                              title="Supprimer"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h4 style={{ marginTop: '1rem' }}>{editMapId == null ? 'Ajouter une carte' : 'Éditer la carte'}</h4>
            <div className="login-form" style={{ marginTop: '0.25rem' }}>
              <label htmlFor="campaign-map-name">Nom</label>
              <input
                id="campaign-map-name"
                type="text"
                value={editMapId == null ? createMapForm.name : editMapForm.name}
                onChange={(event) => {
                  const v = event.target.value
                  if (editMapId == null) setCreateMapForm((p) => ({ ...p, name: v }))
                  else setEditMapForm((p) => ({ ...p, name: v }))
                }}
                disabled={createMapSaving || editMapSaving}
              />

              <label htmlFor="campaign-map-image-file">{editMapId == null ? 'Image' : 'Remplacer l’image (optionnel)'}</label>
              <input
                id="campaign-map-image-file"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(event) => {
                  const f = event.target.files?.[0] ?? null
                  if (editMapId == null) setCreateMapForm((p) => ({ ...p, image_file: f }))
                  else setEditMapForm((p) => ({ ...p, image_file: f }))
                }}
                disabled={createMapSaving || editMapSaving}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editMapId == null ? (
                  <button className="btn" type="button" disabled={createMapSaving} onClick={() => void handleCreateMap()}>
                    {createMapSaving ? 'Création…' : 'Créer'}
                  </button>
                ) : (
                  <>
                    <button className="btn" type="button" disabled={editMapSaving} onClick={() => void handleSaveMap()}>
                      {editMapSaving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={editMapSaving}
                      onClick={() => {
                        setEditMapId(null)
                        setEditMapForm({ name: '', image_file: null })
                      }}
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" type="button" disabled={editSaving} onClick={() => setIsEditModalOpen(false)}>
                Retour
              </button>
            </div>
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

      {deleteMapTarget ? (
        <div
          className="modal-backdrop modal-backdrop-stacked"
          onClick={() => {
            if (deleteMapSavingId == null) setDeleteMapTarget(null)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Supprimer la carte</h3>
            <p>
              Confirmer la suppression de <strong>{deleteMapTarget.name || `Carte #${deleteMapTarget.id}`}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn" type="button" disabled={deleteMapSavingId != null} onClick={() => void handleDeleteMap()}>
                {deleteMapSavingId != null ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={deleteMapSavingId != null}
                onClick={() => setDeleteMapTarget(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(campaignDetailLoading || selectedCampaignDetail) ? (
        <div
          className="modal-backdrop modal-backdrop-stacked"
          onClick={() => {
            if (!campaignDetailLoading) setSelectedCampaignDetail(null)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            {campaignDetailLoading ? <p>Chargement…</p> : null}
            {!campaignDetailLoading && selectedCampaignDetail ? (
              <>
                <div className="item-details-header">
                  <div>
                    <div className="item-details-header-name" style={{ fontSize: '1.12rem' }}>
                      {selectedCampaignDetail.name?.trim() || '—'}
                    </div>
                    <div className="item-details-header-submeta">
                      {selectedCampaignDetail.gm_username?.trim()
                        ? `Game Master - ${selectedCampaignDetail.gm_username}${selectedCampaignDetail.gm_email ? ` (${selectedCampaignDetail.gm_email})` : ''}`
                        : '—'}
                    </div>
                  </div>
                  <div className="item-details-header-meta">
                    <span className="item-details-header-type">{selectedCampaignDetail.status}</span>
                  </div>
                </div>

                <div className="item-details" style={{ marginTop: '0.75rem' }}>
                  <p style={{ margin: 0 }}>{selectedCampaignDetail.description?.trim() || '—'}</p>
                </div>

                <hr
                  style={{
                    border: 0,
                    borderTop: '1px solid var(--border)',
                    opacity: 0.7,
                    margin: '0.75rem 0',
                  }}
                />

                <h4 style={{ marginTop: '1rem' }}>Liste des personnages</h4>
                {selectedCampaignDetail.characters?.length ? (
                  <div className="table-wrap">
                    <table className="table inventory-items-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Joueur</th>
                          <th>Classe</th>
                          <th>Niveau</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCampaignDetail.characters.map((link) => (
                          <tr key={link.id}>
                            <td data-label="Nom">{link.character_name ?? '—'}</td>
                            <td data-label="Joueur">{link.player_username ?? '—'}</td>
                            <td data-label="Classe">{link.class ?? '—'}</td>
                            <td data-label="Niveau">{link.level ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>Aucun personnage lié.</p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="btn btn-secondary" type="button" onClick={() => setSelectedCampaignDetail(null)}>
                    Fermer
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

    </Card>
  )
}
