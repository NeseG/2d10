import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/api/client'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'

type SessionListItem = {
  id: number
  campaign_id: number
  campaign_name?: string | null
  session_number?: number | null
  title?: string | null
  session_date?: string | null
  is_active: boolean
}

type CampaignListItem = {
  id: number
  name: string
}

type SessionAttendanceItem = {
  id: number
  character_id: number
  character_name?: string | null
  class?: string | null
  level?: number | null
  player_username?: string | null
}

type SessionCampaignCharacter = {
  id: number
  campaign_id: number
  character_id: number
  character_name?: string | null
  class?: string | null
  level?: number | null
  race?: string | null
  player_username?: string | null
}

type SessionDetail = {
  id: number
  campaign_id: number
  title?: string | null
  session_date?: string | null
  is_active: boolean
  attendance?: SessionAttendanceItem[]
  campaign_characters?: SessionCampaignCharacter[]
}

export function SessionsPage() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [loading, setLoading] = useState(false)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    campaignId: 0,
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    sessionId: 0,
    title: '',
    sessionDate: '',
    isActive: true,
    attendance: [] as SessionAttendanceItem[],
    campaignCharacters: [] as SessionCampaignCharacter[],
    selectedCharacterId: 0,
  })
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<{ id: number; title: string } | null>(null)
  const [addCharacterSaving, setAddCharacterSaving] = useState(false)

  const canManageSessions = user?.role === 'admin' || user?.role === 'gm'

  async function loadSessions() {
    setLoading(true)
    try {
      const response = await apiGet<{ success: boolean; sessions: SessionListItem[] }>('/api/sessions/active', token)
      setSessions(Array.isArray(response.sessions) ? response.sessions : [])
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur de chargement des sessions',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadCampaigns() {
    if (!canManageSessions) return
    try {
      const response = await apiGet<{ success: boolean; campaigns: CampaignListItem[] }>('/api/campaigns', token)
      const list = Array.isArray(response.campaigns) ? response.campaigns : []
      setCampaigns(list)
      if (list.length > 0) {
        setCreateForm((prev) => ({
          ...prev,
          campaignId: prev.campaignId || list[0].id,
        }))
      }
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur de chargement des campagnes',
        severity: 'error',
      })
    }
  }

  useEffect(() => {
    void loadSessions()
    void loadCampaigns()
  }, [token, canManageSessions, showSnackbar])

  const activeSessions = useMemo(() => sessions.filter((s) => s.is_active), [sessions])

  function handleJoinSession(session: SessionListItem) {
    const payload = {
      id: session.id,
      title: session.title ?? `Session #${session.session_number ?? session.id}`,
      campaign_name: session.campaign_name ?? null,
      session_date: session.session_date ?? null,
    }
    localStorage.setItem('joined_session', JSON.stringify(payload))
    window.dispatchEvent(new Event('joined-session-changed'))
    showSnackbar({ message: `Session rejointe : ${payload.title}`, severity: 'success' })
    navigate('/session-live')
  }

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!createForm.campaignId) {
      showSnackbar({ message: 'Sélectionne une campagne.', severity: 'error' })
      return
    }
    setCreateSaving(true)
    try {
      const sessionNumbers = sessions
        .filter((s) => s.campaign_id === createForm.campaignId)
        .map((s) => s.session_number ?? 0)
      const nextSessionNumber = (sessionNumbers.length ? Math.max(...sessionNumbers) : 0) + 1
      const today = new Date().toISOString().slice(0, 10)

      await apiPost(
        `/api/sessions/campaign/${createForm.campaignId}`,
        {
          session_number: nextSessionNumber,
          title: createForm.title.trim() || `Session ${nextSessionNumber}`,
          session_date: today,
        },
        token,
      )

      setIsCreateModalOpen(false)
      setCreateForm((prev) => ({ ...prev, title: '' }))
      showSnackbar({ message: 'Session créée avec succès.', severity: 'success' })
      await loadSessions()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création session',
        severity: 'error',
      })
    } finally {
      setCreateSaving(false)
    }
  }

  async function openEditSession(sessionId: number) {
    setIsEditModalOpen(true)
    setEditLoading(true)
    setEditSaving(false)
    try {
      const response = await apiGet<{ success: boolean; session: SessionDetail }>(`/api/sessions/${sessionId}`, token)
      const current = response.session
      setEditForm({
        sessionId: current.id,
        title: current.title ?? '',
        sessionDate: current.session_date ?? '',
        isActive: Boolean(current.is_active),
        attendance: Array.isArray(current.attendance) ? current.attendance : [],
        campaignCharacters: Array.isArray(current.campaign_characters) ? current.campaign_characters : [],
        selectedCharacterId: 0,
      })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur de chargement de la session',
        severity: 'error',
      })
    } finally {
      setEditLoading(false)
    }
  }

  async function handleAddCharacterToSession() {
    if (!editForm.selectedCharacterId) {
      showSnackbar({ message: 'Sélectionne un personnage.', severity: 'error' })
      return
    }
    setAddCharacterSaving(true)
    try {
      await apiPost(
        `/api/sessions/${editForm.sessionId}/attendance`,
        {
          character_id: editForm.selectedCharacterId,
          attended: true,
        },
        token,
      )
      showSnackbar({ message: 'Personnage ajouté à la session.', severity: 'success' })
      await openEditSession(editForm.sessionId)
      await loadSessions()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur ajout personnage',
        severity: 'error',
      })
    } finally {
      setAddCharacterSaving(false)
    }
  }

  async function handleSaveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEditSaving(true)
    try {
      await apiPut(
        `/api/sessions/${editForm.sessionId}`,
        {
          title: editForm.title.trim(),
          session_date: editForm.sessionDate,
          is_active: editForm.isActive,
        },
        token,
      )
      setIsEditModalOpen(false)
      showSnackbar({ message: 'Session mise à jour.', severity: 'success' })
      await loadSessions()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur de mise à jour de la session',
        severity: 'error',
      })
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteSession() {
    if (!deleteSessionTarget) return
    setDeletingSessionId(deleteSessionTarget.id)
    try {
      await apiDelete(`/api/sessions/${deleteSessionTarget.id}`, token)
      showSnackbar({ message: 'Session supprimée.', severity: 'success' })
      if (editForm.sessionId === deleteSessionTarget.id) {
        setIsEditModalOpen(false)
      }
      setDeleteSessionTarget(null)
      await loadSessions()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression session',
        severity: 'error',
      })
    } finally {
      setDeletingSessionId(null)
    }
  }

  return (
    <Card title="Sessions">
      {canManageSessions ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button className="btn" type="button" onClick={() => setIsCreateModalOpen(true)}>
            Créer une session
          </button>
        </div>
      ) : null}

      {loading ? <p>Chargement…</p> : null}

      <div className="table-wrap">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Campagne</th>
              <th>Date</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeSessions.map((session) => (
              <tr key={session.id}>
                <td data-label="Session">{session.title ?? `Session #${session.session_number ?? session.id}`}</td>
                <td data-label="Campagne">{session.campaign_name ?? '—'}</td>
                <td data-label="Date">{session.session_date ?? '—'}</td>
                <td data-label="Statut">{session.is_active ? 'active' : 'inactive'}</td>
                <td data-label="Actions">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-small" type="button" onClick={() => handleJoinSession(session)}>
                      Rejoindre
                    </button>
                  {canManageSessions ? (
                    <>
                      <button className="btn btn-small btn-secondary" type="button" onClick={() => void openEditSession(session.id)}>
                        Éditer
                      </button>
                      <button
                        className="btn btn-small btn-secondary"
                        type="button"
                        disabled={deletingSessionId === session.id}
                        onClick={() =>
                          setDeleteSessionTarget({
                            id: session.id,
                            title: session.title ?? `Session #${session.session_number ?? session.id}`,
                          })
                        }
                      >
                        {deletingSessionId === session.id ? 'Suppression…' : 'Supprimer'}
                      </button>
                    </>
                  ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && activeSessions.length === 0 ? (
              <tr>
                <td colSpan={5}>Aucune session active disponible.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!createSaving) setIsCreateModalOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Créer une session</h3>
            <form className="login-form" onSubmit={handleCreateSession}>
              <label htmlFor="create-session-title">Nom de la session</label>
              <input
                id="create-session-title"
                type="text"
                required
                disabled={createSaving}
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
              />

              <label htmlFor="create-session-campaign">Campagne associée</label>
              <select
                id="create-session-campaign"
                required
                disabled={createSaving || campaigns.length === 0}
                value={createForm.campaignId || ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, campaignId: Number.parseInt(event.target.value, 10) || 0 }))
                }
              >
                {campaigns.length === 0 ? <option value="">Aucune campagne disponible</option> : null}
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn" type="submit" disabled={createSaving || campaigns.length === 0}>
                  {createSaving ? 'Création…' : 'Créer'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={createSaving} onClick={() => setIsCreateModalOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isEditModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!editSaving) setIsEditModalOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Éditer la session</h3>
            {editLoading ? <p>Chargement…</p> : null}

            {!editLoading ? (
              <form className="login-form" onSubmit={handleSaveSession}>
                <label htmlFor="edit-session-title">Nom</label>
                <input
                  id="edit-session-title"
                  type="text"
                  required
                  disabled={editSaving}
                  value={editForm.title}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                />

                <label htmlFor="edit-session-date">Date</label>
                <input
                  id="edit-session-date"
                  type="date"
                  required
                  disabled={editSaving}
                  value={editForm.sessionDate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, sessionDate: event.target.value }))}
                />

                <label htmlFor="edit-session-active" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    id="edit-session-active"
                    type="checkbox"
                    checked={editForm.isActive}
                    disabled={editSaving}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Session active
                </label>

                <h4 style={{ marginTop: '0.75rem' }}>Personnages de la session</h4>
                {editForm.attendance.length === 0 ? (
                  <p>Aucun personnage lié.</p>
                ) : (
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
                        {editForm.attendance.map((row) => (
                          <tr key={row.id}>
                            <td data-label="Nom">{row.character_name ?? '—'}</td>
                            <td data-label="Joueur">{row.player_username ?? '—'}</td>
                            <td data-label="Classe">{row.class ?? '—'}</td>
                            <td data-label="Niveau">{row.level ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h4 style={{ marginTop: '0.75rem' }}>Ajouter un personnage de la campagne</h4>
                <select
                  value={editForm.selectedCharacterId || ''}
                  disabled={addCharacterSaving}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      selectedCharacterId: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                >
                  <option value="">— Sélectionner —</option>
                  {editForm.campaignCharacters
                    .filter((character) => !editForm.attendance.some((a) => a.character_id === character.character_id))
                    .map((character) => (
                      <option key={character.id} value={character.character_id}>
                        {character.character_name ?? 'Sans nom'}
                        {character.level != null ? ` (lvl ${character.level})` : ''}
                        {character.class ? ` - ${character.class}` : ''}
                        {character.player_username ? ` - ${character.player_username}` : ''}
                      </option>
                    ))}
                </select>
                <button
                  className="btn"
                  type="button"
                  disabled={addCharacterSaving}
                  onClick={() => void handleAddCharacterToSession()}
                >
                  {addCharacterSaving ? 'Ajout…' : 'Ajouter le personnage'}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="btn" type="submit" disabled={editSaving}>
                    {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button className="btn btn-secondary" type="button" disabled={editSaving} onClick={() => setIsEditModalOpen(false)}>
                    Annuler
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={editSaving || deletingSessionId === editForm.sessionId}
                    onClick={() =>
                      setDeleteSessionTarget({
                        id: editForm.sessionId,
                        title: editForm.title.trim() || `Session #${editForm.sessionId}`,
                      })
                    }
                  >
                    {deletingSessionId === editForm.sessionId ? 'Suppression…' : 'Supprimer'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {deleteSessionTarget ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deletingSessionId) setDeleteSessionTarget(null)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Supprimer la session</h3>
            <p>
              Confirmer la suppression de <strong>{deleteSessionTarget.title}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn" type="button" disabled={deletingSessionId != null} onClick={() => void handleDeleteSession()}>
                {deletingSessionId != null ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={deletingSessionId != null}
                onClick={() => setDeleteSessionTarget(null)}
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
