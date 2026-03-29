import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet } from '../../../shared/api/client'
import { CharacterCharacteristicsTab } from '../../characters/components/CharacterCharacteristicsTab'
import { CharacterInventoryTab } from '../../characters/components/CharacterInventoryTab'
import { CharacterGrimoireTab } from '../../characters/components/CharacterGrimoireTab'
import { CharacterFeaturesTab } from '../../characters/components/CharacterFeaturesTab'
import { useHeader } from '../../../app/hooks/useHeader'

type JoinedSession = {
  id: number
  title: string
  campaign_name?: string | null
  session_date?: string | null
}

type SessionAttendance = {
  id: number
  character_id: number
  character_name?: string | null
  character_user_id?: number | null
}

type SessionDetail = {
  id: number
  title?: string | null
  campaign_name?: string | null
  session_date?: string | null
  gm_id?: number | null
  attendance?: SessionAttendance[]
}

export function LiveSessionPage() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { setSessionInfo } = useHeader()
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>('')
  const [mainTab, setMainTab] = useState<'character'>('character')
  const [characterSubTab, setCharacterSubTab] = useState<'characteristic' | 'inventory' | 'grimoire' | 'traits'>(
    'characteristic',
  )

  const raw = localStorage.getItem('joined_session')
  let session: JoinedSession | null = null
  if (raw) {
    try {
      session = JSON.parse(raw) as JoinedSession
    } catch {
      session = null
    }
  }

  useEffect(() => {
    async function loadSessionDetail() {
      if (!session || !token || !user) return
      setLoading(true)
      try {
        const response = await apiGet<{ success: boolean; session: SessionDetail }>(`/api/sessions/${session.id}`, token)
        const detail = response.session
        setSessionDetail(detail)
        setSessionInfo({
          title: detail.title ?? session.title,
          campaignName: detail.campaign_name ?? session.campaign_name ?? null,
          sessionDate: detail.session_date ?? session.session_date ?? null,
        })
        const attendance = Array.isArray(detail.attendance) ? detail.attendance : []
        const isOwner = user.role === 'admin' || user.role === 'gm' || detail.gm_id === user.id
        const mine = attendance.filter((entry) => entry.character_user_id === user.id)
        const initial = isOwner ? attendance[0] : mine[0]
        if (initial) {
          setSelectedCharacterId(String(initial.character_id))
          setSelectedCharacterName(initial.character_name ?? '')
        } else {
          setSelectedCharacterId('')
          setSelectedCharacterName('')
        }
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement de la session',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    void loadSessionDetail()
    return () => setSessionInfo(null)
  }, [session?.id, token, user?.id, user, setSessionInfo, showSnackbar])

  const isSessionOwner = useMemo(() => {
    if (!user) return false
    if (user.role === 'admin' || user.role === 'gm') return true
    return sessionDetail?.gm_id === user.id
  }, [sessionDetail?.gm_id, user])

  const accessibleCharacters = useMemo(() => {
    if (!user || !sessionDetail?.attendance) return []
    return isSessionOwner
      ? sessionDetail.attendance
      : sessionDetail.attendance.filter((entry) => entry.character_user_id === user.id)
  }, [isSessionOwner, sessionDetail?.attendance, user?.id])

  return (
    <div className="session-live-page">
      <Card title="">
        {!session ? <p>Aucune session rejointe.</p> : null}

        {session ? (
          <>
            {loading ? <p>Chargement…</p> : null}

          {!loading && accessibleCharacters.length === 0 ? (
            <p>Ton compte n&apos;a pas encore de personnage associé à cette session.</p>
          ) : null}

          {!loading && accessibleCharacters.length > 0 ? (
            <>
              <div className="tabs-row session-tabs-primary session-tabs-primary-sticky">
                <button
                  className={`tab-btn ${mainTab === 'character' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setMainTab('character')}
                >
                  Character
                </button>
              </div>

              {accessibleCharacters.length > 1 ? (
                <div className="login-form" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="session-character-select">Personnage</label>
                  <select
                    id="session-character-select"
                    value={selectedCharacterId}
                    onChange={(event) => {
                      const value = event.target.value
                      const found = accessibleCharacters.find((entry) => String(entry.character_id) === value)
                      setSelectedCharacterId(value)
                      setSelectedCharacterName(found?.character_name ?? '')
                    }}
                  >
                    {accessibleCharacters.map((entry) => (
                      <option key={entry.id} value={entry.character_id}>
                        {entry.character_name ?? `Personnage #${entry.character_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {selectedCharacterId ? (
                <div className="session-live-content" style={{ marginTop: '0.75rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>{selectedCharacterName || 'Mon personnage'}</h4>
                  {characterSubTab === 'characteristic' ? (
                    <CharacterCharacteristicsTab
                      characterId={selectedCharacterId}
                      token={token}
                      sessionView
                      sessionId={sessionDetail?.id != null ? String(sessionDetail.id) : undefined}
                      onNameLoaded={(name) => setSelectedCharacterName(name)}
                    />
                  ) : null}
                  {characterSubTab === 'inventory' ? <CharacterInventoryTab characterId={selectedCharacterId} token={token} /> : null}
                  {characterSubTab === 'grimoire' ? <CharacterGrimoireTab characterId={selectedCharacterId} token={token} user={user} /> : null}
                  {characterSubTab === 'traits' ? <CharacterFeaturesTab characterId={selectedCharacterId} token={token} /> : null}
                </div>
              ) : null}

              {mainTab === 'character' ? (
                <div className="session-subtabs-dock open">
                  <button
                    className={`tab-btn ${characterSubTab === 'characteristic' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('characteristic')
                    }}
                  >
                    Characteristic
                  </button>
                  <button
                    className={`tab-btn ${characterSubTab === 'inventory' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('inventory')
                    }}
                  >
                    Inventory
                  </button>
                  <button
                    className={`tab-btn ${characterSubTab === 'grimoire' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('grimoire')
                    }}
                  >
                    Grimoire
                  </button>
                  <button
                    className={`tab-btn ${characterSubTab === 'traits' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('traits')
                    }}
                  >
                    Traits
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-secondary" type="button" onClick={() => navigate('/sessions')}>
                Retour aux sessions
              </button>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  )
}

