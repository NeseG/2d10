import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

function SessionLiveCharacterHeading(props: { characterId: string; label: string }) {
  const { characterId, label } = props
  return (
    <div className="session-live-character-title-row">
      <h4 className="session-live-character-panel-title">{label}</h4>
      <Link
        to={`/characters/${characterId}/edit`}
        className="session-live-character-edit-link"
        title="Éditer le personnage"
        aria-label="Éditer le personnage"
      >
        Éditer
      </Link>
    </div>
  )
}

export function LiveSessionPage() {
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

  /** Admin ou MJ assigné à cette session : bandeau horizontal de fiches (plusieurs « colonnes » mobile). */
  const useGmCharacterStrip = useMemo(() => {
    if (!user || !sessionDetail || accessibleCharacters.length < 2) return false
    return user.role === 'admin' || sessionDetail.gm_id === user.id
  }, [user, sessionDetail, accessibleCharacters.length])

  const [characterDisplayNames, setCharacterDisplayNames] = useState<Record<string, string>>({})

  useEffect(() => {
    setCharacterDisplayNames((prev) => {
      const next: Record<string, string> = { ...prev }
      const allowed = new Set<string>()
      for (const e of accessibleCharacters) {
        const id = String(e.character_id)
        allowed.add(id)
        if (next[id] === undefined) next[id] = e.character_name ?? ''
      }
      for (const k of Object.keys(next)) {
        if (!allowed.has(k)) delete next[k]
      }
      return next
    })
  }, [accessibleCharacters])

  /** Dock fixe en bas : marge scrollable pour ne pas masquer le contenu sous la barre d’onglets. */
  const showBottomCharacterDock =
    Boolean(session) && !loading && accessibleCharacters.length > 0 && mainTab === 'character'

  return (
    <div
      className={`session-live-page${showBottomCharacterDock ? ' session-live-page--dock-offset' : ''}${useGmCharacterStrip ? ' session-live-page--gm-strip' : ''}`}
    >
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

              {!useGmCharacterStrip && accessibleCharacters.length > 1 ? (
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

              {useGmCharacterStrip ? (
                <div className="session-live-characters-strip">
                  {accessibleCharacters.map((entry) => {
                    const cid = String(entry.character_id)
                    const title =
                      characterDisplayNames[cid]?.trim() ||
                      entry.character_name?.trim() ||
                      `Personnage #${entry.character_id}`
                    return (
                      <div key={entry.id} className="session-live-character-panel">
                        <div className="session-live-content session-live-character-panel-inner">
                          <SessionLiveCharacterHeading characterId={cid} label={title} />
                          {characterSubTab === 'characteristic' ? (
                            <CharacterCharacteristicsTab
                              characterId={cid}
                              token={token}
                              sessionView
                              sessionId={sessionDetail?.id != null ? String(sessionDetail.id) : undefined}
                              onNameLoaded={(name) =>
                                setCharacterDisplayNames((p) => ({ ...p, [cid]: name }))
                              }
                            />
                          ) : null}
                          {characterSubTab === 'inventory' ? (
                            <CharacterInventoryTab characterId={cid} token={token} />
                          ) : null}
                          {characterSubTab === 'grimoire' ? (
                            <CharacterGrimoireTab
                              characterId={cid}
                              token={token}
                              user={user}
                              sessionView
                              sessionId={
                                sessionDetail?.id != null ? String(sessionDetail.id) : session ? String(session.id) : undefined
                              }
                            />
                          ) : null}
                          {characterSubTab === 'traits' ? <CharacterFeaturesTab characterId={cid} token={token} /> : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : selectedCharacterId ? (
                <div className="session-live-content" style={{ marginTop: '0.75rem' }}>
                  <SessionLiveCharacterHeading
                    characterId={selectedCharacterId}
                    label={selectedCharacterName || 'Mon personnage'}
                  />
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
                  {characterSubTab === 'grimoire' ? (
                    <CharacterGrimoireTab
                      characterId={selectedCharacterId}
                      token={token}
                      user={user}
                      sessionView
                      sessionId={sessionDetail?.id != null ? String(sessionDetail.id) : session ? String(session.id) : undefined}
                    />
                  ) : null}
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
          </>
        ) : null}
      </Card>
    </div>
  )
}

