import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { apiDelete, apiGet, apiPost, apiPostFormData, apiPut } from '../../../shared/api/client'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'

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

type CharacterListItem = {
  id: number
  name: string
  class?: string | null
  level?: number | null
  race?: string | null
  user?: { username?: string | null } | null
}

type CampaignMap = {
  id: number
  campaign_id: number
  folder_id?: number | null
  name: string
  image_url: string
  fog_state?: unknown
  tokens_state?: unknown
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type CampaignMapFolder = {
  id: number
  campaign_id: number
  parent_id?: number | null
  name: string
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type TabId = 'general' | 'maps'

type DragPayload =
  | { kind: 'map'; id: number }
  | { kind: 'folder'; id: number }

export function CampaignPage() {
  const navigate = useNavigate()
  const params = useParams()
  const campaignId = Number.parseInt(params.campaignId ?? '', 10)
  const { token, user } = useAuth()
  const { showSnackbar } = useSnackbar()

  const canManageCampaigns = user?.role === 'admin' || user?.role === 'gm'

  const [tab, setTab] = useState<TabId>('general')

  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)

  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'paused' | 'done',
  })
  const editSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersistedEditRef = useRef('')

  const [charactersLoading, setCharactersLoading] = useState(false)
  const [allCharacters, setAllCharacters] = useState<CharacterListItem[]>([])
  const [characterSearch, setCharacterSearch] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | ''>('')
  const [addCharacterSaving, setAddCharacterSaving] = useState(false)
  const [removeCharacterSavingId, setRemoveCharacterSavingId] = useState<number | null>(null)

  const [mapsLoading, setMapsLoading] = useState(false)
  const [maps, setMaps] = useState<CampaignMap[]>([])
  const [createMapSaving, setCreateMapSaving] = useState(false)
  const [createMapForm, setCreateMapForm] = useState({ name: '', image_file: null as File | null })
  const [deleteMapSavingId, setDeleteMapSavingId] = useState<number | null>(null)
  const [deleteMapTarget, setDeleteMapTarget] = useState<{ id: number; name: string } | null>(null)

  const [foldersLoading, setFoldersLoading] = useState(false)
  const [folders, setFolders] = useState<CampaignMapFolder[]>([])
  const [createFolderSaving, setCreateFolderSaving] = useState(false)
  const [createFolderForm, setCreateFolderForm] = useState<{ name: string; parent_id: number | '' }>({ name: '', parent_id: '' })
  const [deleteFolderSavingId, setDeleteFolderSavingId] = useState<number | null>(null)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    return () => {
      if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current)
    }
  }, [])

  async function loadCampaign() {
    if (Number.isNaN(campaignId)) return
    setCampaignLoading(true)
    try {
      const response = await apiGet<{ success: boolean; campaign: CampaignDetail }>(`/api/campaigns/${campaignId}`, token)
      const c = response.campaign ?? null
      setCampaign(c)
      setEditForm({
        name: c?.name ?? '',
        description: c?.description ?? '',
        status: c?.status ?? 'active',
      })
      lastPersistedEditRef.current = JSON.stringify({
        name: c?.name ?? '',
        description: c?.description ?? '',
        status: c?.status ?? 'active',
      })
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur chargement campagne', severity: 'error' })
    } finally {
      setCampaignLoading(false)
    }
  }

  async function loadCharacters() {
    setCharactersLoading(true)
    try {
      const charactersRes = await apiGet<{ success: boolean; characters: CharacterListItem[] }>(`/api/characters`, token)
      setAllCharacters(Array.isArray(charactersRes.characters) ? charactersRes.characters : [])
    } catch (err) {
      setAllCharacters([])
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur chargement personnages', severity: 'error' })
    } finally {
      setCharactersLoading(false)
    }
  }

  async function loadMaps() {
    if (Number.isNaN(campaignId)) return
    setMapsLoading(true)
    try {
      const res = await apiGet<{ success: boolean; maps: CampaignMap[] }>(`/api/campaigns/${campaignId}/maps`, token)
      setMaps(Array.isArray(res.maps) ? res.maps : [])
    } catch (err) {
      setMaps([])
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur chargement cartes', severity: 'error' })
    } finally {
      setMapsLoading(false)
    }
  }

  async function loadFolders() {
    if (Number.isNaN(campaignId)) return
    setFoldersLoading(true)
    try {
      const res = await apiGet<{ success: boolean; folders: CampaignMapFolder[] }>(`/api/campaigns/${campaignId}/map-folders`, token)
      setFolders(Array.isArray(res.folders) ? res.folders : [])
    } catch (err) {
      setFolders([])
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur chargement dossiers', severity: 'error' })
    } finally {
      setFoldersLoading(false)
    }
  }

  useEffect(() => {
    if (Number.isNaN(campaignId)) return
    void loadCampaign()
    void loadCharacters()
    void loadMaps()
    void loadFolders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, token])

  async function persistCampaignEdit(nextForm: typeof editForm) {
    if (Number.isNaN(campaignId)) return
    if (!canManageCampaigns) return
    setEditSaving(true)
    try {
      await apiPut(
        `/api/campaigns/${campaignId}`,
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
      await loadCampaign()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur sauvegarde campagne', severity: 'error' })
    } finally {
      setEditSaving(false)
    }
  }

  useEffect(() => {
    if (Number.isNaN(campaignId)) return
    if (!canManageCampaigns) return
    if (campaignLoading) return

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
  }, [campaignId, editForm, campaignLoading, canManageCampaigns])

  const campaignCharacters = Array.isArray(campaign?.characters) ? campaign.characters : []

  const filteredCharacters = useMemo(() => {
    const q = characterSearch.trim().toLowerCase()
    if (!q) return allCharacters
    return allCharacters.filter((c) => {
      return (
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.user?.username ?? '').toLowerCase().includes(q) ||
        (c.class ?? '').toLowerCase().includes(q) ||
        (c.race ?? '').toLowerCase().includes(q)
      )
    })
  }, [allCharacters, characterSearch])

  async function handleAddCharacterToCampaign() {
    if (Number.isNaN(campaignId)) return
    if (selectedCharacterId === '') {
      showSnackbar({ message: 'Sélectionne un personnage.', severity: 'error' })
      return
    }
    setAddCharacterSaving(true)
    try {
      await apiPost(`/api/campaigns/${campaignId}/characters`, { character_id: selectedCharacterId }, token)
      showSnackbar({ message: 'Personnage ajouté à la campagne.', severity: 'success' })
      setSelectedCharacterId('')
      await loadCampaign()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur ajout personnage', severity: 'error' })
    } finally {
      setAddCharacterSaving(false)
    }
  }

  async function handleRemoveCharacterFromCampaign(characterId: number) {
    if (Number.isNaN(campaignId)) return
    setRemoveCharacterSavingId(characterId)
    try {
      await apiDelete(`/api/campaigns/${campaignId}/characters/${characterId}`, token)
      showSnackbar({ message: 'Personnage retiré de la campagne.', severity: 'success' })
      await loadCampaign()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur suppression personnage', severity: 'error' })
    } finally {
      setRemoveCharacterSavingId(null)
    }
  }

  async function handleCreateMap() {
    if (Number.isNaN(campaignId)) return
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
      await apiPostFormData(`/api/campaigns/${campaignId}/maps`, fd, token)
      showSnackbar({ message: 'Carte créée.', severity: 'success' })
      setCreateMapForm({ name: '', image_file: null })
      await loadMaps()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur création carte', severity: 'error' })
    } finally {
      setCreateMapSaving(false)
    }
  }

  async function handleCreateFolder() {
    if (Number.isNaN(campaignId)) return
    const name = createFolderForm.name.trim()
    if (!name) {
      showSnackbar({ message: 'Nom de dossier requis.', severity: 'error' })
      return
    }
    setCreateFolderSaving(true)
    try {
      const parentId = createFolderForm.parent_id === '' ? null : createFolderForm.parent_id
      await apiPost(`/api/campaigns/${campaignId}/map-folders`, { name, parent_id: parentId }, token)
      setCreateFolderForm({ name: '', parent_id: '' })
      showSnackbar({ message: 'Dossier créé.', severity: 'success' })
      await loadFolders()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur création dossier', severity: 'error' })
    } finally {
      setCreateFolderSaving(false)
    }
  }

  async function handleRenameFolder(folderId: number) {
    if (Number.isNaN(campaignId)) return
    const current = folders.find((f) => f.id === folderId)?.name ?? ''
    const next = window.prompt('Renommer le dossier', current)
    if (next == null) return
    const name = next.trim()
    if (!name) {
      showSnackbar({ message: 'Nom requis.', severity: 'error' })
      return
    }
    try {
      await apiPut(`/api/campaigns/${campaignId}/map-folders/${folderId}`, { name }, token)
      await loadFolders()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur renommage dossier', severity: 'error' })
    }
  }

  async function handleDeleteFolder(folderId: number) {
    if (Number.isNaN(campaignId)) return
    const name = folders.find((f) => f.id === folderId)?.name ?? `#${folderId}`
    if (!window.confirm(`Supprimer le dossier "${name}" ?\nLes sous-dossiers et cartes seront remontés au niveau du parent.`)) return
    setDeleteFolderSavingId(folderId)
    try {
      await apiDelete(`/api/campaigns/${campaignId}/map-folders/${folderId}`, token)
      showSnackbar({ message: 'Dossier supprimé.', severity: 'success' })
      await loadFolders()
      await loadMaps()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur suppression dossier', severity: 'error' })
    } finally {
      setDeleteFolderSavingId(null)
    }
  }

  function setDragPayload(ev: React.DragEvent, payload: DragPayload) {
    ev.dataTransfer.setData('application/json', JSON.stringify(payload))
    ev.dataTransfer.effectAllowed = 'move'
  }

  function readDragPayload(ev: React.DragEvent): DragPayload | null {
    const raw = ev.dataTransfer.getData('application/json')
    if (!raw) return null
    try {
      const p = JSON.parse(raw) as DragPayload
      if (p?.kind === 'map' && Number.isFinite(p.id)) return p
      if (p?.kind === 'folder' && Number.isFinite(p.id)) return p
      return null
    } catch {
      return null
    }
  }

  async function handleDropOnFolder(targetFolderId: number | null, ev: React.DragEvent) {
    ev.preventDefault()
    if (!canManageCampaigns) return
    if (Number.isNaN(campaignId)) return
    const payload = readDragPayload(ev)
    if (!payload) return

    try {
      if (payload.kind === 'map') {
        await apiPut(`/api/campaigns/${campaignId}/maps/${payload.id}`, { folder_id: targetFolderId }, token)
        await loadMaps()
        return
      }
      if (payload.kind === 'folder') {
        if (targetFolderId != null && payload.id === targetFolderId) return
        await apiPut(`/api/campaigns/${campaignId}/map-folders/${payload.id}`, { parent_id: targetFolderId }, token)
        await loadFolders()
        return
      }
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Déplacement impossible', severity: 'error' })
    }
  }

  async function handleDeleteMap() {
    if (Number.isNaN(campaignId)) return
    if (!deleteMapTarget) return
    setDeleteMapSavingId(deleteMapTarget.id)
    try {
      await apiDelete(`/api/campaigns/${campaignId}/maps/${deleteMapTarget.id}`, token)
      showSnackbar({ message: 'Carte supprimée.', severity: 'success' })
      setDeleteMapTarget(null)
      await loadMaps()
    } catch (err) {
      showSnackbar({ message: err instanceof Error ? err.message : 'Erreur suppression carte', severity: 'error' })
    } finally {
      setDeleteMapSavingId(null)
    }
  }

  const nbJoueurs = campaignCharacters.length
  const nbCartes = maps.length

  const foldersByParent = useMemo(() => {
    const list = [...folders]
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    const m = new Map<number | null, CampaignMapFolder[]>()
    for (const f of list) {
      const p = f.parent_id ?? null
      const arr = m.get(p) ?? []
      arr.push(f)
      m.set(p, arr)
    }
    return m
  }, [folders])

  const mapsByFolder = useMemo(() => {
    const list = [...maps]
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    const m = new Map<number | null, CampaignMap[]>()
    for (const mp of list) {
      const p = mp.folder_id ?? null
      const arr = m.get(p) ?? []
      arr.push(mp)
      m.set(p, arr)
    }
    return m
  }, [maps])

  function renderFolderNode(folder: CampaignMapFolder, depth: number): React.ReactNode {
    const children = foldersByParent.get(folder.id) ?? []
    const mapsHere = mapsByFolder.get(folder.id) ?? []
    const pad = Math.min(depth * 12, 48)
    const isCollapsed = collapsedFolderIds.has(folder.id)
    return (
      <div key={`folder-${folder.id}`} style={{ marginLeft: pad }}>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            padding: '0.35rem 0.5rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
            marginTop: 6,
          }}
          draggable={canManageCampaigns}
          onDragStart={(ev) => setDragPayload(ev, { kind: 'folder', id: folder.id })}
          onDragOver={(ev) => {
            if (!canManageCampaigns) return
            ev.preventDefault()
            ev.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(ev) => void handleDropOnFolder(folder.id, ev)}
          title="Dépose ici une carte ou un dossier"
        >
          <button
            className="btn-small"
            type="button"
            onClick={() => {
              setCollapsedFolderIds((prev) => {
                const next = new Set(prev)
                if (next.has(folder.id)) next.delete(folder.id)
                else next.add(folder.id)
                return next
              })
            }}
            aria-label={isCollapsed ? 'Déplier le dossier' : 'Replier le dossier'}
            title={isCollapsed ? 'Déplier' : 'Replier'}
            style={{
              width: 26,
              height: 26,
              padding: 0,
              border: 0,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              lineHeight: 1,
              opacity: 0.9,
            }}
          >
            {isCollapsed ? '+' : '–'}
          </button>
          <strong style={{ flex: 1 }}>{folder.name}</strong>
          {canManageCampaigns ? (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => void handleRenameFolder(folder.id)}>
                Renommer
              </button>
              <button
                className="btn btn-secondary btn-small"
                type="button"
                disabled={deleteFolderSavingId === folder.id}
                onClick={() => void handleDeleteFolder(folder.id)}
              >
                Supprimer
              </button>
            </div>
          ) : null}
        </div>

        {!isCollapsed && mapsHere.length ? (
          <div style={{ marginLeft: pad + 12 }}>
            {mapsHere.map((m) => (
              <div
                key={`map-${m.id}`}
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  opacity: 0.95,
                  marginTop: 6,
                }}
                draggable={canManageCampaigns}
                onDragStart={(ev) => setDragPayload(ev, { kind: 'map', id: m.id })}
              >
                <span style={{ flex: 1 }}>{m.name}</span>
                <button className="btn btn-small" type="button" onClick={() => navigate(`/campaigns/${campaignId}/maps/${m.id}/edit`)}>
                  Éditer
                </button>
                {canManageCampaigns ? (
                  <button className="btn btn-secondary btn-small" type="button" onClick={() => setDeleteMapTarget({ id: m.id, name: m.name })}>
                    Supprimer
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {!isCollapsed ? children.map((c) => renderFolderNode(c, depth + 1)) : null}
      </div>
    )
  }

  return (
    <Card title="Campagne">
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="btn btn-secondary" type="button" onClick={() => navigate('/campaigns')}>
          Retour campagnes
        </button>
        <span style={{ marginLeft: 'auto', opacity: 0.85 }}>
          {campaign ? `#${campaign.id}` : ''}
        </span>
      </div>

      {Number.isNaN(campaignId) ? <p>Paramètres invalides.</p> : null}
      {campaignLoading ? <p>Chargement…</p> : null}

      {!campaignLoading && campaign ? (
        <>
          <div className="item-details-header">
            <div>
              <div className="item-details-header-name" style={{ fontSize: '1.2rem' }}>
                {campaign.name?.trim() || '—'}
              </div>
              <div className="item-details-header-submeta">
                {campaign.gm_username?.trim()
                  ? `Game Master - ${campaign.gm_username}${campaign.gm_email ? ` (${campaign.gm_email})` : ''}`
                  : '—'}
              </div>
            </div>
            <div className="item-details-header-meta">
              <span className="item-details-header-type">{campaign.status}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <button className={`btn${tab === 'general' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTab('general')}>
              General
            </button>
            <button className={`btn${tab === 'maps' ? '' : ' btn-secondary'}`} type="button" onClick={() => setTab('maps')}>
              Cartes
            </button>
          </div>

          {tab === 'general' ? (
            <>
              <div className="item-details" style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 240px' }}>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Nb joueurs</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{nbJoueurs}</div>
                  </div>
                  <div style={{ flex: '1 1 240px' }}>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Nb cartes créées</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{nbCartes}</div>
                  </div>
                </div>
              </div>

              <hr
                style={{
                  border: 0,
                  borderTop: '1px solid var(--border)',
                  opacity: 0.7,
                  margin: '0.75rem 0',
                }}
              />

              <h4 style={{ marginTop: '0.75rem' }}>Informations</h4>

              <form className="login-form item-edit-form" onSubmit={(event) => event.preventDefault()}>
                <label className="item-edit-form-row" htmlFor="campaign-name">
                  <span>Nom</span>
                  <input
                    id="campaign-name"
                    type="text"
                    required
                    disabled={!canManageCampaigns || editSaving}
                    value={editForm.name}
                    onChange={(event) => setEditForm((p) => ({ ...p, name: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="campaign-status">
                  <span>Statut</span>
                  <select
                    id="campaign-status"
                    disabled={!canManageCampaigns || editSaving}
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

                <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="campaign-desc">
                  <span>Description</span>
                  <textarea
                    id="campaign-desc"
                    rows={4}
                    disabled={!canManageCampaigns || editSaving}
                    value={editForm.description}
                    onChange={(event) => setEditForm((p) => ({ ...p, description: event.target.value }))}
                  />
                </label>
              </form>

              <h4 style={{ marginTop: '1rem' }}>Liste des joueurs</h4>
              {campaignCharacters.length === 0 ? (
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
                      {campaignCharacters.map((link) => (
                        <tr key={link.id}>
                          <td data-label="Nom">{link.character_name ?? '—'}</td>
                          <td data-label="Joueur">{link.player_username ?? '—'}</td>
                          <td data-label="Classe">{link.class ?? '—'}</td>
                          <td data-label="Niveau">{link.level ?? '—'}</td>
                          <td data-label="Actions">
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-small"
                                type="button"
                                onClick={() => navigate(`/characters/${link.character_id}/edit`)}
                              >
                                Éditer
                              </button>
                              {canManageCampaigns ? (
                                <button
                                  className="btn btn-secondary btn-small"
                                  type="button"
                                  disabled={removeCharacterSavingId === link.character_id}
                                  aria-label="Retirer le personnage"
                                  onClick={() => void handleRemoveCharacterFromCampaign(link.character_id)}
                                  title="Retirer"
                                >
                                  Retirer
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h4 style={{ marginTop: '1rem' }}>Ajouter un joueur</h4>
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
                    disabled={!canManageCampaigns || addCharacterSaving}
                  />

                  <label htmlFor="campaign-character-select">Personnage</label>
                  <select
                    id="campaign-character-select"
                    value={selectedCharacterId}
                    onChange={(event) => {
                      const raw = event.target.value
                      setSelectedCharacterId(raw === '' ? '' : Number.parseInt(raw, 10))
                    }}
                    disabled={!canManageCampaigns || addCharacterSaving}
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

                  <button
                    className="btn"
                    type="button"
                    disabled={!canManageCampaigns || addCharacterSaving}
                    onClick={() => void handleAddCharacterToCampaign()}
                  >
                    {addCharacterSaving ? 'Ajout…' : 'Ajouter'}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === 'maps' ? (
            <>
              <h4 style={{ marginTop: '1rem' }}>Dossiers & cartes</h4>

              {(foldersLoading || mapsLoading) ? <p>Chargement…</p> : null}

              <div
                style={{
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  marginTop: '0.5rem',
                }}
                onDragOver={(ev) => {
                  if (!canManageCampaigns) return
                  ev.preventDefault()
                  ev.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(ev) => void handleDropOnFolder(null, ev)}
                title="Dépose ici pour mettre à la racine"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>Racine</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {canManageCampaigns ? (
                      <button className="btn btn-small" type="button" onClick={() => setIsCreateFolderModalOpen(true)} disabled={createFolderSaving}>
                        Nouveau dossier
                      </button>
                    ) : null}
                    <button
                      className="btn btn-secondary btn-small"
                      type="button"
                      onClick={() => {
                        void loadFolders()
                        void loadMaps()
                      }}
                      disabled={foldersLoading || mapsLoading}
                    >
                      Rafraîchir
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  {(foldersByParent.get(null) ?? []).map((f) => renderFolderNode(f, 0))}

                  {(mapsByFolder.get(null) ?? []).length ? (
                    <div style={{ marginTop: 8 }}>
                      {(mapsByFolder.get(null) ?? []).map((m) => (
                        <div
                          key={`map-root-${m.id}`}
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 8,
                            border: '1px dashed var(--border)',
                            opacity: 0.95,
                            marginTop: 6,
                          }}
                          draggable={canManageCampaigns}
                          onDragStart={(ev) => setDragPayload(ev, { kind: 'map', id: m.id })}
                        >
                          <span style={{ flex: 1 }}>{m.name}</span>
                          <button className="btn btn-small" type="button" onClick={() => navigate(`/campaigns/${campaignId}/maps/${m.id}/edit`)}>
                            Éditer
                          </button>
                          {canManageCampaigns ? (
                            <button className="btn btn-secondary btn-small" type="button" onClick={() => setDeleteMapTarget({ id: m.id, name: m.name })}>
                              Supprimer
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!foldersLoading && !mapsLoading && folders.length === 0 && maps.length === 0 ? (
                    <p style={{ marginTop: 8, color: 'var(--muted)' }}>Aucune carte ni dossier.</p>
                  ) : null}
                </div>
              </div>

              <h4 style={{ marginTop: '1rem' }}>Ajouter une carte</h4>
              <div className="login-form" style={{ marginTop: '0.25rem' }}>
                <label htmlFor="campaign-map-name">Nom</label>
                <input
                  id="campaign-map-name"
                  type="text"
                  value={createMapForm.name}
                  onChange={(event) => setCreateMapForm((p) => ({ ...p, name: event.target.value }))}
                  disabled={!canManageCampaigns || createMapSaving}
                />

                <label htmlFor="campaign-map-image-file">Image</label>
                <input
                  id="campaign-map-image-file"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(event) => setCreateMapForm((p) => ({ ...p, image_file: event.target.files?.[0] ?? null }))}
                  disabled={!canManageCampaigns || createMapSaving}
                />

                <button className="btn" type="button" disabled={!canManageCampaigns || createMapSaving} onClick={() => void handleCreateMap()}>
                  {createMapSaving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </>
          ) : null}

          {isCreateFolderModalOpen ? (
            <div
              className="modal-backdrop modal-backdrop-stacked"
              onClick={() => {
                if (!createFolderSaving) setIsCreateFolderModalOpen(false)
              }}
            >
              <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                <h3>Nouveau dossier</h3>
                <div className="login-form" style={{ marginTop: '0.25rem' }}>
                  <label htmlFor="campaign-folder-name">Nom</label>
                  <input
                    id="campaign-folder-name"
                    type="text"
                    value={createFolderForm.name}
                    onChange={(e) => setCreateFolderForm((p) => ({ ...p, name: e.target.value }))}
                    disabled={createFolderSaving}
                    placeholder="Nom du dossier…"
                    autoFocus
                  />
                  <label htmlFor="campaign-folder-parent">Parent</label>
                  <select
                    id="campaign-folder-parent"
                    value={createFolderForm.parent_id}
                    onChange={(e) => {
                      const raw = e.target.value
                      setCreateFolderForm((p) => ({ ...p, parent_id: raw === '' ? '' : Number.parseInt(raw, 10) }))
                    }}
                    disabled={createFolderSaving}
                  >
                    <option value="">Racine</option>
                    {folders
                      .slice()
                      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn"
                      type="button"
                      disabled={createFolderSaving}
                      onClick={async () => {
                        await handleCreateFolder()
                        setIsCreateFolderModalOpen(false)
                      }}
                    >
                      {createFolderSaving ? 'Création…' : 'Créer'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={createFolderSaving}
                      onClick={() => setIsCreateFolderModalOpen(false)}
                    >
                      Annuler
                    </button>
                  </div>
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
        </>
      ) : null}
    </Card>
  )
}

