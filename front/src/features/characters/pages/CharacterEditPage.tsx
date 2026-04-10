import { useEffect, useState } from 'react'
import { Activity, Backpack, BookMarked, Cat, Clover, Eye, ScrollText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiDelete, apiGet, getApiBaseUrl } from '../../../shared/api/client'
import { CharacterCharacteristicsTab } from '../components/CharacterCharacteristicsTab'
import { CharacterInventoryTab } from '../components/CharacterInventoryTab'
import { CharacterGrimoireTab } from '../components/CharacterGrimoireTab'
import { CharacterFeaturesTab } from '../components/CharacterFeaturesTab'
import { CharacterNotesTab } from '../components/CharacterNotesTab'
import { CharacterPetsTab } from '../components/CharacterPetsTab'

type CharacterTab = 'characteristics' | 'inventory' | 'grimoire' | 'features' | 'notes' | 'pets'

export function CharacterEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { showSnackbar } = useSnackbar()

  const [activeTab, setActiveTab] = useState<CharacterTab>('characteristics')

  const [characterName, setCharacterName] = useState('')
  const [characterAvatarUrl, setCharacterAvatarUrl] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadName() {
      if (!id) return
      try {
        const res = await apiGet<{ success: boolean; character: { name: string; avatar_url?: string | null } }>(
          `/api/characters/${id}`,
          token,
        )
        setCharacterName(res.character?.name ?? '')
        setCharacterAvatarUrl(res.character?.avatar_url ?? '')
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement',
          severity: 'error',
        })
      }
    }
    void loadName()
  }, [id, token, showSnackbar])

  async function handleConfirmDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await apiDelete(`/api/characters/${id}`, token)
      navigate('/characters')
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression personnage',
        severity: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="character-edit-page">
      <Card title="">
        <div className="character-page-header">
          <div className="character-page-avatar">
            {characterAvatarUrl ? (
              <img
                src={`${getApiBaseUrl()}${characterAvatarUrl.startsWith('/') ? characterAvatarUrl : `/${characterAvatarUrl}`}`}
                alt={`Avatar de ${characterName || 'ce personnage'}`}
              />
            ) : (
              <span>{(characterName.trim()[0] || '?').toUpperCase()}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 className="character-page-title">Edition du personnage {characterName.trim() || (id ? `#${id}` : '')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={!id}
                onClick={() => {
                  if (!id) return
                  navigate(`/characters/${id}/view`)
                }}
                title="Ouvrir la visualisation (vue session)"
                aria-label="Ouvrir la visualisation (vue session)"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Eye size={16} aria-hidden="true" />
                  Visualiser
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="tabs-row">
          <button
            className={`tab-btn ${activeTab === 'characteristics' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('characteristics')}
            title="Characteristic"
            aria-label="Characteristic"
          >
            <Activity size={22} aria-hidden="true" />
          </button>
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('inventory')}
            title="Inventory"
            aria-label="Inventory"
          >
            <Backpack size={22} aria-hidden="true" />
          </button>
          <button
            className={`tab-btn ${activeTab === 'grimoire' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('grimoire')}
            title="Grimoire"
            aria-label="Grimoire"
          >
            <BookMarked size={22} aria-hidden="true" />
          </button>
          <button
            className={`tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('features')}
            title="Traits"
            aria-label="Traits"
          >
            <Clover size={22} aria-hidden="true" />
          </button>
          <button
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('notes')}
            title="Notes"
            aria-label="Notes"
          >
            <ScrollText size={22} aria-hidden="true" />
          </button>
          <button
            className={`tab-btn ${activeTab === 'pets' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('pets')}
            title="Familier"
            aria-label="Familier"
          >
            <Cat size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="tab-panel">
          {!id ? <p>Personnage introuvable.</p> : null}
          {id && activeTab === 'characteristics' ? (
            <CharacterCharacteristicsTab
              characterId={id}
              token={token}
              user={user}
              onNameLoaded={(name) => {
                if (name) setCharacterName(name)
              }}
              onAvatarLoaded={(avatarUrl) => {
                setCharacterAvatarUrl(avatarUrl)
              }}
            />
          ) : null}
          {id && activeTab === 'inventory' ? <CharacterInventoryTab characterId={id} token={token} /> : null}
          {id && activeTab === 'grimoire' ? <CharacterGrimoireTab characterId={id} token={token} user={user} /> : null}
          {id && activeTab === 'features' ? <CharacterFeaturesTab characterId={id} token={token} /> : null}
          {id && activeTab === 'notes' ? <CharacterNotesTab characterId={id} token={token} /> : null}
          {id && activeTab === 'pets' ? <CharacterPetsTab characterId={id} token={token} /> : null}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" type="button" onClick={() => setIsDeleteModalOpen(true)} disabled={!id}>
            Supprimer
          </button>
        </div>

        {isDeleteModalOpen && (
          <div
            className="modal-backdrop"
            onClick={() => {
              if (!deleting) setIsDeleteModalOpen(false)
            }}
          >
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <h3>Supprimer le personnage</h3>
              <p>
                Confirmer la suppression de <strong>{characterName.trim() || (id ? `#${id}` : 'ce personnage')}</strong> ?
              </p>
              <p style={{ color: 'var(--muted)', marginTop: '-0.25rem' }}>
                Cette action est irréversible.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn" type="button" disabled={deleting} onClick={() => void handleConfirmDelete()}>
                  {deleting ? 'Suppression…' : 'Oui, supprimer'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={deleting} onClick={() => setIsDeleteModalOpen(false)}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

