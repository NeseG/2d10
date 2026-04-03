import React, { useEffect, useRef, useState } from 'react'
import { Activity, Backpack, BookMarked, Clover, ScrollText } from 'lucide-react'
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

type CharacterTab = 'characteristics' | 'inventory' | 'grimoire' | 'features' | 'notes'

export function CharacterEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { showSnackbar } = useSnackbar()

  const [activeTab, setActiveTab] = useState<CharacterTab>('characteristics')
  /** Refs: évite le state async au tap — sinon touchend lit les coords du geste précédent et change d’onglet / casse le focus mobile. */
  const touchStartXRef = useRef<number | null>(null)
  const touchEndXRef = useRef<number | null>(null)

  const [characterName, setCharacterName] = useState('')
  const [characterAvatarUrl, setCharacterAvatarUrl] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const tabsOrder: CharacterTab[] = ['characteristics', 'inventory', 'grimoire', 'features', 'notes']

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

  function isInteractiveTouchTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Element)) return false
    return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (isInteractiveTouchTarget(event.target)) {
      touchStartXRef.current = null
      touchEndXRef.current = null
      return
    }
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null
    touchEndXRef.current = null
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartXRef.current == null) return
    touchEndXRef.current = event.changedTouches[0]?.clientX ?? null
  }

  function handleTouchCancel() {
    touchStartXRef.current = null
    touchEndXRef.current = null
  }

  function handleTouchEnd() {
    const start = touchStartXRef.current
    const end = touchEndXRef.current
    touchStartXRef.current = null
    touchEndXRef.current = null
    if (start == null || end == null) return
    const deltaX = start - end
    const threshold = 50
    if (Math.abs(deltaX) < threshold) return

    const currentIndex = tabsOrder.indexOf(activeTab)
    if (currentIndex < 0) return

    if (deltaX > 0 && currentIndex < tabsOrder.length - 1) setActiveTab(tabsOrder[currentIndex + 1])
    else if (deltaX < 0 && currentIndex > 0) setActiveTab(tabsOrder[currentIndex - 1])
  }

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
          <h3 className="character-page-title">Edition du personnage {characterName.trim() || (id ? `#${id}` : '')}</h3>
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
        </div>

        <div
          className="tab-panel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
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
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/characters')}>
            Retour
          </button>
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

