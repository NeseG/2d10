import { useEffect, useState } from 'react'
import { Activity, Backpack, BookMarked, Cat, Clover, ScrollText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet, getApiBaseUrl } from '../../../shared/api/client'
import { CharacterCharacteristicsTab } from '../components/CharacterCharacteristicsTab'
import { CharacterInventoryTab } from '../components/CharacterInventoryTab'
import { CharacterGrimoireTab } from '../components/CharacterGrimoireTab'
import { CharacterFeaturesTab } from '../components/CharacterFeaturesTab'
import { CharacterNotesTab } from '../components/CharacterNotesTab'
import { CharacterPetsTab } from '../components/CharacterPetsTab'

type CharacterViewTab = 'characteristic' | 'inventory' | 'grimoire' | 'traits' | 'notes' | 'pets'

export function CharacterViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { showSnackbar } = useSnackbar()

  const [activeTab, setActiveTab] = useState<CharacterViewTab>('characteristic')
  const [characterName, setCharacterName] = useState('')
  const [characterAvatarUrl, setCharacterAvatarUrl] = useState('')

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

  const resolvedAvatarUrl = characterAvatarUrl
    ? `${getApiBaseUrl()}${characterAvatarUrl.startsWith('/') ? characterAvatarUrl : `/${characterAvatarUrl}`}`
    : ''

  return (
    <div className="character-edit-page">
      <Card title="">
        <div className="character-page-header">
          <div className="character-page-avatar">
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt={`Avatar de ${characterName || 'ce personnage'}`} />
            ) : (
              <span>{(characterName.trim()[0] || '?').toUpperCase()}</span>
            )}
          </div>
          <h3 className="character-page-title">
            Visualisation du personnage {characterName.trim() || (id ? `#${id}` : '')}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!id}
            onClick={() => {
              if (!id) return
              navigate(`/characters/${id}/edit`)
            }}
          >
            Retour à l’édition
          </button>
        </div>

        <div className="tab-panel">
          {!id ? <p>Personnage introuvable.</p> : null}
          {id && activeTab === 'characteristic' ? (
            <CharacterCharacteristicsTab
              characterId={id}
              token={token}
              user={user}
              sessionView
              onNameLoaded={(name) => {
                if (name) setCharacterName(name)
              }}
              onAvatarLoaded={(avatarUrl) => {
                setCharacterAvatarUrl(avatarUrl)
              }}
            />
          ) : null}
          {id && activeTab === 'inventory' ? <CharacterInventoryTab characterId={id} token={token} /> : null}
          {id && activeTab === 'grimoire' ? (
            <CharacterGrimoireTab characterId={id} token={token} user={user} sessionView />
          ) : null}
          {id && activeTab === 'traits' ? <CharacterFeaturesTab characterId={id} token={token} sessionView /> : null}
          {id && activeTab === 'notes' ? <CharacterNotesTab characterId={id} token={token} /> : null}
          {id && activeTab === 'pets' ? <CharacterPetsTab characterId={id} token={token} /> : null}
        </div>

        <div className="session-subtabs-dock open" style={{ marginTop: '0.75rem' }}>
          <button
            className={`tab-btn ${activeTab === 'characteristic' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('characteristic')}
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
            className={`tab-btn ${activeTab === 'traits' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('traits')}
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
      </Card>
    </div>
  )
}

